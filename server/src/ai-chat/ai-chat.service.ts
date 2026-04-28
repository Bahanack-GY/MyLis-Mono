import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
}

@Injectable()
export class AiChatService {
    private readonly logger = new Logger(AiChatService.name);
    private readonly geminiApiKey = process.env.GEMINI_API_KEY;
    private readonly geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    constructor(@InjectConnection() private sequelize: Sequelize) {}

    // ─────────────────────────────────────────────────────────────────────────
    // WHATSAPP INTEGRATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Strict phone-based authorization check.
     * Extracts 9-digit local number from the WhatsApp JID (e.g. 237698302153@s.whatsapp.net)
     * and matches against Employees whose linked User has CEO or MANAGER role.
     */
    async isAuthorizedWhatsAppUser(jid: string): Promise<boolean> {
        const digits = jid.replace(/\D/g, '').replace(/^237/, '');
        if (digits.length !== 9) return false;

        const [rows] = await this.sequelize.query(
            `SELECT 1 FROM "Users" u
             JOIN "Employees" e ON e."userId" = u.id
             WHERE RIGHT(REGEXP_REPLACE(e."phoneNumber", '[^0-9]', '', 'g'), 9) = :digits
               AND e."dismissedAt" IS NULL
               AND u.role::text IN ('CEO', 'MANAGER')
             LIMIT 1`,
            { raw: true, replacements: { digits } },
        );
        return (rows as any[]).length > 0;
    }

    async chat(message: string, history: ChatMessage[]): Promise<string> {
        if (!this.geminiApiKey) throw new Error('GEMINI_API_KEY is not set');

        const context = await this.gatherContext();
        const systemInstruction = this.buildSystemPrompt(context);

        const genAI = new GoogleGenerativeAI(this.geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: this.geminiModel,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.9 },
            systemInstruction,
        });

        const chatSession = model.startChat({
            history: history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
        });

        const result = await chatSession.sendMessage(message);
        const text = result.response.text().trim();
        if (!text) throw new Error('Empty AI response');
        return text;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATA GATHERING
    // ─────────────────────────────────────────────────────────────────────────

    private async gatherContext(): Promise<Record<string, any>> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const run = (sql: string, rep?: Record<string, any>) =>
            this.sequelize.query(sql, { raw: true, ...(rep ? { replacements: rep } : {}) });

        const [
            // ── CORE ──────────────────────────────────────────────────────
            [empCountRows],
            [deptRows],
            [clientCountRows],

            // ── FINANCE ───────────────────────────────────────────────────
            [revYearRows],
            [revMonthRows],
            [revWeekRows],
            [revTodayRows],
            [expYearRows],
            [expMonthRows],
            [expWeekRows],
            [expTodayRows],
            [pendingInvRows],
            [revByDeptYearRows],
            [revByDeptMonthRows],
            [revByDeptWeekRows],
            [revByDeptTodayRows],
            [expByDeptYearRows],
            [expByDeptMonthRows],
            [expByDeptWeekRows],
            [expByDeptTodayRows],
            [revMonthlyBreakdownRows],
            [expMonthlyBreakdownRows],
            [clientRevenueRows],

            // ── TASKS & PLANNING ──────────────────────────────────────────
            [taskStateRows],
            [taskDeptRows],
            [tasksByPeriodRows],
            [planningThisMonthRows],

            // ── PROJECTS ──────────────────────────────────────────────────
            [projectRows],
            [milestoneRows],

            // ── TICKETS ───────────────────────────────────────────────────
            [ticketSummaryRows],
            [ticketDeptRows],
            [ticketOverdueRows],

            // ── MEETINGS ──────────────────────────────────────────────────
            [meetingStatsRows],
            [upcomingMeetingRows],

            // ── HR ────────────────────────────────────────────────────────
            [sanctionSummaryRows],
            [recentSanctionRows],
            [formationRows],
            [entretienRows],
            [bizExpRows],
            [bizExpByDeptRows],

            // ── PAYROLL ───────────────────────────────────────────────────
            [payrollRows],
            [latestPayslipRows],

            // ── ACCOUNTING ────────────────────────────────────────────────
            [fiscalYearRows],
            [accountBalanceRows],
            [taxDecRows],
            [journalRows],

            // ── SUPPLIERS ─────────────────────────────────────────────────
            [supplierRows],
            [supplierOverdueRows],

            // ── FUND MOVEMENTS ────────────────────────────────────────────
            [fundSummaryRows],
            [fundRecentRows],

            // ── COMMERCIAL ────────────────────────────────────────────────
            [leadStageRows],
            [leadStatusRows],
            [deptTargetRows],
            [deptGoalRows],
            [commercialGoalRows],

            // ── EMPLOYEE RANKINGS ─────────────────────────────────────────
            [topEmpRows],
            [eomRows],
            [liveTopRows],

            // ── TEAM DETAILS ──────────────────────────────────────────────
            [deptDetailRows],
            [employeeDetailRows],
            [newHireRows],

            // ── DEMANDS ───────────────────────────────────────────────────
            [demandStatusRows],
            [demandPeriodRows],

            // ── CARWASH ───────────────────────────────────────────────────
            [carwashSummaryRows],
            [carwashByStationRows],
        ] = (await Promise.all([

            // ── CORE ──────────────────────────────────────────────────────
            run(`SELECT COUNT(*) AS count FROM "Employees" WHERE "dismissedAt" IS NULL`),
            run(`SELECT id, name FROM "Departments" ORDER BY name`),
            run(`SELECT COUNT(*) AS count FROM "Clients"`),

            // ── FINANCE ───────────────────────────────────────────────────
            run(`SELECT COALESCE(SUM(total),0) AS total FROM "Invoices"
                 WHERE status::text='PAID' AND EXTRACT(YEAR FROM "issueDate")=:year`, { year }),
            run(`SELECT COALESCE(SUM(total),0) AS total FROM "Invoices"
                 WHERE status::text='PAID'
                   AND EXTRACT(YEAR FROM "issueDate")=:year
                   AND EXTRACT(MONTH FROM "issueDate")=:month`, { year, month }),
            run(`SELECT COALESCE(SUM(total),0) AS total FROM "Invoices"
                 WHERE status::text='PAID' AND "issueDate">=date_trunc('week',CURRENT_DATE)`),
            run(`SELECT COALESCE(SUM(total),0) AS total FROM "Invoices"
                 WHERE status::text='PAID' AND "issueDate"::date=CURRENT_DATE`),
            run(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                 WHERE EXTRACT(YEAR FROM "createdAt")=:year`, { year }),
            run(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                 WHERE EXTRACT(YEAR FROM "createdAt")=:year
                   AND EXTRACT(MONTH FROM "createdAt")=:month`, { year, month }),
            run(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                 WHERE "createdAt">=date_trunc('week',CURRENT_DATE)`),
            run(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses
                 WHERE "createdAt"::date=CURRENT_DATE`),
            run(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS total
                 FROM "Invoices" WHERE status::text IN ('SENT','CREATED')`),
            run(`SELECT d.name AS dept, COALESCE(SUM(i.total),0) AS total
                 FROM "Invoices" i JOIN "Departments" d ON d.id=i."departmentId"
                 WHERE i.status::text='PAID' AND EXTRACT(YEAR FROM i."issueDate")=:year
                 GROUP BY d.name ORDER BY total DESC`, { year }),
            run(`SELECT d.name AS dept, COALESCE(SUM(i.total),0) AS total
                 FROM "Invoices" i JOIN "Departments" d ON d.id=i."departmentId"
                 WHERE i.status::text='PAID'
                   AND EXTRACT(YEAR FROM i."issueDate")=:year
                   AND EXTRACT(MONTH FROM i."issueDate")=:month
                 GROUP BY d.name ORDER BY total DESC`, { year, month }),
            run(`SELECT d.name AS dept, COALESCE(SUM(i.total),0) AS total
                 FROM "Invoices" i JOIN "Departments" d ON d.id=i."departmentId"
                 WHERE i.status::text='PAID' AND i."issueDate">=date_trunc('week',CURRENT_DATE)
                 GROUP BY d.name ORDER BY total DESC`),
            run(`SELECT d.name AS dept, COALESCE(SUM(i.total),0) AS total
                 FROM "Invoices" i JOIN "Departments" d ON d.id=i."departmentId"
                 WHERE i.status::text='PAID' AND i."issueDate"::date=CURRENT_DATE
                 GROUP BY d.name ORDER BY total DESC`),
            run(`SELECT d.name AS dept, COALESCE(SUM(ex.amount),0) AS total
                 FROM expenses ex JOIN "Departments" d ON d.id=ex."departmentId"
                 WHERE EXTRACT(YEAR FROM ex."createdAt")=:year
                 GROUP BY d.name ORDER BY total DESC`, { year }),
            run(`SELECT d.name AS dept, COALESCE(SUM(ex.amount),0) AS total
                 FROM expenses ex JOIN "Departments" d ON d.id=ex."departmentId"
                 WHERE EXTRACT(YEAR FROM ex."createdAt")=:year
                   AND EXTRACT(MONTH FROM ex."createdAt")=:month
                 GROUP BY d.name ORDER BY total DESC`, { year, month }),
            run(`SELECT d.name AS dept, COALESCE(SUM(ex.amount),0) AS total
                 FROM expenses ex JOIN "Departments" d ON d.id=ex."departmentId"
                 WHERE ex."createdAt">=date_trunc('week',CURRENT_DATE)
                 GROUP BY d.name ORDER BY total DESC`),
            run(`SELECT d.name AS dept, COALESCE(SUM(ex.amount),0) AS total
                 FROM expenses ex JOIN "Departments" d ON d.id=ex."departmentId"
                 WHERE ex."createdAt"::date=CURRENT_DATE
                 GROUP BY d.name ORDER BY total DESC`),
            run(`SELECT EXTRACT(MONTH FROM "issueDate")::int AS month,
                        COALESCE(SUM(total),0) AS revenue
                 FROM "Invoices"
                 WHERE status::text='PAID' AND EXTRACT(YEAR FROM "issueDate")=:year
                 GROUP BY month ORDER BY month`, { year }),
            run(`SELECT EXTRACT(MONTH FROM "createdAt")::int AS month,
                        COALESCE(SUM(amount),0) AS total
                 FROM expenses
                 WHERE EXTRACT(YEAR FROM "createdAt")=:year
                 GROUP BY month ORDER BY month`, { year }),
            run(`SELECT c.name AS client, c.type::text AS type, d.name AS dept,
                        COUNT(DISTINCT i.id) AS invoices,
                        COALESCE(SUM(CASE WHEN i.status::text='PAID' THEN i.total END),0) AS paid,
                        COALESCE(SUM(CASE WHEN i.status::text IN ('SENT','CREATED') THEN i.total END),0) AS pending
                 FROM "Clients" c
                 LEFT JOIN "Departments" d ON d.id=c."departmentId"
                 LEFT JOIN "Invoices" i ON i."clientId"=c.id
                 GROUP BY c.id, c.name, c.type, d.name
                 ORDER BY paid DESC LIMIT 30`),

            // ── TASKS & PLANNING ──────────────────────────────────────────
            run(`SELECT state::text AS state, COUNT(*) AS count FROM "Tasks" GROUP BY state::text`),
            run(`SELECT d.name AS dept, t.state::text AS state, COUNT(*) AS count
                 FROM "Tasks" t
                 JOIN "Employees" e ON e.id=t."assignedToId"
                 JOIN "Departments" d ON d.id=e."departmentId"
                 GROUP BY d.name, t.state::text ORDER BY d.name, t.state::text`),
            run(`SELECT d.name AS dept,
                        COUNT(CASE WHEN t.state::text='COMPLETED' THEN 1 END) AS done_year,
                        COUNT(CASE WHEN t.state::text='COMPLETED'
                              AND EXTRACT(MONTH FROM t."updatedAt")=:month
                              AND EXTRACT(YEAR FROM t."updatedAt")=:year THEN 1 END) AS done_month,
                        COUNT(CASE WHEN t.state::text='COMPLETED'
                              AND t."updatedAt">=date_trunc('week',CURRENT_DATE) THEN 1 END) AS done_week,
                        COUNT(CASE WHEN t.state::text='COMPLETED'
                              AND t."updatedAt"::date=CURRENT_DATE THEN 1 END) AS done_today,
                        COUNT(t.id) AS total
                 FROM "Tasks" t
                 JOIN "Employees" e ON e.id=t."assignedToId"
                 JOIN "Departments" d ON d.id=e."departmentId"
                 GROUP BY d.name ORDER BY d.name`, { year, month }),
            run(`SELECT t.title, t.state::text AS state, t.difficulty::text AS difficulty,
                        t."dueDate", e."firstName"||' '||e."lastName" AS assignee, d.name AS dept
                 FROM "Tasks" t
                 LEFT JOIN "Employees" e ON e.id=t."assignedToId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 WHERE EXTRACT(YEAR FROM t."dueDate")=:year
                   AND EXTRACT(MONTH FROM t."dueDate")=:month
                 ORDER BY t."dueDate" ASC LIMIT 50`, { year, month }),

            // ── PROJECTS ──────────────────────────────────────────────────
            run(`SELECT p.name, d.name AS dept, p.budget, p.revenue,
                        p."startDate", p."endDate",
                        COUNT(DISTINCT t.id) AS tasks_total,
                        COUNT(DISTINCT CASE WHEN t.state::text='COMPLETED' THEN t.id END) AS tasks_done,
                        COUNT(DISTINCT m.id) AS milestones_total,
                        COUNT(DISTINCT CASE WHEN m."completedAt" IS NOT NULL THEN m.id END) AS milestones_done
                 FROM "Projects" p
                 LEFT JOIN "Departments" d ON d.id=p."departmentId"
                 LEFT JOIN "Tasks" t ON t."projectId"=p.id
                 LEFT JOIN project_milestones m ON m."projectId"=p.id
                 GROUP BY p.id, p.name, d.name, p.budget, p.revenue, p."startDate", p."endDate"
                 ORDER BY p."startDate" DESC LIMIT 25`),
            run(`SELECT m.title, m."dueDate", m."completedAt", p.name AS project
                 FROM project_milestones m
                 JOIN "Projects" p ON p.id=m."projectId"
                 WHERE m."completedAt" IS NULL AND m."dueDate" IS NOT NULL
                 ORDER BY m."dueDate" ASC LIMIT 15`),

            // ── TICKETS ───────────────────────────────────────────────────
            run(`SELECT t.status::text AS status, t.priority::text AS priority,
                        d.name AS dept, COUNT(*) AS count
                 FROM "Tickets" t
                 LEFT JOIN "Departments" d ON d.id=t."targetDepartmentId"
                 GROUP BY t.status::text, t.priority::text, d.name ORDER BY d.name, status`),
            run(`SELECT d.name AS dept, COUNT(*) AS count
                 FROM "Tickets" t
                 LEFT JOIN "Departments" d ON d.id=t."targetDepartmentId"
                 WHERE t.status::text NOT IN ('COMPLETED','CLOSED')
                 GROUP BY d.name ORDER BY count DESC`),
            run(`SELECT COUNT(*) AS count FROM "Tickets"
                 WHERE "dueDate" < CURRENT_DATE AND status::text NOT IN ('COMPLETED','CLOSED')`),

            // ── MEETINGS ──────────────────────────────────────────────────
            run(`SELECT status::text AS status, type::text AS type, COUNT(*) AS count
                 FROM "Meetings" GROUP BY status::text, type::text`),
            run(`SELECT title, type::text AS type, date, "startTime", "endTime", location
                 FROM "Meetings"
                 WHERE date::date>=CURRENT_DATE AND status::text!='cancelled'
                 ORDER BY date ASC LIMIT 10`),

            // ── HR ────────────────────────────────────────────────────────
            run(`SELECT s.type::text AS type, s.severity::text AS severity,
                        d.name AS dept, COUNT(*) AS count
                 FROM "Sanctions" s
                 JOIN "Employees" e ON e.id=s."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 GROUP BY s.type::text, s.severity::text, d.name`),
            run(`SELECT s.type::text AS type, s.severity::text AS severity,
                        s.reason, s.date,
                        e."firstName"||' '||e."lastName" AS employee, d.name AS dept
                 FROM "Sanctions" s
                 JOIN "Employees" e ON e.id=s."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 WHERE s.date>=CURRENT_DATE-INTERVAL '6 months'
                 ORDER BY s.date DESC LIMIT 10`),
            run(`SELECT f.title, f.organization, f."startDate", f."endDate",
                        e."firstName"||' '||e."lastName" AS employee, d.name AS dept
                 FROM "Formations" f
                 JOIN "Employees" e ON e.id=f."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 ORDER BY f."startDate" DESC LIMIT 20`),
            run(`SELECT type::text AS type, status::text AS status, COUNT(*) AS count
                 FROM "Entretiens" GROUP BY type::text, status::text`),
            run(`SELECT status::text AS status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
                 FROM business_expenses GROUP BY status::text`),
            run(`SELECT d.name AS dept, COALESCE(SUM(be.amount),0) AS total,
                        COUNT(CASE WHEN be.status::text='PENDING' THEN 1 END) AS pending_count
                 FROM business_expenses be
                 JOIN "Employees" e ON e.id=be."employeeId"
                 JOIN "Departments" d ON d.id=e."departmentId"
                 GROUP BY d.name ORDER BY total DESC`),

            // ── PAYROLL ───────────────────────────────────────────────────
            run(`SELECT year, month, status::text AS status, "totalGross", "totalNet", "totalEmployerCharges"
                 FROM payroll_runs ORDER BY year DESC, month DESC LIMIT 6`),
            run(`SELECT e."firstName"||' '||e."lastName" AS name, d.name AS dept,
                        ps."grossSalary", ps."netSalary", ps."totalDeductions",
                        ps.irpp, ps."cnpsEmployee", ps.cfc
                 FROM payslips ps
                 JOIN "Employees" e ON e.id=ps."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 WHERE ps."payrollRunId"=(
                     SELECT id FROM payroll_runs ORDER BY year DESC, month DESC LIMIT 1
                 )
                 ORDER BY ps."grossSalary" DESC`),

            // ── ACCOUNTING ────────────────────────────────────────────────
            run(`SELECT id, name, status::text AS status, "startDate", "endDate"
                 FROM fiscal_years ORDER BY "startDate" DESC LIMIT 5`),
            run(`SELECT SUBSTRING(a.code,1,1) AS class,
                        COALESCE(SUM(jel.debit),0) AS total_debit,
                        COALESCE(SUM(jel.credit),0) AS total_credit,
                        COALESCE(SUM(jel.credit-jel.debit),0) AS balance
                 FROM journal_entry_lines jel
                 JOIN accounts a ON a.id=jel."accountId"
                 JOIN journal_entries je ON je.id=jel."journalEntryId"
                 WHERE je.status::text='VALIDATED'
                 GROUP BY SUBSTRING(a.code,1,1) ORDER BY class`),
            run(`SELECT type::text AS type, status::text AS status,
                        period, "dueDate", "totalAmount"
                 FROM tax_declarations ORDER BY "dueDate" ASC LIMIT 15`),
            run(`SELECT COUNT(*) AS total,
                        COUNT(CASE WHEN status::text='VALIDATED' THEN 1 END) AS validated,
                        COUNT(CASE WHEN status::text='DRAFT' THEN 1 END) AS draft
                 FROM journal_entries`),

            // ── SUPPLIERS ─────────────────────────────────────────────────
            run(`SELECT s.name, s.email, s.phone,
                        COUNT(si.id) AS invoice_count,
                        COALESCE(SUM(si."totalTTC"),0) AS total_invoiced,
                        COALESCE(SUM(CASE WHEN si.status::text='PAID' THEN si."totalTTC" END),0) AS paid,
                        COALESCE(SUM(CASE WHEN si.status::text IN ('DRAFT','VALIDATED') THEN si."totalTTC" END),0) AS owed
                 FROM suppliers s
                 LEFT JOIN supplier_invoices si ON si."supplierId"=s.id
                 WHERE s."isActive"=true
                 GROUP BY s.id, s.name, s.email, s.phone ORDER BY total_invoiced DESC LIMIT 20`),
            run(`SELECT COUNT(*) AS count, COALESCE(SUM("totalTTC"),0) AS total
                 FROM supplier_invoices
                 WHERE "dueDate"::date<CURRENT_DATE AND status::text IN ('DRAFT','VALIDATED')`),

            // ── FUND MOVEMENTS ────────────────────────────────────────────
            run(`SELECT type::text AS type, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
                 FROM fund_movements
                 WHERE EXTRACT(YEAR FROM date::date)=:year
                 GROUP BY type::text`, { year }),
            run(`SELECT type::text AS type, amount, description, date
                 FROM fund_movements ORDER BY date DESC LIMIT 10`),

            // ── COMMERCIAL ────────────────────────────────────────────────
            run(`SELECT "saleStage"::text AS stage, COUNT(*) AS count,
                        COALESCE(SUM("potentialRevenue"),0) AS potential
                 FROM leads GROUP BY "saleStage"::text ORDER BY potential DESC`),
            run(`SELECT "leadStatus"::text AS status, COUNT(*) AS count,
                        COALESCE(SUM("potentialRevenue"),0) AS potential
                 FROM leads GROUP BY "leadStatus"::text`),
            run(`SELECT d.name AS dept, dmt.month, dmt."targetRevenue",
                        COALESCE(SUM(CASE WHEN i.status::text='PAID' THEN i.total END),0) AS actual
                 FROM "DepartmentMonthlyTargets" dmt
                 JOIN "Departments" d ON d.id=dmt."departmentId"
                 LEFT JOIN "Invoices" i ON i."departmentId"=d.id
                   AND EXTRACT(MONTH FROM i."issueDate")=dmt.month
                   AND EXTRACT(YEAR FROM i."issueDate")=:year
                 WHERE dmt.year=:year
                 GROUP BY d.name, dmt.id, dmt.month, dmt."targetRevenue"
                 ORDER BY d.name, dmt.month`, { year }),
            run(`SELECT d.name AS dept, dg.year, dg."targetRevenue", dg."currentRevenue"
                 FROM "DepartmentGoals" dg
                 JOIN "Departments" d ON d.id=dg."departmentId"
                 WHERE dg.year=:year ORDER BY dg."targetRevenue" DESC`, { year }),
            run(`SELECT e."firstName"||' '||e."lastName" AS name, d.name AS dept,
                        cg.month, cg."targetAmount"
                 FROM commercial_goals cg
                 JOIN "Employees" e ON e.id=cg."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 WHERE cg.year=:year ORDER BY e."lastName", cg.month`, { year }),

            // ── EMPLOYEE RANKINGS ─────────────────────────────────────────
            run(`SELECT e."firstName"||' '||e."lastName" AS name, d.name AS dept,
                        COUNT(t.id) AS total,
                        COUNT(CASE WHEN t.state::text='COMPLETED' THEN 1 END) AS completed
                 FROM "Employees" e
                 LEFT JOIN "Tasks" t ON t."assignedToId"=e.id
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 WHERE e."dismissedAt" IS NULL
                 GROUP BY e.id, e."firstName", e."lastName", d.name
                 HAVING COUNT(t.id)>0
                 ORDER BY (COUNT(CASE WHEN t.state::text='COMPLETED' THEN 1 END)::float/COUNT(t.id)) DESC
                 LIMIT 10`),
            run(`SELECT r.rank, r.points, r."tasksCompleted", r."tasksReviewed",
                        r.year, r.month,
                        e."firstName"||' '||e."lastName" AS name, d.name AS dept, p.title AS position
                 FROM employee_monthly_rankings r
                 JOIN "Employees" e ON e.id=r."employeeId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 LEFT JOIN "Positions" p ON p.id=e."positionId"
                 WHERE (r.year, r.month)=(
                     SELECT year, month FROM employee_monthly_rankings
                     ORDER BY year DESC, month DESC LIMIT 1
                 )
                 ORDER BY r.rank ASC`),
            run(`SELECT e."firstName"||' '||e."lastName" AS name, d.name AS dept, p.title AS position,
                        COUNT(t.id) AS tasks_done
                 FROM "Tasks" t
                 JOIN "Employees" e ON e.id=t."assignedToId"
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 LEFT JOIN "Positions" p ON p.id=e."positionId"
                 WHERE t.state::text IN ('COMPLETED','REVIEWED')
                   AND EXTRACT(YEAR FROM t."updatedAt")=:year
                   AND EXTRACT(MONTH FROM t."updatedAt")=:month
                   AND e."dismissedAt" IS NULL
                 GROUP BY e.id, e."firstName", e."lastName", d.name, p.title
                 ORDER BY tasks_done DESC LIMIT 10`, { year, month }),

            // ── TEAM DETAILS ──────────────────────────────────────────────
            run(`SELECT d.name AS dept, COUNT(e.id) AS headcount,
                        STRING_AGG(DISTINCT e."firstName"||' '||e."lastName", ', '
                            ORDER BY e."firstName"||' '||e."lastName") AS members
                 FROM "Departments" d
                 LEFT JOIN "Employees" e ON e."departmentId"=d.id AND e."dismissedAt" IS NULL
                 GROUP BY d.id, d.name ORDER BY d.name`),
            run(`SELECT e."firstName", e."lastName", e."phoneNumber", e."hireDate", e."birthDate",
                        e."address", e."skills"::text AS skills, e.salary,
                        d.name AS dept, p.title AS position, u.email, u.role::text AS role,
                        COUNT(CASE WHEN t.state::text='COMPLETED' THEN 1 END) AS tasks_done,
                        COUNT(t.id) AS tasks_total
                 FROM "Employees" e
                 LEFT JOIN "Departments" d ON d.id=e."departmentId"
                 LEFT JOIN "Positions" p ON p.id=e."positionId"
                 LEFT JOIN "Users" u ON u.id=e."userId"
                 LEFT JOIN "Tasks" t ON t."assignedToId"=e.id
                 WHERE e."dismissedAt" IS NULL
                 GROUP BY e.id, e."firstName", e."lastName", e."phoneNumber", e."hireDate",
                          e."birthDate", e."address", e."skills"::text, e.salary,
                          d.name, p.title, u.email, u.role
                 ORDER BY d.name, e."lastName"`),
            run(`SELECT TO_CHAR("hireDate",'YYYY-MM') AS period, COUNT(*) AS count
                 FROM "Employees"
                 WHERE "hireDate">=NOW()-INTERVAL '12 months'
                 GROUP BY period ORDER BY period ASC`),

            // ── DEMANDS ───────────────────────────────────────────────────
            run(`SELECT status::text AS status, COUNT(*) AS count FROM "Demands" GROUP BY status::text`),
            run(`SELECT COUNT(CASE WHEN EXTRACT(YEAR FROM "createdAt")=:year THEN 1 END) AS year_count,
                        COUNT(CASE WHEN EXTRACT(YEAR FROM "createdAt")=:year
                              AND EXTRACT(MONTH FROM "createdAt")=:month THEN 1 END) AS month_count,
                        COUNT(CASE WHEN "createdAt">=date_trunc('week',CURRENT_DATE) THEN 1 END) AS week_count,
                        COUNT(CASE WHEN "createdAt"::date=CURRENT_DATE THEN 1 END) AS today_count
                 FROM "Demands"`, { year, month }),

            // ── CARWASH ───────────────────────────────────────────────────
            run(`SELECT COALESCE(SUM(revenue),0) AS total_revenue,
                        COALESCE(SUM(expenses),0) AS total_expenses,
                        COALESCE(SUM(vehicles),0) AS total_vehicles,
                        COUNT(*) AS days_tracked, MIN(date) AS from_date, MAX(date) AS to_date
                 FROM carwash_daily_stats
                 WHERE date>=CURRENT_DATE-INTERVAL '30 days'`),
            run(`SELECT "stationName", COALESCE(SUM(revenue),0) AS revenue,
                        COALESCE(SUM(expenses),0) AS expenses,
                        COALESCE(SUM(vehicles),0) AS vehicles
                 FROM carwash_daily_stats
                 WHERE date>=CURRENT_DATE-INTERVAL '30 days'
                 GROUP BY "stationName" ORDER BY revenue DESC`),

        ])) as any;

        // ── PARSE ─────────────────────────────────────────────────────────────

        const toN = (v: any) => parseFloat(v ?? 0);
        const toI = (v: any) => parseInt(v ?? 0, 10);

        const taskStates: Record<string, number> = {};
        for (const r of taskStateRows as any[]) taskStates[r.state] = toI(r.count);

        const tasksByDept: Record<string, Record<string, number>> = {};
        for (const r of taskDeptRows as any[]) {
            if (!tasksByDept[r.dept]) tasksByDept[r.dept] = {};
            tasksByDept[r.dept][r.state] = toI(r.count);
        }

        const demandStatus: Record<string, number> = {};
        for (const r of demandStatusRows as any[]) demandStatus[r.status] = toI(r.count);

        const leadStages: Record<string, { count: number; potential: number }> = {};
        for (const r of leadStageRows as any[])
            leadStages[r.stage] = { count: toI(r.count), potential: toN(r.potential) };

        const leadStatuses: Record<string, { count: number; potential: number }> = {};
        for (const r of leadStatusRows as any[])
            leadStatuses[r.status] = { count: toI(r.count), potential: toN(r.potential) };

        const ticketStats: Record<string, Record<string, number>> = {};
        for (const r of ticketSummaryRows as any[]) {
            const key = r.dept || 'N/A';
            if (!ticketStats[key]) ticketStats[key] = {};
            ticketStats[key][`${r.status}/${r.priority}`] = toI(r.count);
        }

        const eomSnapshot = eomRows as any[];
        const eomPeriod = eomSnapshot.length > 0
            ? `${eomSnapshot[0].year}-${String(eomSnapshot[0].month).padStart(2, '0')}`
            : null;

        return {
            year, month,
            departments: ((deptRows as unknown) as any[]).map((d: any) => d.name),
            employees: toI((empCountRows as any)[0]?.count),
            clients: toI((clientCountRows as any)[0]?.count),
            // Revenue
            revYear: toN((revYearRows as any)[0]?.total),
            revMonth: toN((revMonthRows as any)[0]?.total),
            revWeek: toN((revWeekRows as any)[0]?.total),
            revToday: toN((revTodayRows as any)[0]?.total),
            // Expenses
            expYear: toN((expYearRows as any)[0]?.total),
            expMonth: toN((expMonthRows as any)[0]?.total),
            expWeek: toN((expWeekRows as any)[0]?.total),
            expToday: toN((expTodayRows as any)[0]?.total),
            // Pending invoices
            pendingCount: toI((pendingInvRows as any)[0]?.count),
            pendingTotal: toN((pendingInvRows as any)[0]?.total),
            // By dept
            revDeptYear: revByDeptYearRows as any[],
            revDeptMonth: revByDeptMonthRows as any[],
            revDeptWeek: revByDeptWeekRows as any[],
            revDeptToday: revByDeptTodayRows as any[],
            expDeptYear: expByDeptYearRows as any[],
            expDeptMonth: expByDeptMonthRows as any[],
            expDeptWeek: expByDeptWeekRows as any[],
            expDeptToday: expByDeptTodayRows as any[],
            // Monthly breakdowns
            revByMonth: revMonthlyBreakdownRows as any[],
            expByMonth: expMonthlyBreakdownRows as any[],
            // Clients
            clientRevenue: clientRevenueRows as any[],
            // Tasks
            taskStates,
            tasksByDept,
            tasksByPeriodDept: (tasksByPeriodRows as any[]).map((r: any) => ({
                dept: r.dept,
                doneYear: toI(r.done_year), doneMonth: toI(r.done_month),
                doneWeek: toI(r.done_week), doneToday: toI(r.done_today),
                total: toI(r.total),
            })),
            planningThisMonth: (planningThisMonthRows as any[]).map((r: any) => ({
                title: r.title, state: r.state, difficulty: r.difficulty,
                due: r.dueDate, assignee: r.assignee, dept: r.dept,
            })),
            // Projects
            projects: (projectRows as any[]).map((r: any) => ({
                name: r.name, dept: r.dept,
                budget: toN(r.budget), revenue: toN(r.revenue),
                start: r.startDate, end: r.endDate,
                tasks: toI(r.tasks_total), tasksDone: toI(r.tasks_done),
                milestones: toI(r.milestones_total), milestonesDone: toI(r.milestones_done),
            })),
            pendingMilestones: milestoneRows as any[],
            // Tickets
            ticketStats,
            ticketByDept: ticketDeptRows as any[],
            ticketOverdue: toI((ticketOverdueRows as any)[0]?.count),
            // Meetings
            meetingStats: meetingStatsRows as any[],
            upcomingMeetings: upcomingMeetingRows as any[],
            // HR
            sanctionSummary: sanctionSummaryRows as any[],
            recentSanctions: recentSanctionRows as any[],
            formations: formationRows as any[],
            entretiens: entretienRows as any[],
            bizExpStatus: bizExpRows as any[],
            bizExpByDept: bizExpByDeptRows as any[],
            // Payroll
            payrollHistory: (payrollRows as any[]).map((r: any) => ({
                period: `${r.year}-${String(r.month).padStart(2,'0')}`,
                status: r.status, gross: toN(r.totalGross), net: toN(r.totalNet),
                employerCharges: toN(r.totalEmployerCharges),
            })),
            latestPayslips: latestPayslipRows as any[],
            // Accounting
            fiscalYears: (fiscalYearRows as any[]).map((r: any) => ({
                name: r.name, status: r.status, start: r.startDate, end: r.endDate,
            })),
            accountBalances: accountBalanceRows as any[],
            taxDeclarations: taxDecRows as any[],
            journalSummary: (journalRows as any[])[0] ?? {},
            // Suppliers
            suppliers: supplierRows as any[],
            supplierOverdue: { count: toI((supplierOverdueRows as any)[0]?.count), total: toN((supplierOverdueRows as any)[0]?.total) },
            // Fund movements
            fundSummary: fundSummaryRows as any[],
            fundRecent: fundRecentRows as any[],
            // Commercial
            leadStages,
            leadStatuses,
            deptTargets: deptTargetRows as any[],
            deptGoals: deptGoalRows as any[],
            commercialGoals: commercialGoalRows as any[],
            // Rankings
            topPerformers: (topEmpRows as any[]).map((r: any) => ({
                name: r.name, dept: r.dept,
                total: toI(r.total), completed: toI(r.completed),
                rate: toI(r.total) > 0 ? Math.round((toI(r.completed) / toI(r.total)) * 100) : 0,
            })),
            eomSnapshot: eomSnapshot.map((r: any) => ({
                rank: r.rank, name: r.name, dept: r.dept, position: r.position,
                points: toI(r.points), tasksCompleted: toI(r.tasksCompleted), tasksReviewed: toI(r.tasksReviewed),
            })),
            eomPeriod,
            liveTop: (liveTopRows as any[]).map((r: any, i: number) => ({
                rank: i + 1, name: r.name, dept: r.dept, position: r.position, tasksDone: toI(r.tasks_done),
            })),
            // Team
            deptDetails: (deptDetailRows as any[]).map((r: any) => ({
                dept: r.dept, headcount: toI(r.headcount), members: r.members || '',
            })),
            employeeDetails: (employeeDetailRows as any[]).map((r: any) => ({
                name: `${r.firstName} ${r.lastName}`,
                email: r.email ?? 'N/A', phone: r.phoneNumber ?? 'N/A',
                dept: r.dept ?? 'N/A', position: r.position ?? 'N/A', role: r.role ?? 'N/A',
                hireDate: r.hireDate ? new Date(r.hireDate).toLocaleDateString('fr-FR') : 'N/A',
                birthDate: r.birthDate ? new Date(r.birthDate).toLocaleDateString('fr-FR') : 'N/A',
                address: r.address ?? 'N/A',
                skills: (() => { try { const s = typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills; return Array.isArray(s) ? s.join(', ') : (r.skills ?? ''); } catch { return r.skills ?? ''; } })(),
                salary: toN(r.salary),
                tasksDone: toI(r.tasks_done), tasksTotal: toI(r.tasks_total),
            })),
            newHires: (newHireRows as any[]).map((r: any) => ({ period: r.period, count: toI(r.count) })),
            // Demands
            demandStatus,
            demandPeriod: (demandPeriodRows as any[])[0] ?? {},
            // Carwash
            carwashSummary: (carwashSummaryRows as any[])[0] ?? {},
            carwashByStation: carwashByStationRows as any[],
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SYSTEM PROMPT BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    private buildSystemPrompt(ctx: Record<string, any>): string {
        const fmt = (n: number) =>
            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n);
        const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : 'N/A';
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : 'N/A';
        const now = new Date();
        const monthName = now.toLocaleString('fr-FR', { month: 'long' });

        // Finance helpers
        const deptRevLines = (rows: any[]) => rows.length > 0
            ? rows.map((r: any) => `    ${r.dept}: ${fmt(parseFloat(r.total))}`).join('\n')
            : '    Aucune donnée';

        // Monthly breakdown (12 months)
        const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        const revMap: Record<number, number> = {};
        for (const r of ctx.revByMonth as any[]) revMap[parseInt(r.month)] = parseFloat(r.revenue);
        const expMap: Record<number, number> = {};
        for (const r of ctx.expByMonth as any[]) expMap[parseInt(r.month)] = parseFloat(r.total);
        const monthlyLines = months.map((m, i) => {
            const rev = revMap[i + 1] ?? 0;
            const exp = expMap[i + 1] ?? 0;
            return `    ${m}: CA ${fmt(rev)} | Charges ${fmt(exp)} | Résultat ${fmt(rev - exp)}`;
        }).join('\n');

        // Clients
        const clientLines = (ctx.clientRevenue as any[]).slice(0, 20).map((r: any) =>
            `    ${r.client} (${r.type||'N/A'}, ${r.dept||'N/A'}): facturé ${fmt(parseFloat(r.paid))} payé | ${fmt(parseFloat(r.pending))} en attente | ${r.invoices} facture(s)`
        ).join('\n');

        // Tasks
        const taskTotal = Object.values(ctx.taskStates as Record<string, number>).reduce((a, b) => a + b, 0);
        const taskStateLines = Object.entries(ctx.taskStates as Record<string, number>)
            .map(([s, c]) => `    ${s}: ${c}`).join('\n');
        const taskDeptLines = Object.entries(ctx.tasksByDept as Record<string, Record<string, number>>)
            .map(([dept, states]) => {
                const total = Object.values(states).reduce((a, b) => a + b, 0);
                const done = states['COMPLETED'] ?? 0;
                return `    ${dept}: ${total} total | ${done} terminées (${pct(done, total)})`;
            }).join('\n');
        const taskPeriodLines = ctx.tasksByPeriodDept.map((r: any) =>
            `    ${r.dept}: aujourd'hui ${r.doneToday} | semaine ${r.doneWeek} | mois ${r.doneMonth} | année ${r.doneYear} (/${r.total})`
        ).join('\n');
        const planningLines = ctx.planningThisMonth.length > 0
            ? ctx.planningThisMonth.slice(0, 25).map((t: any) =>
                `    [${t.state}] "${t.title}" — ${t.assignee||'N/A'} (${t.dept||'N/A'}) — échéance ${fmtDate(t.due)}`
              ).join('\n')
            : '    Aucune tâche ce mois-ci';

        // Projects
        const projectLines = ctx.projects.slice(0, 15).map((p: any) =>
            `    "${p.name}" (${p.dept||'N/A'}) | budget ${fmt(p.budget)} | tâches ${p.tasksDone}/${p.tasks} | jalons ${p.milestonesDone}/${p.milestones}`
        ).join('\n');
        const milestoneLines = (ctx.pendingMilestones as any[]).length > 0
            ? (ctx.pendingMilestones as any[]).map((m: any) =>
                `    "${m.title}" (${m.project}) — échéance ${fmtDate(m.dueDate)}`
              ).join('\n')
            : '    Aucun jalon en retard';

        // Tickets
        const openTickets = (ctx.ticketByDept as any[]).reduce((a: number, r: any) => a + parseInt(r.count), 0);
        const ticketDeptLines = (ctx.ticketByDept as any[]).map((r: any) =>
            `    ${r.dept||'N/A'}: ${r.count} ticket(s) ouvert(s)`
        ).join('\n');

        // Meetings
        const upcomingLines = (ctx.upcomingMeetings as any[]).length > 0
            ? (ctx.upcomingMeetings as any[]).map((m: any) =>
                `    ${fmtDate(m.date)} ${m.startTime||''} — "${m.title}" (${m.type}) — ${m.location||'N/A'}`
              ).join('\n')
            : '    Aucune réunion à venir';

        // HR
        const sanctionLines = (ctx.sanctionSummary as any[]).map((r: any) =>
            `    ${r.dept||'N/A'} — ${r.type} (${r.severity}): ${r.count}`
        ).join('\n') || '    Aucune sanction';
        const recentSanctionLines = (ctx.recentSanctions as any[]).map((r: any) =>
            `    ${fmtDate(r.date)} — ${r.employee} (${r.dept||'N/A'}): ${r.type} / ${r.severity} — ${r.reason||'N/A'}`
        ).join('\n') || '    Aucune sanction récente';
        const formationLines = (ctx.formations as any[]).map((r: any) =>
            `    ${r.employee} (${r.dept||'N/A'}): "${r.title}" chez ${r.organization||'N/A'} | ${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}`
        ).join('\n') || '    Aucune formation récente';
        const entretienLines = (ctx.entretiens as any[]).map((r: any) =>
            `    ${r.type} [${r.status}]: ${r.count}`
        ).join('\n') || '    Aucun entretien';
        const bizExpLines = (ctx.bizExpStatus as any[]).map((r: any) =>
            `    ${r.status}: ${r.count} note(s) — ${fmt(parseFloat(r.total))}`
        ).join('\n') || '    Aucune note de frais';
        const bizExpDeptLines = (ctx.bizExpByDept as any[]).map((r: any) =>
            `    ${r.dept}: ${fmt(parseFloat(r.total))} total | ${r.pending_count} en attente`
        ).join('\n') || '    Aucune donnée';

        // Payroll
        const payrollLines = ctx.payrollHistory.map((p: any) =>
            `    ${p.period} [${p.status}] — Brut ${fmt(p.gross)} | Net ${fmt(p.net)} | Charges patronales ${fmt(p.employerCharges)}`
        ).join('\n') || '    Aucune donnée';
        const payslipLines = (ctx.latestPayslips as any[]).map((r: any) =>
            `    ${r.name} (${r.dept||'N/A'}): brut ${fmt(parseFloat(r.grossSalary))} | net ${fmt(parseFloat(r.netSalary))} | déductions ${fmt(parseFloat(r.totalDeductions))}`
        ).join('\n') || '    Aucune fiche de paie';

        // Accounting
        const fyLines = ctx.fiscalYears.map((f: any) =>
            `    ${f.name} [${f.status}]: ${f.start} → ${f.end}`
        ).join('\n') || '    Aucun exercice';
        const accountLines = (ctx.accountBalances as any[]).map((r: any) =>
            `    Classe ${r.class}: Débit ${fmt(parseFloat(r.total_debit))} | Crédit ${fmt(parseFloat(r.total_credit))} | Solde ${fmt(parseFloat(r.balance))}`
        ).join('\n') || '    Aucune donnée comptable';
        const taxLines = (ctx.taxDeclarations as any[]).map((r: any) =>
            `    ${r.type} [${r.status}] — Période ${r.period} | Échéance ${fmtDate(r.dueDate)} | Montant ${fmt(parseFloat(r.totalAmount))}`
        ).join('\n') || '    Aucune déclaration fiscale';
        const jrn = ctx.journalSummary;
        const journalLine = `${jrn.total||0} écritures (${jrn.validated||0} validées, ${jrn.draft||0} brouillons)`;

        // Suppliers
        const supplierLines = (ctx.suppliers as any[]).slice(0, 15).map((r: any) =>
            `    ${r.name}: ${r.invoice_count} facture(s) | Facturé ${fmt(parseFloat(r.total_invoiced))} | Dû ${fmt(parseFloat(r.owed))}`
        ).join('\n') || '    Aucun fournisseur';

        // Fund movements
        const fundSumLines = (ctx.fundSummary as any[]).map((r: any) =>
            `    ${r.type}: ${r.count} mouvement(s) — ${fmt(parseFloat(r.total))}`
        ).join('\n') || '    Aucun mouvement de fonds';
        const fundRecentLines = (ctx.fundRecent as any[]).map((r: any) =>
            `    ${fmtDate(r.date)} [${r.type}] ${fmt(parseFloat(r.amount))} — ${r.description}`
        ).join('\n') || '    Aucun mouvement récent';

        // Commercial
        const leadStageLines = Object.entries(ctx.leadStages as Record<string, any>)
            .map(([s, v]: [string, any]) => `    ${s}: ${v.count} lead(s) — potentiel ${fmt(v.potential)}`).join('\n');
        const leadStatusLines = Object.entries(ctx.leadStatuses as Record<string, any>)
            .map(([s, v]: [string, any]) => `    ${s}: ${v.count} — ${fmt(v.potential)}`).join('\n');
        const totalLeads = Object.values(ctx.leadStages as Record<string, any>).reduce((a: number, v: any) => a + v.count, 0);
        const wonLeads = ctx.leadStages['GAGNE']?.count ?? 0;
        const lostLeads = ctx.leadStages['PERDU']?.count ?? 0;

        const deptTargetLines = (ctx.deptTargets as any[]).map((r: any) =>
            `    ${r.dept} - Mois ${r.month}: objectif ${fmt(parseFloat(r.targetRevenue))} | réel ${fmt(parseFloat(r.actual))} (${pct(parseFloat(r.actual), parseFloat(r.targetRevenue))})`
        ).join('\n') || '    Aucun objectif mensuel défini';
        const deptGoalLines = (ctx.deptGoals as any[]).map((r: any) =>
            `    ${r.dept}: objectif annuel ${fmt(parseFloat(r.targetRevenue))} | réalisé ${fmt(parseFloat(r.currentRevenue))} (${pct(parseFloat(r.currentRevenue), parseFloat(r.targetRevenue))})`
        ).join('\n') || '    Aucun objectif annuel défini';

        // Rankings
        const topPerfLines = ctx.topPerformers.map((e: any) =>
            `    ${e.name} (${e.dept}): ${e.completed}/${e.total} tâches — ${e.rate}%`
        ).join('\n') || '    Aucune donnée';
        const eomLabel = ctx.eomPeriod ? `Dernier classement officiel (${ctx.eomPeriod})` : 'Dernier classement officiel';
        const eomLines = ctx.eomSnapshot.length > 0
            ? ctx.eomSnapshot.map((e: any) =>
                `    #${e.rank} ${e.name} (${e.dept}) — ${e.points} pts | ${e.tasksCompleted} complétées | ${e.tasksReviewed} évaluées`
              ).join('\n')
            : '    Aucun classement enregistré';
        const liveTopLines = ctx.liveTop.length > 0
            ? ctx.liveTop.map((e: any) =>
                `    #${e.rank} ${e.name} (${e.dept||'N/A'}): ${e.tasksDone} tâche(s) ce mois`
              ).join('\n')
            : '    Aucune tâche complétée ce mois';

        // Team
        const deptTeamLines = ctx.deptDetails.map((d: any) =>
            `    ${d.dept} (${d.headcount} emp.): ${d.members || 'aucun membre actif'}`
        ).join('\n') || '    Aucune donnée';
        const newHireLines = ctx.newHires.length > 0
            ? ctx.newHires.map((r: any) => `    ${r.period}: ${r.count} embauche(s)`).join('\n')
            : '    Aucune embauche récente';
        const empDetailLines = ctx.employeeDetails.map((e: any) => {
            const taskInfo = e.tasksTotal > 0 ? `${e.tasksDone}/${e.tasksTotal} tâches` : 'aucune tâche';
            const skillInfo = e.skills ? ` | Compétences: ${e.skills}` : '';
            const salaryInfo = e.salary > 0 ? ` | Salaire: ${fmt(e.salary)}` : '';
            return `    • ${e.name} | Poste: ${e.position} | Dept: ${e.dept} | Email: ${e.email} | Tél: ${e.phone} | Embauché: ${e.hireDate} | Naissance: ${e.birthDate} | Adresse: ${e.address}${salaryInfo}${skillInfo} | ${taskInfo}`;
        }).join('\n') || '    Aucune donnée';

        // Demands
        const demandStatusLines = Object.entries(ctx.demandStatus as Record<string, number>)
            .map(([s, c]) => `    ${s}: ${c}`).join('\n') || '    Aucune demande';
        const dp = ctx.demandPeriod;
        const demandPeriodLine = `Aujourd'hui: ${dp.today_count??0} | Semaine: ${dp.week_count??0} | Mois: ${dp.month_count??0} | Année: ${dp.year_count??0}`;

        // Carwash
        const cw = ctx.carwashSummary;
        const carwashSummaryLine = cw.days_tracked > 0
            ? `30 derniers jours (${fmtDate(cw.from_date)}→${fmtDate(cw.to_date)}): CA ${fmt(parseFloat(cw.total_revenue))} | Charges ${fmt(parseFloat(cw.total_expenses))} | ${cw.total_vehicles} véhicules | ${cw.days_tracked} jours`
            : 'Aucune donnée carwash';
        const carwashStationLines = (ctx.carwashByStation as any[]).map((r: any) =>
            `    ${r.stationName||'Station'}: CA ${fmt(parseFloat(r.revenue))} | ${r.vehicles} véhicules | charges ${fmt(parseFloat(r.expenses))}`
        ).join('\n') || '    Aucune donnée par station';

        return `Tu es un assistant intelligent de MyLIS (Management Information System). Tu réponds UNIQUEMENT en français, de façon concise et professionnelle. Tu n'inventes jamais de données. Si une information n'est pas dans le contexte ci-dessous, dis-le clairement. Tu peux filtrer par département, employé ou période en utilisant les données disponibles.

╔══════════════════════════════════════════════════════════════╗
  RÉSUMÉ EXÉCUTIF — ${ctx.year}
╚══════════════════════════════════════════════════════════════╝
• Effectif actif: ${ctx.employees} employé(s) | ${ctx.departments.length} département(s) | ${ctx.clients} client(s)
• CA annuel: ${fmt(ctx.revYear)} | CA mensuel: ${fmt(ctx.revMonth)} | CA semaine: ${fmt(ctx.revWeek)} | CA aujourd'hui: ${fmt(ctx.revToday)}
• Charges annuelles: ${fmt(ctx.expYear)} | Charges mensuel: ${fmt(ctx.expMonth)}
• Bénéfice net annuel estimé: ${fmt(ctx.revYear - ctx.expYear)}
• Factures en attente: ${ctx.pendingCount} — ${fmt(ctx.pendingTotal)}
• Fournisseurs — factures en retard: ${ctx.supplierOverdue.count} — ${fmt(ctx.supplierOverdue.total)}

╔══════════════════════════════════════════════════════════════╗
  FINANCE — REVENUS (par département)
╚══════════════════════════════════════════════════════════════╝
Année ${ctx.year}:
${deptRevLines(ctx.revDeptYear)}
Mois en cours (${monthName}):
${deptRevLines(ctx.revDeptMonth)}
Semaine en cours:
${deptRevLines(ctx.revDeptWeek)}
Aujourd'hui:
${deptRevLines(ctx.revDeptToday)}

╔══════════════════════════════════════════════════════════════╗
  FINANCE — CHARGES (par département)
╚══════════════════════════════════════════════════════════════╝
Année ${ctx.year}:
${deptRevLines(ctx.expDeptYear)}
Mois en cours:
${deptRevLines(ctx.expDeptMonth)}
Semaine en cours:
${deptRevLines(ctx.expDeptWeek)}
Aujourd'hui:
${deptRevLines(ctx.expDeptToday)}

╔══════════════════════════════════════════════════════════════╗
  FINANCE — ÉVOLUTION MENSUELLE ${ctx.year}
╚══════════════════════════════════════════════════════════════╝
${monthlyLines}

╔══════════════════════════════════════════════════════════════╗
  CLIENTS — REVENUS GÉNÉRÉS
╚══════════════════════════════════════════════════════════════╝
${clientLines || '    Aucune donnée'}

╔══════════════════════════════════════════════════════════════╗
  TÂCHES — GLOBAL
╚══════════════════════════════════════════════════════════════╝
Total: ${taskTotal} tâche(s)
${taskStateLines}

Par département:
${taskDeptLines}

Tâches complétées par période et département:
${taskPeriodLines}

╔══════════════════════════════════════════════════════════════╗
  PLANNING — ${monthName.toUpperCase()} ${ctx.year}
╚══════════════════════════════════════════════════════════════╝
${planningLines}

╔══════════════════════════════════════════════════════════════╗
  PROJETS
╚══════════════════════════════════════════════════════════════╝
${projectLines || '    Aucun projet'}

Jalons en attente:
${milestoneLines}

╔══════════════════════════════════════════════════════════════╗
  TICKETS
╚══════════════════════════════════════════════════════════════╝
Tickets ouverts: ${openTickets} | En retard: ${ctx.ticketOverdue}
Par département:
${ticketDeptLines || '    Aucun ticket'}

╔══════════════════════════════════════════════════════════════╗
  RÉUNIONS
╚══════════════════════════════════════════════════════════════╝
Prochaines réunions:
${upcomingLines}

╔══════════════════════════════════════════════════════════════╗
  DEMANDES D'ACHAT
╚══════════════════════════════════════════════════════════════╝
Par statut:
${demandStatusLines}
Nouvelles demandes — ${demandPeriodLine}

╔══════════════════════════════════════════════════════════════╗
  EMPLOYÉ DU MOIS & CLASSEMENT
╚══════════════════════════════════════════════════════════════╝
${eomLabel}:
${eomLines}

Classement provisoire — ${monthName} ${ctx.year}:
${liveTopLines}

Meilleurs taux de complétion (global):
${topPerfLines}

╔══════════════════════════════════════════════════════════════╗
  ÉQUIPE — PAR DÉPARTEMENT
╚══════════════════════════════════════════════════════════════╝
${deptTeamLines}

Embauches récentes (12 mois):
${newHireLines}

╔══════════════════════════════════════════════════════════════╗
  FICHES EMPLOYÉS (détails individuels)
╚══════════════════════════════════════════════════════════════╝
${empDetailLines}

╔══════════════════════════════════════════════════════════════╗
  RH — SANCTIONS
╚══════════════════════════════════════════════════════════════╝
Récapitulatif:
${sanctionLines}
Sanctions récentes (6 mois):
${recentSanctionLines}

╔══════════════════════════════════════════════════════════════╗
  RH — FORMATIONS
╚══════════════════════════════════════════════════════════════╝
${formationLines}

╔══════════════════════════════════════════════════════════════╗
  RH — ENTRETIENS & ÉVALUATIONS
╚══════════════════════════════════════════════════════════════╝
${entretienLines}

╔══════════════════════════════════════════════════════════════╗
  RH — NOTES DE FRAIS
╚══════════════════════════════════════════════════════════════╝
Par statut:
${bizExpLines}
Par département:
${bizExpDeptLines}

╔══════════════════════════════════════════════════════════════╗
  PAIE & CHARGES SOCIALES
╚══════════════════════════════════════════════════════════════╝
Historique (6 mois):
${payrollLines}
Dernière fiche de paie par employé:
${payslipLines}

╔══════════════════════════════════════════════════════════════╗
  COMPTABILITÉ
╚══════════════════════════════════════════════════════════════╝
Exercices fiscaux:
${fyLines}
Journaux: ${journalLine}
Soldes par classe de compte (SYSCOHADA):
${accountLines}
Déclarations fiscales:
${taxLines}

╔══════════════════════════════════════════════════════════════╗
  FOURNISSEURS
╚══════════════════════════════════════════════════════════════╝
${supplierLines}

╔══════════════════════════════════════════════════════════════╗
  MOUVEMENTS DE FONDS (${ctx.year})
╚══════════════════════════════════════════════════════════════╝
Résumé annuel:
${fundSumLines}
Derniers mouvements:
${fundRecentLines}

╔══════════════════════════════════════════════════════════════╗
  COMMERCIAL — PIPELINE
╚══════════════════════════════════════════════════════════════╝
Total leads: ${totalLeads} | Gagnés: ${wonLeads} | Perdus: ${lostLeads}
Par étape:
${leadStageLines || '    Aucun lead'}
Par statut:
${leadStatusLines || '    Aucune donnée'}

╔══════════════════════════════════════════════════════════════╗
  COMMERCIAL — OBJECTIFS PAR DÉPARTEMENT
╚══════════════════════════════════════════════════════════════╝
Objectifs annuels:
${deptGoalLines}
Objectifs mensuels vs réel (${ctx.year}):
${deptTargetLines}

╔══════════════════════════════════════════════════════════════╗
  LIS CARWASH — 30 DERNIERS JOURS
╚══════════════════════════════════════════════════════════════╝
${carwashSummaryLine}
Par station:
${carwashStationLines}

══════════════════════════════════════════════════════════════
Pour les montants, utilise toujours le format XAF.
Sois concis mais complet. Si l'utilisateur demande un filtre (ex: "pour le département X", "cette semaine", "cet employé"), utilise les données de la section appropriée.`;
    }
}
