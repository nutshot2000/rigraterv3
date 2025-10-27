
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AdminLogin from '../components/admin/AdminLogin';
import AdminSidebar, { AdminMode } from '../components/admin/AdminSidebar';
import ProductWorkspace from '../components/admin/ProductWorkspace';
import ProductPreview from '../components/admin/ProductPreview';
import { Product } from '../types';

const AdminPage: React.FC = () => {
    const { isAuthenticated, logout } = useApp();
    const [mode, setMode] = useState<AdminMode>('ai_url');
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);


    if (!isAuthenticated) {
        return <AdminLogin />;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            <div className="w-64 flex-shrink-0">
                <AdminSidebar mode={mode} setMode={setMode} onLogout={logout} />
            </div>
            <main className="flex-1 p-8 overflow-y-auto">
                <ProductWorkspace 
                    mode={mode}
                    currentProduct={currentProduct} 
                    setCurrentProduct={setCurrentProduct} 
                />
            </main>
            <aside className="w-96 flex-shrink-0 bg-slate-900/50 p-6 border-l border-slate-700/50">
                <ProductPreview product={currentProduct} />
            </aside>
        </div>
    );
};

export default AdminPage;
