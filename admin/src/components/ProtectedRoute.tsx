import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../api/auth/types';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
    children?: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading, role } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        localStorage.removeItem('access_token');
        return <Navigate to="/login" state={{ accessDenied: true }} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
