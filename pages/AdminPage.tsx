import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AdminLogin from '../components/admin/AdminLogin';
import SimpleProductBuilder from '../components/admin/SimpleProductBuilder';
import { Product } from '../types';

const AdminPage: React.FC = () => {
    const { isAuthenticated, logout } = useApp();
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    if (!isAuthenticated) {
        return <AdminLogin />;
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-900">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
                <h1 className="text-2xl font-bold text-white">Admin - Build Products</h1>
                <button
                    onClick={logout}
                    className="btn-blueprint"
                >
                    Logout
                </button>
            </div>
            <SimpleProductBuilder onProductBuilt={setCurrentProduct} />
        </div>
    );
};

export default AdminPage;