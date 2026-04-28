import { Navigate, Outlet } from 'react-router-dom';
import { Loading02Icon } from 'hugeicons-react';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute = ({ children }: { children?: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loading02Icon className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default PublicRoute;
