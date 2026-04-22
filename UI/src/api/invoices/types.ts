export type InvoiceStatus = 'CREATED' | 'SENT' | 'PAID' | 'REJECTED';

export interface CustomColumn {
    id: string;
    label: string;
}

export interface InvoiceItem {
    id?: string;
    invoiceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    metadata?: Record<string, string> | null;
}

export type InvoiceType = 'PROFORMA' | 'INVOICE' | 'ACOMPTE';

export interface Invoice {
    id: string;
    invoiceNumber: string | null;
    proformaNumber: string | null;
    acompteNumber: string | null;
    acompteAmount: number | null;
    parentInvoiceId: string | null;
    type: InvoiceType;
    status: InvoiceStatus;
    projectId: string;
    departmentId: string;
    clientId: string;
    createdById: string;
    issueDate: string;
    dueDate: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes?: string;
    paidAt?: string;
    sentAt?: string;
    createdAt: string;
    updatedAt: string;
    customColumns?: CustomColumn[] | null;
    project?: { id: string; name: string; budget?: number };
    department?: { id: string; name: string };
    client?: { id: string; name: string };
    createdBy?: { id: string; email: string };
    parentInvoice?: { id: string; invoiceNumber: string | null; total: number } | null;
    items: InvoiceItem[];
}

export interface CreateInvoiceDto {
    type?: InvoiceType;
    projectId: string;
    departmentId: string;
    clientId: string;
    issueDate?: string;
    dueDate: string;
    taxRate?: number;
    notes?: string;
    customColumns?: CustomColumn[];
    items: { description: string; quantity: number; unitPrice: number; metadata?: Record<string, string> }[];
}

export type UpdateInvoiceDto = Partial<CreateInvoiceDto>;

export interface InvoiceTemplate {
    id: string;
    departmentId: string;
    companyName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
    footerText?: string;
    bankInfo?: string;
}

export interface UpsertInvoiceTemplateDto {
    companyName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
    footerText?: string;
    bankInfo?: string;
}

export interface InvoiceStats {
    total: number;
    totalRevenue: number;
    totalPending: number;
    overdue: number;
    countByStatus: {
        CREATED: number;
        SENT: number;
        PAID: number;
        REJECTED: number;
    };
}
