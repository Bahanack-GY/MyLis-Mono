import type { ComponentType } from 'react';
import { useIsAdmin } from '../hooks/useRoleAccess';

interface RolePageSwitchProps {
    adminComponent: ComponentType;
    employeeComponent: ComponentType;
}

export const RolePageSwitch = ({ adminComponent: Admin, employeeComponent: Employee }: RolePageSwitchProps) => {
    const isAdmin = useIsAdmin();
    return isAdmin ? <Admin /> : <Employee />;
};
