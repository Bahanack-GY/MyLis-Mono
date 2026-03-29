export type SaleStage = 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'CLOSING' | 'GAGNE' | 'PERDU';
export type LeadStatus = 'NOUVEAU' | 'CONTACTE' | 'QUALIFIE' | 'PROPOSITION_ENVOYEE' | 'NEGOCIATION' | 'GAGNE' | 'PERDU' | 'EN_ATTENTE';
export type LeadType = 'PROSPECT' | 'CLIENT_EXISTANT' | 'RECOMMANDATION' | 'APPEL_ENTRANT' | 'SALON' | 'SITE_WEB' | 'RESEAU_SOCIAL' | 'PARTENAIRE';
export type LeadPriority = 'HOT' | 'WARM' | 'COLD';
export type ActivityType = 'VISITE_CLIENT' | 'VISITE_PROSPECT' | 'APPEL' | 'EMAIL' | 'REUNION' | 'DEMO' | 'RELANCE' | 'AUTRE';
export type ActivityStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CHEQUE' | 'VIREMENT' | 'ESPECES' | 'MOBILE_MONEY' | 'CARTE' | 'AUTRE';
export type HealthStatus = 'HEALTHY' | 'GOOD' | 'NEEDS_FOLLOWUP' | 'ATTENTION_NEEDED' | 'AT_RISK' | 'NEW';

export interface LeadContact {
    id: string;
    leadId: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
    order: number;
}

export interface LeadNeed {
    id: string;
    leadId: string;
    description: string;
    serviceId?: string | null;
    service?: { id: string; name: string; price?: number };
}

export interface CreateLeadContactDto {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
}

export interface CreateLeadNeedDto {
    description: string;
    serviceId?: string | null;
}

export interface Lead {
    id: string;
    code: string;
    company: string;
    activitySector: string;
    clientNeeds: string;
    potentialRevenue: number;
    source: string;
    country: string;
    region: string;
    city: string;
    commune: string;
    postalCode: string;
    address: string;
    paymentDelay: number;
    contact1Name: string;
    contact1Role: string;
    contact1Email: string;
    contact1Phone: string;
    contact2Name: string;
    contact2Role: string;
    contact2Email: string;
    contact2Phone: string;
    assignedToId: string | null;
    assignedTo?: { id: string; firstName: string; lastName: string };
    competitor: string;
    competitorOffer: string;
    successRate: number;
    priority: LeadPriority;
    saleStage: SaleStage;
    leadType: LeadType;
    leadStatus: LeadStatus;
    lossReason: string;
    lastAction: string;
    lastActionDate: string;
    lastActionResult: string;
    nextAction: string;
    nextActionDeadline: string;
    comment: string;
    clientId: string | null;
    client?: { id: string; name: string };
    convertedAt: string | null;
    activities?: LeadActivity[];
    contacts?: LeadContact[];
    needs?: LeadNeed[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateLeadDto {
    company: string;
    activitySector?: string;
    clientNeeds?: string;
    potentialRevenue?: number;
    source?: string;
    country?: string;
    region?: string;
    city?: string;
    commune?: string;
    postalCode?: string;
    address?: string;
    paymentDelay?: number;
    contact1Name?: string;
    contact1Role?: string;
    contact1Email?: string;
    contact1Phone?: string;
    contact2Name?: string;
    contact2Role?: string;
    contact2Email?: string;
    contact2Phone?: string;
    assignedToId?: string;
    competitor?: string;
    competitorOffer?: string;
    successRate?: number;
    priority?: LeadPriority;
    saleStage?: SaleStage;
    leadType?: LeadType;
    leadStatus?: LeadStatus;
    lossReason?: string;
    lastAction?: string;
    lastActionDate?: string;
    lastActionResult?: string;
    nextAction?: string;
    nextActionDeadline?: string;
    comment?: string;
    contacts?: CreateLeadContactDto[];
    needs?: CreateLeadNeedDto[];
}

export interface LeadActivity {
    id: string;
    leadId: string;
    lead?: { id: string; code: string; company: string };
    employeeId: string;
    employee?: { id: string; firstName: string; lastName: string };
    type: ActivityType;
    activityStatus: ActivityStatus;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
    result: string;
    nextAction: string;
    cost: number;
    location: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLeadActivityDto {
    leadId?: string;
    clientId?: string;
    employeeId?: string;
    type: ActivityType;
    activityStatus?: ActivityStatus;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    result?: string;
    nextAction?: string;
    nextActionDeadline?: string;
    cost?: number;
    location?: string;
}

export interface ClientPayment {
    id: string;
    invoiceId: string;
    invoice?: { id: string; invoiceNumber: string; total: number; status: string };
    clientId: string;
    client?: { id: string; name: string };
    amount: number;
    date: string;
    reference: string;
    method: PaymentMethod;
    notes: string;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentDto {
    invoiceId: string;
    clientId: string;
    amount: number;
    date: string;
    reference?: string;
    method: PaymentMethod;
    notes?: string;
    createdByUserId?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
}

export interface LeadStats {
    totalLeads: number;
    byStage: Record<SaleStage, { count: number; value: number }>;
    byStatus: Record<LeadStatus, number>;
    bySource: Record<string, number>;
    revenueTrend: { month: string; revenue: number }[];
    totalPipelineValue: number;
    weightedPipelineValue: number;
    wonCount: number;
    lostCount: number;
    winRate: number;
    conversionRate: number;
    averageDealSize: number;
}

export interface CommercialKpis {
    totalVisites: number;
    visitesClients: number;
    visitesProspects: number;
    coutVisites: number;
    chiffreAffaire: number;
    panierMoyen: number;
    margeParVisite: number;
    nouveauxClients: number;
    tauxAcquisition: number;
    pipelineValue: number;
    weightedPipeline: number;
    winRate: number;
    conversionRate: number;
    totalActivities: number;
}

export interface ClientStatementRow {
    type: 'invoice' | 'payment';
    dateFacture: string;
    numeroFacture: string;
    datePaiement: string | null;
    refPaiement: string | null;
    produitsServices: string | null;
    quantite: number | null;
    montantFacture: number;
    montantPaiement: number;
    solde: number;
}

export interface ClientStatement {
    client: { id: string; name: string };
    rows: ClientStatementRow[];
    totals: { factures: number; paiements: number; solde: number };
}

export interface SalesSummaryItem {
    clientId: string;
    clientName: string;
    factures: number;
    paiements: number;
    solde: number;
}

export interface SalesSummary {
    clients: SalesSummaryItem[];
    totals: { factures: number; paiements: number; solde: number };
}

// ── Commercial Goals ──

export interface CommercialGoal {
    id: string;
    employeeId: string;
    year: number;
    month: number;
    targetAmount: number;
}

export interface SetGoalDto {
    employeeId: string;
    year: number;
    month: number;
    targetAmount: number;
}

/** One row in the manager's team-performance view */
export interface CommercialPerformance {
    employeeId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    /** null = no goal set yet */
    targetAmount: number | null;
    actualCA: number;
    /** null = no goal set; capped at 999 */
    progress: number | null;
}

/** Returned by GET /commercial-goals/my */
export interface MyGoal {
    targetAmount: number | null;
    actualCA: number;
    progress: number | null;
    year: number;
    month: number;
}

// ── Client Follow-Up ──

export type HealthStatus = 'HEALTHY' | 'GOOD' | 'NEEDS_FOLLOWUP' | 'ATTENTION_NEEDED' | 'AT_RISK' | 'NEW';

export interface ClientHealthMetrics {
    clientId: string;
    lastContactDate: string | null;
    daysSinceLastContact: number | null;
    activitiesLast30Days: number;
    totalActivities: number;
    healthStatus: HealthStatus;
}

export interface ActivitySummary {
    totalActivities: number;
    lastActivityDate: string | null;
    activityBreakdown: Record<ActivityType, number>;
}

export interface ClientActivitiesReport {
    clientId: string;
    activities: LeadActivity[];
    summary: ActivitySummary;
}
