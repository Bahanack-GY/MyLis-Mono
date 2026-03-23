import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ClientDetailSidebar, { type ClientTab } from '../components/ClientDetailSidebar';
import Header from '../components/Header';
import ClientDetail from '../pages/ClientDetail';
import { useClient } from '../api/clients/hooks';
import { useInvoices } from '../api/invoices/hooks';
import { useProjectsByClient } from '../api/projects/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';

export interface ClientData {
    id: string;
    name: string;
    type: 'one_time' | 'subscription';
    projectDescription: string;
    price: string;
    srs: string;
    contract: string;
    departmentId: string;
    department: string;
    totalPaid: number;
    totalPending: number;
    overdueCount: number;
    invoices: {
        id: string;
        invoiceNumber: string;
        status: string;
        total: number;
        issueDate: string;
        dueDate: string;
        paidAt?: string;
        project?: string;
        items: { description: string; quantity: number; unitPrice: number; amount: number }[];
    }[];
    projects: {
        id: string;
        name: string;
        description: string;
        budget: number;
        revenue: number;
        startDate?: string;
        endDate?: string;
        tasks?: { id: string; state: string }[];
        members?: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
    }[];
}

const ClientDetailLayout = () => {
    const { id } = useParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<ClientTab>('overview');
    const deptScope = useDepartmentScope();

    const { data: apiClient, isLoading: isLoadingClient } = useClient(id || '');
    const { data: apiInvoices, isLoading: isLoadingInvoices } = useInvoices(deptScope);
    const { data: apiProjects, isLoading: isLoadingProjects } = useProjectsByClient(id || '');

    const isLoading = isLoadingClient || isLoadingInvoices || isLoadingProjects;

    const clientInvoices = useMemo(() => {
        if (!apiInvoices || !id) return [];
        return apiInvoices.filter(inv => inv.clientId === id);
    }, [apiInvoices, id]);

    if (isLoading) {
        return (
            <div className="flex h-screen bg-blue-100 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (!apiClient) {
        return <Navigate to="/clients" replace />;
    }

    const totalPaid = clientInvoices
        .filter(i => i.status === 'PAID')
        .reduce((s, i) => s + Number(i.total), 0);
    const totalPending = clientInvoices
        .filter(i => i.status !== 'PAID' && i.status !== 'REJECTED')
        .reduce((s, i) => s + Number(i.total), 0);
    const overdueCount = clientInvoices
        .filter(i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < new Date())
        .length;

    const client: ClientData = {
        id: apiClient.id,
        name: apiClient.name,
        type: apiClient.type,
        projectDescription: apiClient.projectDescription || '',
        price: apiClient.price || '',
        srs: apiClient.srs || '',
        contract: apiClient.contract || '',
        departmentId: apiClient.departmentId,
        department: apiClient.department?.name || '',
        totalPaid,
        totalPending,
        overdueCount,
        invoices: clientInvoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            total: Number(inv.total),
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            paidAt: inv.paidAt,
            project: inv.project?.name,
            items: inv.items || [],
        })),
        projects: (apiProjects || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            budget: p.budget || 0,
            revenue: p.revenue || 0,
            startDate: p.startDate,
            endDate: p.endDate,
            tasks: p.tasks,
            members: p.members,
        })),
    };

    return (
        <div className="flex h-screen bg-blue-100 overflow-hidden">
            <ClientDetailSidebar
                client={client}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
                    <div className="container mx-auto px-6 py-8">
                        <ClientDetail client={client} activeTab={activeTab} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ClientDetailLayout;
