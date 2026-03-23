export type DocumentCategory = 'CONTRACT' | 'ID' | 'DIPLOMA' | 'OTHER';

export interface Document {
    id: string;
    name: string;
    description: string;
    filePath: string;
    fileType: string;
    category: DocumentCategory;
    uploadedById: string;
    employeeId: string;
    uploadedBy?: { id: string; email: string };
    employee?: { id: string; firstName: string; lastName: string };
}

export interface CreateDocumentDto {
    name: string;
    description?: string;
    filePath: string;
    fileType: string;
    category?: DocumentCategory;
    employeeId?: string;
}

export interface UploadFileResponse {
    filePath: string;
    fileName: string;
    fileType: string;
    size: number;
}
