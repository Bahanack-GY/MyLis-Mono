import { Outlet } from 'react-router-dom';

const EmbedLayout = () => {
    return (
        <div className="h-screen overflow-auto bg-gray-50/50">
            <div className="container mx-auto px-6 py-8">
                <Outlet />
            </div>
        </div>
    );
};

export default EmbedLayout;
