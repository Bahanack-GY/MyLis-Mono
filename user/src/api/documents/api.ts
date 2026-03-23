import api from '../config';
import type { Document, CreateDocumentDto, UploadFileResponse } from './types';

export const documentsApi = {
    getAll: () =>
        api.get<Document[]>('/hr/documents').then(r => r.data),

    create: (dto: CreateDocumentDto) =>
        api.post<Document>('/hr/documents', dto).then(r => r.data),

    getStorageInfo: () =>
        api.get<{ totalBytes: number; fileCount: number }>('/hr/documents/storage').then(r => r.data),

    uploadFile: (file: File, folder: string) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<UploadFileResponse>(
            `/hr/documents/upload/${folder}`,
            formData,
            { headers: { 'Content-Type': undefined } },
        ).then(r => r.data);
    },
};
