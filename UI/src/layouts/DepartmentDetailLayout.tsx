import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Code,
    Palette,
    Megaphone,
    DollarSign,
    Heart,
    PieChart as PieChartIcon,
    Loader2
} from 'lucide-react';
import DepartmentDetailSidebar, { type DepartmentTab } from '../components/DepartmentDetailSidebar';
import Header from '../components/Header';
import DepartmentDetail from '../pages/DepartmentDetail';
import { useDepartments } from '../api/departments/hooks';

export interface DeptEmployee {
    id: number | string;
    name: string;
    role: string;
    avatar: string;
}

export interface DeptProject {
    id: number | string;
    name: string;
    status: string;
    progress: number;
}

export interface Department {
    id: number | string;
    name: string;
    head: DeptEmployee;
    employees: DeptEmployee[];
    projects: DeptProject[];
    budget: number;
    color: string;
    icon: typeof Code;
}

const DepartmentDetailLayout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<DepartmentTab>('overview');

    const { data: apiDepartments, isLoading } = useDepartments();

    const DEPT_COLORS = ['#33cbcc', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];
    const DEPT_ICONS = [Code, Palette, Megaphone, DollarSign, Heart, PieChartIcon];

    const DEPARTMENTS: Department[] = (apiDepartments || []).map((d, i) => ({
        id: d.id,
        name: d.name,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
        icon: DEPT_ICONS[i % DEPT_ICONS.length],
        head: d.head
            ? { id: d.head.id, name: `${d.head.firstName} ${d.head.lastName}`, role: '', avatar: d.head.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.head.firstName + '+' + d.head.lastName)}&background=33cbcc&color=fff` }
            : { id: 0, name: '\u2014', role: '', avatar: '' },
        employees: d.employees?.map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            role: e.position?.title || '',
            avatar: e.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.firstName + '+' + e.lastName)}&background=33cbcc&color=fff`,
        })) || [],
        projects: d.projects?.map((p) => ({
            id: p.id,
            name: p.name,
            status: 'active',
            progress: 0,
        })) || [],
        budget: 0,
    }));

    const department = DEPARTMENTS.find(d => String(d.id) === id);

    useEffect(() => {
        if (!isLoading && !department) {
            navigate('/departments');
        }
    }, [isLoading, department, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (!department) {
        return null;
    }

    return (
        <div className="flex h-screen bg-blue-100 overflow-hidden">
            <DepartmentDetailSidebar
                department={department}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
                    <div className="container mx-auto px-6 py-8">
                        <DepartmentDetail department={department} activeTab={activeTab} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DepartmentDetailLayout;
