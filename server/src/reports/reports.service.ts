import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Report } from '../models/report.model';
import { Task } from '../models/task.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { TaskNature } from '../models/task-nature.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { User } from '../models/user.model';
import { Demand } from '../models/demand.model';
import { DemandItem } from '../models/demand-item.model';
import { Ticket } from '../models/ticket.model';
import { BusinessExpense } from '../models/business-expense.model';
import { BusinessExpenseType } from '../models/business-expense-type.model';
import { Lead } from '../models/lead.model';
import { CommercialGoal } from '../models/commercial-goal.model';
import { Invoice } from '../models/invoice.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { Account } from '../models/account.model';
import { JournalEntry } from '../models/journal-entry.model';
import { Budget } from '../models/budget.model';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { ReportsService as AccountingReportsService } from '../accounting/reports.service';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    private readonly ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    private readonly ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    constructor(
        @InjectModel(Report) private reportModel: typeof Report,
        @InjectModel(Task) private taskModel: typeof Task,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        @InjectModel(Department) private departmentModel: typeof Department,
        @InjectModel(Demand) private demandModel: typeof Demand,
        @InjectModel(Ticket) private ticketModel: typeof Ticket,
        @InjectModel(BusinessExpense) private businessExpenseModel: typeof BusinessExpense,
        @InjectModel(Project) private projectModel: typeof Project,
        @InjectModel(Lead) private leadModel: typeof Lead,
        @InjectModel(CommercialGoal) private commercialGoalModel: typeof CommercialGoal,
        @InjectModel(Invoice) private invoiceModel: typeof Invoice,
        @InjectModel(FiscalYear) private fiscalYearModel: typeof FiscalYear,
        @InjectModel(Account) private accountModel: typeof Account,
        @InjectModel(JournalEntry) private journalEntryModel: typeof JournalEntry,
        @InjectModel(Budget) private budgetModel: typeof Budget,
        @InjectModel(TaxDeclaration) private taxDeclarationModel: typeof TaxDeclaration,
        private accountingReportsService: AccountingReportsService,
    ) {}

    /* ── Lock check ──────────────────────────────────────── */

    async getLockStatus(): Promise<{ locked: boolean; model?: string }> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const locked = await this.reportModel.findOne({
            where: { status: 'GENERATING', createdAt: { [Op.gte]: tenMinutesAgo } },
        });
        return { locked: !!locked, model: this.ollamaModel };
    }

    /* ── Date helpers ────────────────────────────────────── */

    private fmtDate(d: Date): string {
        return d.toISOString().split('T')[0];
    }

    /** Compute the period immediately preceding the given dates (same duration) */
    private computePreviousPeriod(startDate: string, endDate: string): { startDate: string; endDate: string } {
        const start = new Date(startDate + 'T00:00:00Z');
        const end = new Date(endDate + 'T00:00:00Z');
        const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        const prevEnd = new Date(start.getTime() - 24 * 3600 * 1000);
        const prevStart = new Date(prevEnd.getTime() - (durationDays - 1) * 24 * 3600 * 1000);
        return { startDate: this.fmtDate(prevStart), endDate: this.fmtDate(prevEnd) };
    }

    /* ── Task stats helper ───────────────────────────────── */

    private computeSummary(tasks: Task[]) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.getDataValue('state') === 'COMPLETED').length;
        const reviewed = tasks.filter(t => t.getDataValue('state') === 'REVIEWED').length;
        const inProgress = tasks.filter(t => t.getDataValue('state') === 'IN_PROGRESS').length;
        const blocked = tasks.filter(t => t.getDataValue('state') === 'BLOCKED').length;
        const created = tasks.filter(t => t.getDataValue('state') === 'CREATED').length;
        const assigned = tasks.filter(t => t.getDataValue('state') === 'ASSIGNED').length;
        const completionRate = total > 0 ? Math.round(((completed + reviewed) / total) * 100) : 0;
        return { total, completed, reviewed, inProgress, blocked, created, assigned, completionRate };
    }

    private computeSummaryFromMapped(tasks: any[]) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.state === 'COMPLETED').length;
        const reviewed = tasks.filter(t => t.state === 'REVIEWED').length;
        const inProgress = tasks.filter(t => t.state === 'IN_PROGRESS').length;
        const blocked = tasks.filter(t => t.state === 'BLOCKED').length;
        const created = tasks.filter(t => t.state === 'CREATED').length;
        const assigned = tasks.filter(t => t.state === 'ASSIGNED').length;
        const completionRate = total > 0 ? Math.round(((completed + reviewed) / total) * 100) : 0;
        return { total, completed, reviewed, inProgress, blocked, created, assigned, completionRate };
    }

    private mapTask(task: Task) {
        return {
            id: task.getDataValue('id'),
            title: task.getDataValue('title'),
            state: task.getDataValue('state'),
            difficulty: task.getDataValue('difficulty'),
            dueDate: task.getDataValue('dueDate'),
            startDate: task.getDataValue('startDate'),
            completedAt: task.getDataValue('completedAt'),
            urgent: task.getDataValue('urgent'),
            important: task.getDataValue('important'),
            nature: (task as any).nature?.name || null,
            natureColor: (task as any).nature?.color || null,
            project: (task as any).project?.name || null,
        };
    }

    private async fetchTasksForEmployee(employeeId: string, startDate: string, endDate: string): Promise<Task[]> {
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');
        return this.taskModel.findAll({
            where: {
                assignedToId: employeeId,
                [Op.or]: [
                    { dueDate: { [Op.between]: [startDate, endDate] } },
                    { createdAt: { [Op.between]: [start, end] } },
                ],
            },
            include: [
                { model: TaskNature, as: 'nature' },
                { model: Project },
            ],
            order: [['dueDate', 'ASC']],
        });
    }

    /* ── Projects data ───────────────────────────────────── */

    private async fetchProjectsForEmployee(employeeId: string): Promise<any[]> {
        const projects = await this.projectModel.findAll({
            include: [
                {
                    model: Employee,
                    as: 'members',
                    where: { id: employeeId },
                    required: true,
                    attributes: [],
                    through: { attributes: [] },
                },
                { model: Task, attributes: ['state'] },
            ],
        });

        return projects.map(p => {
            const tasks: any[] = (p as any).tasks || [];
            const total = tasks.length;
            const done = tasks.filter(t => ['COMPLETED', 'REVIEWED'].includes(t.state)).length;
            return {
                id: p.id,
                name: p.getDataValue('name'),
                completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
                totalTasks: total,
                completedTasks: done,
                budget: p.getDataValue('budget') || null,
                revenue: p.getDataValue('revenue') || null,
                endDate: p.getDataValue('endDate') || null,
            };
        });
    }

    private async fetchProjectsForDepartment(departmentId: string): Promise<any[]> {
        const projects = await this.projectModel.findAll({
            where: { departmentId },
            include: [{ model: Task, attributes: ['state'] }],
        });

        return projects.map(p => {
            const tasks: any[] = (p as any).tasks || [];
            const total = tasks.length;
            const done = tasks.filter(t => ['COMPLETED', 'REVIEWED'].includes(t.state)).length;
            return {
                id: p.id,
                name: p.getDataValue('name'),
                completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
                totalTasks: total,
                completedTasks: done,
                budget: p.getDataValue('budget') || null,
                revenue: p.getDataValue('revenue') || null,
                endDate: p.getDataValue('endDate') || null,
            };
        });
    }

    /* ── Leads data ──────────────────────────────────────── */

    private async fetchLeadsData(employeeId: string | null, startDate: string, endDate: string, forAll = false): Promise<any> {
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');

        const where: any = { createdAt: { [Op.between]: [start, end] } };
        if (!forAll && employeeId) where.assignedToId = employeeId;

        const leadsThisPeriod = await this.leadModel.findAll({ where });

        const allLeads: any[] = forAll
            ? await this.leadModel.findAll()
            : (employeeId ? await this.leadModel.findAll({ where: { assignedToId: employeeId } }) : []);

        const wonPeriod = leadsThisPeriod.filter((l: any) => l.getDataValue('leadStatus') === 'GAGNE').length;
        const lostPeriod = leadsThisPeriod.filter((l: any) => l.getDataValue('leadStatus') === 'PERDU').length;
        const newPeriod = leadsThisPeriod.length;

        const totalActive = allLeads.filter((l: any) => !['GAGNE', 'PERDU'].includes(l.getDataValue('leadStatus'))).length;
        const potentialRevenue = allLeads
            .filter((l: any) => !['GAGNE', 'PERDU'].includes(l.getDataValue('leadStatus')))
            .reduce((sum: number, l: any) => sum + Number(l.getDataValue('potentialRevenue') || 0), 0);
        const wonRevenuePeriod = leadsThisPeriod
            .filter((l: any) => l.getDataValue('leadStatus') === 'GAGNE')
            .reduce((sum: number, l: any) => sum + Number(l.getDataValue('potentialRevenue') || 0), 0);

        return {
            newThisPeriod: newPeriod,
            won: wonPeriod,
            lost: lostPeriod,
            totalActive,
            potentialRevenue,
            wonRevenuePeriod,
        };
    }

    /* ── Commercial goals ────────────────────────────────── */

    private async fetchCommercialGoals(employeeId: string | null, startDate: string, endDate: string): Promise<any[]> {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const goals: any[] = [];

        // Get unique year-months in the period
        const months = new Set<string>();
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endMonth) {
            months.add(`${cur.getFullYear()}-${cur.getMonth() + 1}`);
            cur.setMonth(cur.getMonth() + 1);
        }

        for (const ym of months) {
            const [year, month] = ym.split('-').map(Number);
            const where: any = { year, month };
            if (employeeId) where.employeeId = employeeId;
            const found = await this.commercialGoalModel.findAll({ where, include: [{ model: Employee }] });
            goals.push(...found.map(g => ({
                year: g.getDataValue('year'),
                month: g.getDataValue('month'),
                targetAmount: Number(g.getDataValue('targetAmount') || 0),
                employee: (g as any).employee
                    ? `${(g as any).employee.firstName} ${(g as any).employee.lastName}`
                    : null,
            })));
        }

        return goals;
    }

    /* ── Invoice data ────────────────────────────────────── */

    private async fetchInvoicesData(startDate: string, endDate: string, departmentId?: string): Promise<any> {
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');
        const where: any = { createdAt: { [Op.between]: [start, end] } };
        if (departmentId) where.departmentId = departmentId;

        const invoices = await this.invoiceModel.findAll({ where });
        const total = invoices.length;
        const paid = invoices.filter((i: any) => i.getDataValue('status') === 'PAID').length;
        const sent = invoices.filter((i: any) => i.getDataValue('status') === 'SENT').length;
        const pending = invoices.filter((i: any) => ['CREATED', 'SENT'].includes(i.getDataValue('status'))).length;

        return { total, paid, sent, pending };
    }

    /* ── Fetch ALL context data ───────────────────────────── */

    private async fetchContextData(dto: any, userRole: string, userDepartmentId?: string, prevPeriod?: { startDate: string; endDate: string }) {
        const { startDate, endDate, type } = dto;
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');

        let demands: Demand[] = [];
        let tickets: Ticket[] = [];
        let businessExpenses: BusinessExpense[] = [];
        let projects: any[] = [];
        let leads: any = null;
        let goals: any[] = [];
        let invoices: any = null;
        let previousPeriodTasks: Task[] = [];

        if (type === 'PERSONAL') {
            const employeeId = dto.targetEmployeeId;
            const employee = await this.employeeModel.findByPk(employeeId);
            if (!employee) return { demands, tickets, businessExpenses, projects, leads, goals, invoices };

            const userId = employee.getDataValue('userId');

            demands = await this.demandModel.findAll({
                where: { employeeId, createdAt: { [Op.between]: [start, end] } },
                include: [{ model: DemandItem }],
                order: [['createdAt', 'DESC']],
            });

            tickets = await this.ticketModel.findAll({
                where: { createdById: userId, createdAt: { [Op.between]: [start, end] } },
                order: [['createdAt', 'DESC']],
            });

            businessExpenses = await this.businessExpenseModel.findAll({
                where: { employeeId, date: { [Op.between]: [startDate, endDate] } },
                include: [{ model: BusinessExpenseType }],
                order: [['date', 'DESC']],
            });

            projects = await this.fetchProjectsForEmployee(employeeId);

            // Leads and goals for COMMERCIAL role employees
            if (['COMMERCIAL', 'MANAGER'].includes(userRole)) {
                leads = await this.fetchLeadsData(employeeId, startDate, endDate);
                goals = await this.fetchCommercialGoals(employeeId, startDate, endDate);
            }

            // Previous period tasks
            if (prevPeriod) {
                previousPeriodTasks = await this.fetchTasksForEmployee(employeeId, prevPeriod.startDate, prevPeriod.endDate);
            }

        } else if (type === 'DEPARTMENT') {
            const deptId = dto.targetDepartmentId || userDepartmentId;
            const employees = await this.employeeModel.findAll({ where: { departmentId: deptId, dismissed: false } });
            const empIds = employees.map(e => e.id);
            const userIds = employees.map(e => e.getDataValue('userId')).filter(Boolean);

            demands = await this.demandModel.findAll({
                where: { departmentId: deptId, createdAt: { [Op.between]: [start, end] } },
                include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }, { model: DemandItem }],
                order: [['createdAt', 'DESC']],
            });

            tickets = await this.ticketModel.findAll({
                where: { targetDepartmentId: deptId, createdAt: { [Op.between]: [start, end] } },
                order: [['createdAt', 'DESC']],
            });

            if (empIds.length > 0) {
                businessExpenses = await this.businessExpenseModel.findAll({
                    where: { employeeId: { [Op.in]: empIds }, date: { [Op.between]: [startDate, endDate] } },
                    include: [{ model: BusinessExpenseType }, { model: Employee, attributes: ['id', 'firstName', 'lastName'] }],
                    order: [['date', 'DESC']],
                });
            }

            projects = await this.fetchProjectsForDepartment(deptId);

            if (['MANAGER', 'HEAD_OF_DEPARTMENT'].includes(userRole)) {
                invoices = await this.fetchInvoicesData(startDate, endDate, deptId);
                leads = await this.fetchLeadsData(null, startDate, endDate, userRole === 'MANAGER');
                goals = await this.fetchCommercialGoals(null, startDate, endDate);
            }
        }

        return { demands, tickets, businessExpenses, projects, leads, goals, invoices, previousPeriodTasks };
    }

    /* ── Build Ollama prompt ─────────────────────────────── */

    private buildPrompt(dto: any, reportData: any, contextData: any, language: string): string {
        const lang = language === 'fr' ? 'fr' : 'en';
        const isFr = lang === 'fr';

        // Helper to format numbers without slashes
        const formatNumber = (n: number | undefined | null): string => {
            if (n === undefined || n === null || isNaN(n)) return '0';
            return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };

        const periodLabel = {
            DAY: isFr ? 'journalier' : 'daily',
            WEEK: isFr ? 'hebdomadaire' : 'weekly',
            MONTH: isFr ? 'mensuel' : 'monthly',
            CUSTOM: isFr ? 'personnalise' : 'custom',
        }[dto.period] || dto.period;

        let subjectInfo = '';
        if (reportData.employee) {
            const emp = reportData.employee;
            subjectInfo = isFr
                ? `Employe : ${emp.firstName} ${emp.lastName}\nPoste : ${emp.position || 'N/A'}\nDepartement : ${emp.department || 'N/A'}`
                : `Employee: ${emp.firstName} ${emp.lastName}\nPosition: ${emp.position || 'N/A'}\nDepartment: ${emp.department || 'N/A'}`;
        } else if (reportData.department) {
            const empCount = reportData.employees?.length || 0;
            subjectInfo = isFr
                ? `Departement : ${reportData.department.name}\nNombre d'employes actifs : ${empCount}`
                : `Department: ${reportData.department.name}\nActive employees: ${empCount}`;
        }

        // Current period task summary
        const s = reportData.summary;
        const taskSection = isFr
            ? `TACHES PERIODE ACTUELLE (${dto.startDate} au ${dto.endDate}) :
- Total : ${s.total}
- Terminees : ${s.completed + s.reviewed} (${s.completionRate}%)
- En cours : ${s.inProgress}
- Bloquees : ${s.blocked}
- Non demarrees : ${s.created + s.assigned}`
            : `CURRENT PERIOD TASKS (${dto.startDate} to ${dto.endDate}):
- Total: ${s.total}
- Completed: ${s.completed + s.reviewed} (${s.completionRate}%)
- In progress: ${s.inProgress}
- Blocked: ${s.blocked}
- Not started: ${s.created + s.assigned}`;

        // Previous period comparison
        let evolutionSection = '';
        if (reportData.previousPeriodSummary) {
            const ps = reportData.previousPeriodSummary;
            const pp = reportData.previousPeriod;
            const rateDelta = s.completionRate - ps.completionRate;
            const totalDelta = s.total - ps.total;
            evolutionSection = isFr
                ? `\nTACHES PERIODE PRECEDENTE (${pp.startDate} au ${pp.endDate}) :
- Total : ${ps.total}
- Terminees : ${ps.completed + ps.reviewed} (${ps.completionRate}%)
- En cours : ${ps.inProgress}
- Bloquees : ${ps.blocked}

EVOLUTION PAR RAPPORT A LA PERIODE PRECEDENTE :
- Variation du total : ${totalDelta >= 0 ? '+' : ''}${totalDelta} taches
- Variation du taux de completion : ${rateDelta >= 0 ? '+' : ''}${rateDelta} points de pourcentage
- Taches bloquees : ${s.blocked === 0 && ps.blocked > 0 ? 'aucune bloquee ce periode (amelioration)' : s.blocked > ps.blocked ? 'augmentation des blocages' : s.blocked < ps.blocked ? 'reduction des blocages' : 'stable'}`
                : `\nPREVIOUS PERIOD TASKS (${pp.startDate} to ${pp.endDate}):
- Total: ${ps.total}
- Completed: ${ps.completed + ps.reviewed} (${ps.completionRate}%)
- In progress: ${ps.inProgress}
- Blocked: ${ps.blocked}

EVOLUTION VS PREVIOUS PERIOD:
- Total tasks change: ${totalDelta >= 0 ? '+' : ''}${totalDelta} tasks
- Completion rate change: ${rateDelta >= 0 ? '+' : ''}${rateDelta} percentage points
- Blocked tasks: ${s.blocked === 0 && ps.blocked > 0 ? 'none blocked this period (improvement)' : s.blocked > ps.blocked ? 'increase in blockages' : s.blocked < ps.blocked ? 'reduction in blockages' : 'stable'}`;
        }

        // Task details (top 15)
        const tasks = (reportData.tasks || (reportData.employees || []).flatMap((e: any) => e.tasks)).slice(0, 15);
        const taskDetails = tasks.map((t: any, i: number) =>
            `${i + 1}. "${t.title}" [${t.state}]${t.project ? ` — Projet: ${t.project}` : ''}${t.dueDate ? ` — Echeance: ${t.dueDate}` : ''}`
        ).join('\n');

        // Projects section
        let projectsSection = '';
        if (reportData.projects && reportData.projects.length > 0) {
            const pLines = reportData.projects.map((p: any) =>
                `- ${p.name}: ${p.completedTasks}/${p.totalTasks} taches (${p.completionRate}%)${p.endDate ? ` — Fin: ${p.endDate}` : ''}`
            ).join('\n');
            projectsSection = isFr
                ? `\nPROJETS EN COURS :\n${pLines}`
                : `\nACTIVE PROJECTS:\n${pLines}`;
        }

        // Demands summary
        const { demands, tickets, businessExpenses, leads, goals, invoices } = contextData;
        const demandTotal = demands.length;
        const demandPending = demands.filter((d: any) => d.getDataValue('status') === 'PENDING').length;
        const demandValidated = demands.filter((d: any) => d.getDataValue('status') === 'VALIDATED').length;
        const demandRejected = demands.filter((d: any) => d.getDataValue('status') === 'REJECTED').length;
        const demandTotalAmount = demands.reduce((sum: number, d: any) => sum + Number(d.getDataValue('totalPrice') || 0), 0);

        const demandSection = isFr
            ? `DEMANDES D'ACHAT :
- Total : ${demandTotal} | En attente : ${demandPending} | Validees : ${demandValidated} | Rejetees : ${demandRejected}
- Montant total : ${formatNumber(demandTotalAmount)} FCFA`
            : `PURCHASE DEMANDS:
- Total: ${demandTotal} | Pending: ${demandPending} | Validated: ${demandValidated} | Rejected: ${demandRejected}
- Total amount: ${formatNumber(demandTotalAmount)} FCFA`;

        // Tickets summary
        const ticketOpen = tickets.filter((t: any) => ['OPEN', 'ACCEPTED'].includes(t.getDataValue('status'))).length;
        const ticketInProgress = tickets.filter((t: any) => t.getDataValue('status') === 'IN_PROGRESS').length;
        const ticketClosed = tickets.filter((t: any) => ['COMPLETED', 'CLOSED'].includes(t.getDataValue('status'))).length;

        const ticketSection = isFr
            ? `TICKETS SUPPORT :
- Total : ${tickets.length} | Ouverts : ${ticketOpen} | En cours : ${ticketInProgress} | Resolus : ${ticketClosed}`
            : `SUPPORT TICKETS:
- Total: ${tickets.length} | Open: ${ticketOpen} | In progress: ${ticketInProgress} | Resolved: ${ticketClosed}`;

        // Business expenses
        const bePending = businessExpenses.filter((e: any) => e.getDataValue('status') === 'PENDING').length;
        const beValidated = businessExpenses.filter((e: any) => e.getDataValue('status') === 'VALIDATED').length;
        const beTotalAmount = businessExpenses.reduce((sum: number, e: any) => sum + Number(e.getDataValue('amount') || 0), 0);

        const expenseSection = isFr
            ? `FRAIS DE VIE :
- Total : ${businessExpenses.length} | En attente : ${bePending} | Valides : ${beValidated}
- Montant total : ${formatNumber(beTotalAmount)} FCFA`
            : `BUSINESS EXPENSES:
- Total: ${businessExpenses.length} | Pending: ${bePending} | Validated: ${beValidated}
- Total amount: ${formatNumber(beTotalAmount)} FCFA`;

        // Leads section (COMMERCIAL/MANAGER)
        let leadsSection = '';
        if (leads) {
            const totalGoal = goals.reduce((s: number, g: any) => s + g.targetAmount, 0);
            leadsSection = isFr
                ? `\nPIPELINE COMMERCIAL :
- Nouveaux leads cette periode : ${leads.newThisPeriod}
- Leads gagnes : ${leads.won} | Perdus : ${leads.lost}
- Leads actifs en cours : ${leads.totalActive}
- Chiffre d'affaires potentiel (pipeline actif) : ${formatNumber(leads.potentialRevenue)} FCFA
- Chiffre d'affaires gagne cette periode : ${formatNumber(leads.wonRevenuePeriod)} FCFA${totalGoal > 0 ? `\n- Objectif commercial du mois : ${formatNumber(totalGoal)} FCFA` : ''}`
                : `\nCOMMERCIAL PIPELINE:
- New leads this period: ${leads.newThisPeriod}
- Won leads: ${leads.won} | Lost: ${leads.lost}
- Active leads in pipeline: ${leads.totalActive}
- Potential revenue (active pipeline): ${formatNumber(leads.potentialRevenue)} FCFA
- Revenue won this period: ${formatNumber(leads.wonRevenuePeriod)} FCFA${totalGoal > 0 ? `\n- Monthly commercial target: ${formatNumber(totalGoal)} FCFA` : ''}`;
        }

        // Invoices section (MANAGER/HOD)
        let invoicesSection = '';
        if (invoices) {
            invoicesSection = isFr
                ? `\nFACTURATION :
- Factures emises : ${invoices.total} | Payees : ${invoices.paid} | Envoyees : ${invoices.sent} | En attente : ${invoices.pending}`
                : `\nINVOICING:
- Invoices issued: ${invoices.total} | Paid: ${invoices.paid} | Sent: ${invoices.sent} | Pending: ${invoices.pending}`;
        }

        // Per-employee performance (department report)
        let perEmployeeSection = '';
        if (reportData.employees && reportData.employees.length > 0) {
            const empLines = reportData.employees.map((e: any) => {
                const es = e.summary;
                const prevEs = e.previousPeriodSummary;
                const delta = prevEs ? ` (${es.completionRate >= prevEs.completionRate ? '+' : ''}${es.completionRate - prevEs.completionRate}pp vs periode precedente)` : '';
                return `- ${e.employee.firstName} ${e.employee.lastName}${e.employee.position ? ` (${e.employee.position})` : ''}: ${es.total} taches, ${es.completed + es.reviewed} terminees (${es.completionRate}%)${es.blocked > 0 ? `, ${es.blocked} bloquee(s)` : ''}${delta}`;
            });
            perEmployeeSection = isFr
                ? `\nPERFORMANCE PAR EMPLOYE :\n${empLines.join('\n')}`
                : `\nPER-EMPLOYEE PERFORMANCE:\n${empLines.join('\n')}`;
        }

        const headingInstruction = isFr
            ? `Structure du rapport (utilise ces titres EXACTEMENT en MAJUSCULES sur une ligne seule) :
RESUME EXECUTIF
ANALYSE DE LA PERFORMANCE
EVOLUTION ET TENDANCES
OBJECTIFS ET PROJETS
RECOMMANDATIONS`
            : `Report structure (use these headings EXACTLY in UPPERCASE on their own line):
EXECUTIVE SUMMARY
PERFORMANCE ANALYSIS
EVOLUTION AND TRENDS
OBJECTIVES AND PROJECTS
RECOMMENDATIONS`;

        const instruction = isFr
            ? `Tu es un redacteur professionnel de rapports d'activite pour LIFE'S SIMPLE SARL.
Redige un rapport d'activite formel EN FRANCAIS en utilisant les donnees ci-dessous.

CONTEXTE :
Type : Rapport ${periodLabel}
Periode : du ${dto.startDate} au ${dto.endDate}
${subjectInfo}

DONNEES :

${taskSection}
${evolutionSection}
${projectsSection}

${demandSection}

${ticketSection}

${expenseSection}
${leadsSection}
${invoicesSection}
${perEmployeeSection}

${tasks.length > 0 ? `Detail des principales taches :\n${taskDetails}` : ''}

INSTRUCTIONS :
${headingInstruction}
- Chaque section commence par son titre en MAJUSCULES sur une ligne seule, puis le texte du paragraphe
- Analyse l'evolution entre la periode precedente et la periode actuelle si disponible
- Commente la progression des projets et l'atteinte des objectifs
- Identifie les points forts, les risques, et formule des recommandations concretes
- Redige 1 a 2 paragraphes par section
- Style formel et professionnel, pas de listes a puces dans les paragraphes
- PAS de markdown (pas de **, ##, *, --)
- PAS d'emojis
- Chaque paragraphe separe par une ligne vide
- Environ 600 a 1000 mots au total`
            : `You are a professional activity report writer for LIFE'S SIMPLE SARL.
Write a formal activity report IN ENGLISH using the data below.

CONTEXT:
Type: ${periodLabel} report
Period: from ${dto.startDate} to ${dto.endDate}
${subjectInfo}

DATA:

${taskSection}
${evolutionSection}
${projectsSection}

${demandSection}

${ticketSection}

${expenseSection}
${leadsSection}
${invoicesSection}
${perEmployeeSection}

${tasks.length > 0 ? `Main task details:\n${taskDetails}` : ''}

INSTRUCTIONS:
${headingInstruction}
- Each section starts with its heading in UPPERCASE on its own line, then the paragraph text
- Analyze evolution between previous and current period when available
- Comment on project progress and goal achievement
- Identify strengths, risks, and provide concrete recommendations
- Write 1 to 2 paragraphs per section
- Formal, professional style — no bullet points inside paragraphs
- NO markdown (no **, ##, *, --)
- NO emojis
- Each paragraph separated by a blank line
- Approximately 600 to 1000 words total`;

        return instruction;
    }

    /* ── Call Ollama ─────────────────────────────────────── */

    private async callOllama(prompt: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300_000); // 5 minutes

        try {
            this.logger.debug(`Calling Ollama at ${this.ollamaBaseUrl} with model ${this.ollamaModel}`);

            const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.4,
                        num_predict: 4000,
                        top_p: 0.9,
                        top_k: 40,
                    },
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Ollama HTTP ${response.status}: ${errorText}`);
                throw new Error(`Ollama returned ${response.status}`);
            }

            const data: any = await response.json();
            const result = (data.response || '').trim();

            if (!result) {
                this.logger.warn('Ollama returned empty response');
                throw new Error('Empty AI response');
            }

            this.logger.debug(`Ollama success: ${result.length} chars`);
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.logger.error('Ollama timeout after 5 minutes');
                throw new Error('AI timeout');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    /* ── Background generation ───────────────────────────── */

    private async runGeneration(reportId: string, dto: any, userId: string, userRole: string, userDepartmentId?: string) {
        const report = await this.reportModel.findByPk(reportId);
        if (!report) return;

        try {
            // Handle ACCOUNTING report separately
            if (dto.type === 'ACCOUNTING') {
                const accountingData = await this.fetchAccountingData(
                    dto.fiscalYearId,
                    dto.includeBudgetAnalysis || false,
                    dto.includeTaxStatus || false
                );

                const reportData: any = {
                    fiscalYear: accountingData.fiscalYear,
                    period: { type: dto.period, startDate: dto.startDate, endDate: dto.endDate },
                    kpis: accountingData.kpis,
                    incomeStatement: accountingData.incomeStatement,
                    balanceSheet: accountingData.balanceSheet,
                    trialBalance: { summary: accountingData.trialBalance },
                    monthlySummary: accountingData.monthlySummary,
                };

                if (accountingData.budgetVariance) {
                    reportData.budgetVariance = accountingData.budgetVariance;
                }
                if (accountingData.taxStatus) {
                    reportData.taxStatus = accountingData.taxStatus;
                }

                // Call AI for narrative
                let aiContent = '';
                try {
                    this.logger.log(`Calling Ollama (${this.ollamaModel}) for accounting report ${reportId}...`);
                    const prompt = this.buildAccountingPrompt(accountingData, dto.language || 'fr');
                    aiContent = await this.callOllama(prompt);
                    this.logger.log(`Ollama complete for accounting report ${reportId} (${aiContent.length} chars)`);
                } catch (aiErr) {
                    this.logger.warn(`Ollama failed for accounting report ${reportId}: ${aiErr.message}`);
                    aiContent = dto.language === 'en'
                        ? 'AI analysis unavailable. Please review the data below.'
                        : 'Analyse IA indisponible. Veuillez consulter les données ci-dessous.';
                }

                reportData.aiContent = aiContent;
                reportData.language = dto.language || 'fr';

                await report.update({ status: 'COMPLETED', reportData });
                return;
            }

            // Handle PERSONAL/DEPARTMENT reports (existing logic)
            const prevPeriod = this.computePreviousPeriod(dto.startDate, dto.endDate);

            // Compute structured data (current + previous period)
            const reportData = await this.computeData(dto, userRole, userDepartmentId, prevPeriod);

            // Fetch context data (demands, tickets, expenses, projects, leads, goals)
            const contextData = await this.fetchContextData(dto, userRole, userDepartmentId, prevPeriod);

            // Serialize context summaries into reportData
            const { demands, tickets, businessExpenses, projects, leads, goals, invoices } = contextData;

            reportData.demandsSummary = {
                total: demands.length,
                pending: demands.filter((d: any) => d.getDataValue('status') === 'PENDING').length,
                validated: demands.filter((d: any) => d.getDataValue('status') === 'VALIDATED').length,
                rejected: demands.filter((d: any) => d.getDataValue('status') === 'REJECTED').length,
                totalAmount: demands.reduce((sum: number, d: any) => sum + Number(d.getDataValue('totalPrice') || 0), 0),
            };
            reportData.ticketsSummary = {
                total: tickets.length,
                open: tickets.filter((t: any) => ['OPEN', 'ACCEPTED'].includes(t.getDataValue('status'))).length,
                inProgress: tickets.filter((t: any) => t.getDataValue('status') === 'IN_PROGRESS').length,
                closed: tickets.filter((t: any) => ['COMPLETED', 'CLOSED'].includes(t.getDataValue('status'))).length,
            };
            reportData.businessExpensesSummary = {
                total: businessExpenses.length,
                pending: businessExpenses.filter((e: any) => e.getDataValue('status') === 'PENDING').length,
                validated: businessExpenses.filter((e: any) => e.getDataValue('status') === 'VALIDATED').length,
                totalAmount: businessExpenses.reduce((sum: number, e: any) => sum + Number(e.getDataValue('amount') || 0), 0),
            };

            if (leads) reportData.leadsSummary = leads;
            if (goals.length > 0) reportData.goalsSummary = goals;
            if (invoices) reportData.invoicesSummary = invoices;

            // Build prompt and call AI
            let aiContent = '';
            try {
                this.logger.log(`Calling Ollama (${this.ollamaModel}) for report ${reportId}...`);
                const prompt = this.buildPrompt(dto, reportData, contextData, dto.language || 'fr');
                aiContent = await this.callOllama(prompt);
                this.logger.log(`Ollama complete for report ${reportId} (${aiContent.length} chars)`);
            } catch (aiErr) {
                this.logger.warn(`Ollama failed for report ${reportId}: ${aiErr.message}`);
                aiContent = dto.language === 'en'
                    ? 'The AI-generated narrative could not be produced at this time. Please consult the statistical data below.'
                    : 'La narration generee par IA n\'a pas pu etre produite pour le moment. Veuillez consulter les donnees statistiques ci-dessous.';
            }

            reportData.aiContent = aiContent;
            reportData.language = dto.language || 'fr';

            await report.update({ status: 'COMPLETED', reportData });
        } catch (err) {
            this.logger.error(`Report generation failed for ${reportId}: ${err.message}`);
            await report.update({ status: 'FAILED' }).catch(() => {});
        }
    }

    /* ── Compute structured data ─────────────────────────── */

    private async computeData(dto: any, userRole: string, userDepartmentId?: string, prevPeriod?: { startDate: string; endDate: string }): Promise<any> {
        const { startDate, endDate, period, type } = dto;

        if (type === 'PERSONAL') {
            const employeeId = dto.targetEmployeeId;
            const employee = await this.employeeModel.findByPk(employeeId, {
                include: [{ model: Department }, { model: Position }],
            });
            if (!employee) throw new NotFoundException('Employee not found');

            const tasks = await this.fetchTasksForEmployee(employeeId, startDate, endDate);
            const projects = await this.fetchProjectsForEmployee(employeeId).catch(() => []);

            let previousPeriodSummary: any = null;
            let previousPeriod: any = null;
            if (prevPeriod) {
                const prevTasks = await this.fetchTasksForEmployee(employeeId, prevPeriod.startDate, prevPeriod.endDate);
                previousPeriodSummary = this.computeSummary(prevTasks);
                previousPeriod = prevPeriod;
            }

            return {
                employee: {
                    id: employee.id,
                    firstName: employee.getDataValue('firstName'),
                    lastName: employee.getDataValue('lastName'),
                    department: (employee as any).department?.name || '',
                    position: (employee as any).position?.title || '',
                },
                period: { type: period, startDate, endDate },
                summary: this.computeSummary(tasks),
                tasks: tasks.map(t => this.mapTask(t)),
                projects,
                previousPeriodSummary,
                previousPeriod,
            };
        }

        if (type === 'DEPARTMENT') {
            const deptId = dto.targetDepartmentId || userDepartmentId;
            const department = await this.departmentModel.findByPk(deptId);
            if (!department) throw new NotFoundException('Department not found');

            const employees = await this.employeeModel.findAll({
                where: { departmentId: deptId, dismissed: false },
                include: [{ model: Position }],
            });

            const employeeReports = await Promise.all(
                employees.map(async (emp) => {
                    const tasks = await this.fetchTasksForEmployee(emp.id, startDate, endDate);
                    let previousPeriodSummary: any = null;
                    if (prevPeriod) {
                        const prevTasks = await this.fetchTasksForEmployee(emp.id, prevPeriod.startDate, prevPeriod.endDate);
                        previousPeriodSummary = this.computeSummary(prevTasks);
                    }
                    return {
                        employee: {
                            id: emp.id,
                            firstName: emp.getDataValue('firstName'),
                            lastName: emp.getDataValue('lastName'),
                            position: (emp as any).position?.title || '',
                        },
                        summary: this.computeSummary(tasks),
                        tasks: tasks.map(t => this.mapTask(t)),
                        previousPeriodSummary,
                    };
                }),
            );

            const allMapped = employeeReports.flatMap(e => e.tasks);
            const globalSummary = this.computeSummaryFromMapped(allMapped);

            let previousPeriodSummary: any = null;
            let previousPeriod: any = null;
            if (prevPeriod) {
                const prevAllTasks = await Promise.all(
                    employees.map(emp => this.fetchTasksForEmployee(emp.id, prevPeriod.startDate, prevPeriod.endDate))
                );
                const prevFlat = prevAllTasks.flat();
                previousPeriodSummary = this.computeSummary(prevFlat);
                previousPeriod = prevPeriod;
            }

            const deptProjects = await this.fetchProjectsForDepartment(deptId).catch(() => []);

            return {
                department: { id: department.id, name: department.getDataValue('name') },
                period: { type: period, startDate, endDate },
                summary: globalSummary,
                employees: employeeReports,
                projects: deptProjects,
                previousPeriodSummary,
                previousPeriod,
            };
        }

        throw new Error('Invalid report type');
    }

    /* ── Include options ─────────────────────────────────── */

    private includeOptions() {
        return [
            { model: User, as: 'generatedBy', attributes: ['id', 'email'] },
            {
                model: Employee, as: 'targetEmployee', attributes: ['id', 'firstName', 'lastName'],
                include: [{ model: Department, attributes: ['id', 'name'] }],
            },
            { model: Department, as: 'targetDepartment', attributes: ['id', 'name'] },
        ];
    }

    /* ── Accounting Report Methods ───────────────────────── */

    private async fetchAccountingData(fiscalYearId: string, includeBudgets: boolean, includeTax: boolean) {
        const fiscalYear = await this.fiscalYearModel.findByPk(fiscalYearId);
        if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

        const [kpis, trialBalance, balanceSheet, incomeStatement, monthlySummary] = await Promise.all([
            this.accountingReportsService.dashboardKpis(fiscalYearId),
            this.accountingReportsService.trialBalance(fiscalYearId),
            this.accountingReportsService.balanceSheet(fiscalYearId),
            this.accountingReportsService.incomeStatement(fiscalYearId),
            this.accountingReportsService.monthlySummary(fiscalYearId),
        ]);

        let budgetVariance: any = null;
        if (includeBudgets) {
            const budgets = await this.budgetModel.findAll({ where: { fiscalYearId } });
            if (budgets.length > 0) {
                // Compute budget variance summary
                const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.annualTotal || 0), 0);
                const totalActual = trialBalance.accounts.reduce((sum: number, acc: any) =>
                    sum + Math.abs(Number((acc.debitBalance || 0) - (acc.creditBalance || 0))), 0
                );
                const variance = totalActual - totalBudgeted;
                const complianceRate = totalBudgeted > 0
                    ? Math.round((1 - Math.abs(variance) / totalBudgeted) * 100)
                    : 100;

                const overBudget = budgets.filter(b => {
                    const actual = trialBalance.accounts.find((a: any) => a.accountId === b.accountId);
                    const actualBalance = actual ? Math.abs(Number((actual.debitBalance || 0) - (actual.creditBalance || 0))) : 0;
                    return actual && actualBalance > Number(b.annualTotal);
                }).length;

                const underBudget = budgets.length - overBudget;

                budgetVariance = {
                    totalBudgeted,
                    totalActual,
                    variance,
                    complianceRate,
                    overBudget,
                    underBudget,
                };
            }
        }

        let taxStatus: any = null;
        if (includeTax) {
            const declarations = await this.taxDeclarationModel.findAll({ where: { fiscalYearId } });
            taxStatus = {
                total: declarations.length,
                draft: declarations.filter(d => d.status === 'DRAFT').length,
                validated: declarations.filter(d => d.status === 'VALIDATED').length,
                filed: declarations.filter(d => d.status === 'FILED').length,
                totalAmount: declarations.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0),
            };
        }

        return {
            fiscalYear: {
                id: fiscalYear.id,
                name: fiscalYear.name,
                startDate: fiscalYear.startDate,
                endDate: fiscalYear.endDate,
                status: fiscalYear.status,
            },
            kpis,
            trialBalance,
            balanceSheet,
            incomeStatement,
            monthlySummary,
            budgetVariance,
            taxStatus,
        };
    }

    private buildAccountingPrompt(data: any, language: string): string {
        const isFr = language === 'fr';

        const formatXAF = (n: number | undefined | null) => {
            if (n === undefined || n === null || isNaN(n)) return '0 XAF';
            return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' XAF';
        };

        // Group accounts by SYSCOHADA class
        const accountsByClass: any = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };
        if (data.trialBalance?.accounts) {
            data.trialBalance.accounts.forEach((acc: any) => {
                const accountNumber = acc.accountNumber || acc.number || '';
                const classNum = accountNumber.charAt(0);
                if (accountsByClass[classNum]) {
                    accountsByClass[classNum].push(acc);
                }
            });
        }

        // Compute totals by class
        const classTotals: any = {};
        Object.keys(accountsByClass).forEach(classNum => {
            const accounts = accountsByClass[classNum];
            const total = accounts.reduce((sum: number, acc: any) => {
                const balance = Math.abs(Number((acc.debitBalance || 0) - (acc.creditBalance || 0)));
                return sum + balance;
            }, 0);
            classTotals[classNum] = total;
        });

        const prompt = isFr
            ? `Tu es un expert-comptable certifié SYSCOHADA pour LIFE'S SIMPLE SARL.
Rédige un rapport financier complet EN FRANÇAIS conforme au référentiel OHADA/SYSCOHADA.

═══════════════════════════════════════════════════════════
CADRE RÉGLEMENTAIRE
═══════════════════════════════════════════════════════════

Ce rapport doit strictement respecter le plan comptable SYSCOHADA révisé (acte uniforme OHADA).

Classes de comptes SYSCOHADA :
- Classe 1 : Comptes de ressources durables (Capitaux propres, emprunts)
- Classe 2 : Comptes d'actif immobilisé (Immobilisations corporelles, incorporelles, financières)
- Classe 3 : Comptes de stocks
- Classe 4 : Comptes de tiers (Clients, fournisseurs, personnel, État)
- Classe 5 : Comptes de trésorerie (Banques, caisse, valeurs mobilières)
- Classe 6 : Comptes de charges (Exploitation, financières, exceptionnelles)
- Classe 7 : Comptes de produits (Ventes, production, produits financiers)
- Classe 8 : Comptes des autres charges et produits
- Classe 9 : Comptes analytiques

═══════════════════════════════════════════════════════════
DONNÉES DE L'EXERCICE
═══════════════════════════════════════════════════════════

Exercice fiscal : ${data.fiscalYear.name}
Période : du ${data.fiscalYear.startDate} au ${data.fiscalYear.endDate}
Statut de l'exercice : ${data.fiscalYear.status === 'OPEN' ? 'Ouvert' : 'Clôturé'}

SYNTHÈSE DES INDICATEURS CLÉS :
- Chiffre d'affaires (Classe 7) : ${formatXAF(data.kpis.totalRevenue)}
- Charges d'exploitation (Classe 6) : ${formatXAF(data.kpis.totalExpenses)}
- Résultat net de l'exercice : ${formatXAF(data.kpis.netIncome)}
- Trésorerie active (Classe 5) : ${formatXAF(data.kpis.cashBalance)}
- Créances clients (Compte 411) : ${formatXAF(data.kpis.receivables)}
- Dettes fournisseurs (Compte 401) : ${formatXAF(data.kpis.payables)}
- TVA due (Compte 443) : ${formatXAF(data.kpis.tvaDue)}

BILAN SYSCOHADA (en XAF) :

ACTIF :
- Actif immobilisé (Classe 2) : ${formatXAF(classTotals['2'] || 0)}
- Actif circulant (Classes 3+4+5) : ${formatXAF((classTotals['3'] || 0) + (classTotals['4'] || 0) + (classTotals['5'] || 0))}
- TOTAL ACTIF : ${formatXAF(data.balanceSheet.totalAssets)}

PASSIF :
- Capitaux propres et ressources (Classe 1) : ${formatXAF(data.balanceSheet.equity)}
- Dettes (Classe 4 passif) : ${formatXAF(data.balanceSheet.totalLiabilities)}
- TOTAL PASSIF : ${formatXAF(data.balanceSheet.totalLiabilities + data.balanceSheet.equity)}

Équilibre comptable (Actif = Passif) : ${data.balanceSheet.isBalanced ? 'OUI ✓' : 'NON - À VÉRIFIER'}

COMPTE DE RÉSULTAT SYSCOHADA :

Produits (Classe 7) :
- Ventes et prestations : ${formatXAF(classTotals['7'] || data.incomeStatement.totalRevenue)}
- Produits financiers : ${formatXAF(0)}
- TOTAL PRODUITS : ${formatXAF(data.incomeStatement.totalRevenue)}

Charges (Classe 6) :
- Achats et variations de stocks : ${formatXAF(classTotals['6'] || 0)}
- Charges d'exploitation : ${formatXAF(data.incomeStatement.totalExpenses)}
- Charges financières : ${formatXAF(0)}
- TOTAL CHARGES : ${formatXAF(data.incomeStatement.totalExpenses)}

RÉSULTAT NET : ${formatXAF(data.incomeStatement.netIncome)}

ANALYSE PAR CLASSE DE COMPTES (Balance générale) :

${Object.keys(classTotals).map(classNum => {
    const classLabels: any = {
        '1': 'Ressources durables',
        '2': 'Actif immobilisé',
        '3': 'Stocks',
        '4': 'Comptes de tiers',
        '5': 'Trésorerie',
        '6': 'Charges',
        '7': 'Produits',
        '8': 'Autres charges/produits',
        '9': 'Comptabilité analytique'
    };
    return `- Classe ${classNum} (${classLabels[classNum]}) : ${formatXAF(classTotals[classNum])}`;
}).join('\n')}

DÉTAIL DES ÉCRITURES COMPTABLES (Balance des comptes) :
Nombre total de comptes mouvementés : ${data.trialBalance?.accounts?.length || 0}

${data.trialBalance?.accounts?.slice(0, 20).map((acc: any) =>
    `Compte ${acc.accountNumber || acc.number} - ${acc.accountName || acc.name} : Débit ${formatXAF(acc.debitBalance)} / Crédit ${formatXAF(acc.creditBalance)}`
).join('\n') || 'Aucun détail de compte disponible'}
${data.trialBalance?.accounts?.length > 20 ? '\n... et ' + (data.trialBalance.accounts.length - 20) + ' autres comptes' : ''}

ÉVOLUTION MENSUELLE DES PERFORMANCES (${data.monthlySummary?.months?.length || 0} mois) :
${data.monthlySummary?.months?.map((m: any, i: number) =>
  `Mois ${m.month || i+1} : Produits ${formatXAF(m.revenue)}, Charges ${formatXAF(m.expenses)}, Résultat ${formatXAF((m.revenue || 0) - (m.expenses || 0))}`
).join('\n') || 'Aucune donnée mensuelle disponible'}

${data.budgetVariance ? `
SUIVI BUDGÉTAIRE :
- Budget prévisionnel global : ${formatXAF(data.budgetVariance.totalBudgeted)}
- Réalisations effectives : ${formatXAF(data.budgetVariance.totalActual)}
- Écart budgétaire : ${formatXAF(data.budgetVariance.variance)} (${data.budgetVariance.variance >= 0 ? 'dépassement' : 'économie'})
- Taux de conformité budgétaire : ${data.budgetVariance.complianceRate}%
- Comptes en dépassement budgétaire : ${data.budgetVariance.overBudget}
- Comptes sous-consommés : ${data.budgetVariance.underBudget}
` : ''}

${data.taxStatus ? `
OBLIGATIONS FISCALES ET DÉCLARATIVES :
- Nombre de déclarations : ${data.taxStatus.total}
- En brouillon : ${data.taxStatus.draft}
- Validées en interne : ${data.taxStatus.validated}
- Déposées auprès de l'administration : ${data.taxStatus.filed}
- Montant total des impôts et taxes : ${formatXAF(data.taxStatus.totalAmount)}
` : ''}

INSTRUCTIONS :
Structure du rapport (utilise ces titres EXACTEMENT en MAJUSCULES sur une ligne seule) :
RESUME EXECUTIF
ANALYSE DU BILAN ET DU COMPTE DE RESULTAT
ANALYSE PAR CLASSE DE COMPTES SYSCOHADA
ECRITURES COMPTABLES ET MOUVEMENTS SIGNIFICATIFS
RECOMMANDATIONS

- Chaque section commence par son titre en MAJUSCULES sur une ligne seule, puis le texte du paragraphe
- Rédige un rapport COMPLET et DÉTAILLÉ - AUCUNE LIMITE DE MOTS
- Fournis une analyse approfondie et exhaustive de toutes les données fournies
- Analyse la structure du bilan SYSCOHADA (actif immobilisé vs circulant, capitaux propres vs dettes) en détail
- Commente TOUTES les écritures comptables significatives et les mouvements par classe de comptes
- Évalue et explique en détail les ratios financiers clés (liquidité générale, autonomie financière, rentabilité nette, rotation des actifs)
- Analyse les équilibres financiers (fonds de roulement, besoin en fonds de roulement, trésorerie nette) avec calculs détaillés
- Commente l'évolution mensuelle des performances avec analyse des tendances
- Identifie toutes les forces, faiblesses, risques et opportunités
- Formule des recommandations stratégiques concrètes et chiffrées pour chaque problématique identifiée
- Rédige plusieurs paragraphes par section selon la complexité et le volume de données
- Analyse détaillée compte par compte pour les comptes les plus significatifs
- Style formel et professionnel conforme aux normes OHADA
- PAS de markdown (pas de **, ##, *, --)
- PAS d'emojis
- PAS de listes à puces dans les paragraphes (texte continu uniquement)
- Chaque paragraphe séparé par une ligne vide
- SOIS EXHAUSTIF - ce rapport doit contenir TOUTES les informations nécessaires pour une compréhension complète de la situation financière

Ce rapport sera présenté à la direction et potentiellement aux auditeurs externes. Il doit être irréprochable et complet.`
            : `You are a SYSCOHADA certified accountant for LIFE'S SIMPLE SARL.
Write a comprehensive financial report IN ENGLISH compliant with OHADA/SYSCOHADA framework.

═══════════════════════════════════════════════════════════
REGULATORY FRAMEWORK
═══════════════════════════════════════════════════════════

This report must strictly comply with the revised SYSCOHADA chart of accounts (OHADA uniform act).

SYSCOHADA Account Classes:
- Class 1: Long-term resources (Equity, loans)
- Class 2: Fixed assets (Tangible, intangible, financial assets)
- Class 3: Inventory accounts
- Class 4: Third-party accounts (Customers, suppliers, personnel, state)
- Class 5: Cash accounts (Banks, cash, securities)
- Class 6: Expense accounts (Operating, financial, exceptional)
- Class 7: Revenue accounts (Sales, production, financial income)
- Class 8: Other expenses and revenues
- Class 9: Analytical accounts

═══════════════════════════════════════════════════════════
FISCAL YEAR DATA
═══════════════════════════════════════════════════════════

Fiscal Year: ${data.fiscalYear.name}
Period: from ${data.fiscalYear.startDate} to ${data.fiscalYear.endDate}
Status: ${data.fiscalYear.status === 'OPEN' ? 'Open' : 'Closed'}

KEY INDICATORS SUMMARY:
- Revenue (Class 7): ${formatXAF(data.kpis.totalRevenue)}
- Operating Expenses (Class 6): ${formatXAF(data.kpis.totalExpenses)}
- Net Income: ${formatXAF(data.kpis.netIncome)}
- Cash (Class 5): ${formatXAF(data.kpis.cashBalance)}
- Accounts Receivable (Account 411): ${formatXAF(data.kpis.receivables)}
- Accounts Payable (Account 401): ${formatXAF(data.kpis.payables)}
- VAT Due (Account 443): ${formatXAF(data.kpis.tvaDue)}

SYSCOHADA BALANCE SHEET (in XAF):

ASSETS:
- Fixed Assets (Class 2): ${formatXAF(classTotals['2'] || 0)}
- Current Assets (Classes 3+4+5): ${formatXAF((classTotals['3'] || 0) + (classTotals['4'] || 0) + (classTotals['5'] || 0))}
- TOTAL ASSETS: ${formatXAF(data.balanceSheet.totalAssets)}

LIABILITIES:
- Equity and Resources (Class 1): ${formatXAF(data.balanceSheet.equity)}
- Liabilities (Class 4 liabilities): ${formatXAF(data.balanceSheet.totalLiabilities)}
- TOTAL LIABILITIES: ${formatXAF(data.balanceSheet.totalLiabilities + data.balanceSheet.equity)}

Accounting Balance (Assets = Liabilities): ${data.balanceSheet.isBalanced ? 'YES ✓' : 'NO - TO BE VERIFIED'}

SYSCOHADA INCOME STATEMENT:

Revenues (Class 7):
- Sales and services: ${formatXAF(classTotals['7'] || data.incomeStatement.totalRevenue)}
- Financial income: ${formatXAF(0)}
- TOTAL REVENUES: ${formatXAF(data.incomeStatement.totalRevenue)}

Expenses (Class 6):
- Purchases and inventory changes: ${formatXAF(classTotals['6'] || 0)}
- Operating expenses: ${formatXAF(data.incomeStatement.totalExpenses)}
- Financial expenses: ${formatXAF(0)}
- TOTAL EXPENSES: ${formatXAF(data.incomeStatement.totalExpenses)}

NET INCOME: ${formatXAF(data.incomeStatement.netIncome)}

ANALYSIS BY ACCOUNT CLASS (General Ledger):

${Object.keys(classTotals).map(classNum => {
    const classLabels: any = {
        '1': 'Long-term resources',
        '2': 'Fixed assets',
        '3': 'Inventory',
        '4': 'Third-party accounts',
        '5': 'Cash',
        '6': 'Expenses',
        '7': 'Revenues',
        '8': 'Other expenses/revenues',
        '9': 'Analytical accounting'
    };
    return `- Class ${classNum} (${classLabels[classNum]}): ${formatXAF(classTotals[classNum])}`;
}).join('\n')}

JOURNAL ENTRIES DETAIL (Trial Balance):
Total accounts with movements: ${data.trialBalance?.accounts?.length || 0}

${data.trialBalance?.accounts?.slice(0, 20).map((acc: any) =>
    `Account ${acc.accountNumber || acc.number} - ${acc.accountName || acc.name}: Debit ${formatXAF(acc.debitBalance)} / Credit ${formatXAF(acc.creditBalance)}`
).join('\n') || 'No account details available'}
${data.trialBalance?.accounts?.length > 20 ? '\n... and ' + (data.trialBalance.accounts.length - 20) + ' more accounts' : ''}

MONTHLY PERFORMANCE EVOLUTION (${data.monthlySummary?.months?.length || 0} months):
${data.monthlySummary?.months?.map((m: any, i: number) =>
  `Month ${m.month || i+1}: Revenues ${formatXAF(m.revenue)}, Expenses ${formatXAF(m.expenses)}, Net ${formatXAF((m.revenue || 0) - (m.expenses || 0))}`
).join('\n') || 'No monthly data available'}

${data.budgetVariance ? `
BUDGET MONITORING:
- Total budgeted: ${formatXAF(data.budgetVariance.totalBudgeted)}
- Actual spending: ${formatXAF(data.budgetVariance.totalActual)}
- Budget variance: ${formatXAF(data.budgetVariance.variance)} (${data.budgetVariance.variance >= 0 ? 'overrun' : 'savings'})
- Budget compliance rate: ${data.budgetVariance.complianceRate}%
- Accounts over budget: ${data.budgetVariance.overBudget}
- Accounts under budget: ${data.budgetVariance.underBudget}
` : ''}

${data.taxStatus ? `
TAX AND REPORTING OBLIGATIONS:
- Number of declarations: ${data.taxStatus.total}
- Draft: ${data.taxStatus.draft}
- Internally validated: ${data.taxStatus.validated}
- Filed with authorities: ${data.taxStatus.filed}
- Total tax amount: ${formatXAF(data.taxStatus.totalAmount)}
` : ''}

INSTRUCTIONS:
Report structure (use these headings EXACTLY in UPPERCASE on their own line):
EXECUTIVE SUMMARY
BALANCE SHEET AND INCOME STATEMENT ANALYSIS
SYSCOHADA ACCOUNT CLASS ANALYSIS
JOURNAL ENTRIES AND SIGNIFICANT MOVEMENTS
RECOMMENDATIONS

- Each section starts with its heading in UPPERCASE on its own line, then the paragraph text
- Write a COMPLETE and DETAILED report - NO WORD LIMIT
- Provide an in-depth and exhaustive analysis of all data provided
- Analyze SYSCOHADA balance sheet structure (fixed vs current assets, equity vs liabilities) in detail
- Comment on ALL significant journal entries and movements by account class
- Evaluate and explain in detail key financial ratios (general liquidity, financial autonomy, net profitability, asset turnover)
- Analyze financial equilibriums (working capital, working capital requirement, net cash) with detailed calculations
- Comment on monthly performance evolution with trend analysis
- Identify all strengths, weaknesses, risks and opportunities
- Formulate concrete, quantified strategic recommendations for each identified issue
- Write multiple paragraphs per section according to complexity and data volume
- Detailed account-by-account analysis for the most significant accounts
- Formal professional style compliant with OHADA standards
- NO markdown (no **, ##, *, --)
- NO emojis
- NO bullet points in paragraphs (continuous text only)
- Each paragraph separated by a blank line
- BE EXHAUSTIVE - this report must contain ALL necessary information for a complete understanding of the financial situation

This report will be presented to management and potentially external auditors. It must be impeccable and complete.`;

        return prompt;
    }

    /* ── Generate (async) ────────────────────────────────── */

    async generate(dto: any, userId: string, userRole: string, userDepartmentId?: string): Promise<Report> {
        // 1. Check global lock
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const locked = await this.reportModel.findOne({
            where: { status: 'GENERATING', createdAt: { [Op.gte]: tenMinutesAgo } },
        });
        if (locked) throw new ConflictException('A report is currently being generated. Please try again in a moment.');

        // 2. Validate access by role
        if (dto.type === 'ACCOUNTING') {
            if (userRole !== 'ACCOUNTANT' && userRole !== 'MANAGER') {
                throw new ForbiddenException('Only accountants and managers can generate accounting reports');
            }
        } else if (userRole === 'EMPLOYEE') {
            if (dto.type !== 'PERSONAL') throw new ForbiddenException('Employees can only generate personal reports');
            const emp = await this.employeeModel.findOne({ where: { userId } });
            if (!emp) throw new NotFoundException('Employee not found');
            dto.targetEmployeeId = emp.id;
        } else if (userRole === 'HEAD_OF_DEPARTMENT') {
            if (dto.type === 'DEPARTMENT') {
                if (dto.targetDepartmentId && dto.targetDepartmentId !== userDepartmentId) {
                    throw new ForbiddenException('You can only generate reports for your department');
                }
                dto.targetDepartmentId = userDepartmentId;
            } else if (dto.type === 'PERSONAL' && dto.targetEmployeeId) {
                const emp = await this.employeeModel.findByPk(dto.targetEmployeeId);
                if (!emp || emp.getDataValue('departmentId') !== userDepartmentId) {
                    throw new ForbiddenException('Employee is not in your department');
                }
            }
        }

        // 3. Build default title
        if (!dto.title) {
            const isFr = (dto.language || 'fr') === 'fr';
            if (dto.type === 'ACCOUNTING') {
                dto.title = isFr
                    ? `Rapport Comptable - ${dto.fiscalYearName || 'Exercice'} - ${dto.startDate} au ${dto.endDate}`
                    : `Accounting Report - ${dto.fiscalYearName || 'Fiscal Year'} - ${dto.startDate} to ${dto.endDate}`;
            } else {
                const periodLabel = {
                    DAY: isFr ? 'Journalier' : 'Daily',
                    WEEK: isFr ? 'Hebdomadaire' : 'Weekly',
                    MONTH: isFr ? 'Mensuel' : 'Monthly',
                    CUSTOM: isFr ? 'Personnalise' : 'Custom',
                }[dto.period] || dto.period;
                dto.title = `Rapport ${periodLabel} — ${dto.startDate} au ${dto.endDate}`;
            }
        }

        // 4. Create with GENERATING status
        const report = await this.reportModel.create({
            title: dto.title,
            type: dto.type,
            status: 'GENERATING',
            generatedByUserId: userId,
            targetEmployeeId: dto.targetEmployeeId || null,
            targetDepartmentId: dto.targetDepartmentId || null,
            period: dto.period,
            startDate: dto.startDate,
            endDate: dto.endDate,
        });

        // 5. Start background generation
        this.runGeneration(report.id, dto, userId, userRole, userDepartmentId).catch(err => {
            this.logger.error(`Unhandled generation error for report ${report.id}: ${err.message}`);
        });

        return report.reload({ include: this.includeOptions() });
    }

    /* ── List ────────────────────────────────────────────── */

    async findAll(userId: string, userRole: string, userDepartmentId?: string): Promise<Report[]> {
        let where: any = {};

        // EMPLOYEE: Only see reports they generated themselves
        if (userRole === 'EMPLOYEE' || userRole === 'COMMERCIAL') {
            where = { generatedByUserId: userId };
        } else if (userRole === 'HEAD_OF_DEPARTMENT') {
            // HOD: See all reports for their department (regardless of who generated)
            const employees = await this.employeeModel.findAll({ where: { departmentId: userDepartmentId } });
            const empIds = employees.map(e => e.id);
            where = {
                [Op.or]: [
                    { targetDepartmentId: userDepartmentId },
                    { targetEmployeeId: { [Op.in]: empIds } },
                ],
            };
        }
        // MANAGER: See all reports (no where clause)

        return this.reportModel.findAll({
            where,
            include: this.includeOptions(),
            order: [['createdAt', 'DESC']],
        });
    }

    /* ── Get one ─────────────────────────────────────────── */

    async findOne(id: string, userId: string, userRole: string, userDepartmentId?: string): Promise<Report> {
        const report = await this.reportModel.findByPk(id, { include: this.includeOptions() });
        if (!report) throw new NotFoundException('Report not found');

        // EMPLOYEE/COMMERCIAL: Only see reports they generated
        if (userRole === 'EMPLOYEE' || userRole === 'COMMERCIAL') {
            if (report.getDataValue('generatedByUserId') !== userId) {
                throw new ForbiddenException();
            }
        } else if (userRole === 'HEAD_OF_DEPARTMENT') {
            // HOD: Can see reports for their department
            const deptMatch = report.getDataValue('targetDepartmentId') === userDepartmentId;
            if (!deptMatch) {
                if (report.getDataValue('targetEmployeeId')) {
                    const emp = await this.employeeModel.findByPk(report.getDataValue('targetEmployeeId'));
                    if (!emp || emp.getDataValue('departmentId') !== userDepartmentId) {
                        throw new ForbiddenException();
                    }
                } else {
                    throw new ForbiddenException();
                }
            }
        }
        // MANAGER: Can see all reports (no check)

        return report;
    }

    /* ── Delete ──────────────────────────────────────────── */

    async remove(id: string, userId: string, userRole: string): Promise<void> {
        const report = await this.reportModel.findByPk(id);
        if (!report) throw new NotFoundException('Report not found');
        if (userRole === 'EMPLOYEE' && report.getDataValue('generatedByUserId') !== userId) {
            throw new ForbiddenException();
        }
        await report.destroy();
    }
}
