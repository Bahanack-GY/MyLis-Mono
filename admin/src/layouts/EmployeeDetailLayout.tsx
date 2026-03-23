import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import EmployeeDetailSidebar, { type EmployeeTab } from '../components/EmployeeDetailSidebar';
import Header from '../components/Header';
import EmployeeDetail, { type EmployeeUI } from '../pages/EmployeeDetail';
import { useEmployees } from '../api/employees/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';

const EmployeeDetailLayout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<EmployeeTab>('infos');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const deptScope = useDepartmentScope();

    const { data: apiEmployees, isLoading } = useEmployees(deptScope);

    const employeesData: EmployeeUI[] = (apiEmployees || []).map((emp, i) => ({
        ...emp,
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.position?.title || '',
        avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`,
        stats: { projects: 0, done: 0, progress: 0 },
        productivity: 0,
        birthDate: emp.birthDate || undefined,
        hireDate: emp.hireDate,
        address: emp.address,
        salary: emp.salary,
        phone: emp.phoneNumber,
        email: emp.user?.email || 'N/A',
        departmentId: emp.departmentId,
        department: emp.department,
        skills: emp.skills || [],
        educationDocs: emp.educationDocs || [],
        recruitmentDocs: emp.recruitmentDocs || [],
        color: i % 2 === 0 ? '#33cbcc' : '#283852',
    }));

    const currentEmployee = employeesData.find(e => String(e.id) === id);
    
    // Get team members from the same department (excluding current employee)
    const teamMembers = currentEmployee 
        ? employeesData
            .filter(e => e.departmentId === currentEmployee.departmentId && e.id !== currentEmployee.id)
            .slice(0, 8) // Limit to 8 team members
        : [];

    useEffect(() => {
        // Only navigate if we're done loading AND still haven't found the employee
        if (!isLoading && apiEmployees && !currentEmployee) {
            navigate('/employees');
        }
    }, [isLoading, apiEmployees, currentEmployee, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (!currentEmployee) {
        return null;
    }

    return (
        <div className="flex h-screen bg-blue-100 overflow-hidden">
            <EmployeeDetailSidebar
                employee={currentEmployee}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
                    <div className="container mx-auto px-6 py-8">
                        <EmployeeDetail employee={currentEmployee} activeTab={activeTab} teamMembers={teamMembers} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EmployeeDetailLayout;
