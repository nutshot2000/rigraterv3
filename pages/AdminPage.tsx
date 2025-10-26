
import React from 'react';
import { useApp } from '../context/AppContext';
import AdminLogin from '../components/admin/AdminLogin';
import AdminDashboard from '../components/admin/AdminDashboard';

const AdminPage: React.FC = () => {
    const { isAuthenticated } = useApp();

    return (
        <div>
            {isAuthenticated ? <AdminDashboard /> : <AdminLogin />}
        </div>
    );
};

export default AdminPage;
