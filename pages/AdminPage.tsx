import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { AdminSidebar, AdminMode } from '../components/admin/AdminSidebar';
import { ProductWorkspace } from '../components/admin/ProductWorkspace';
import ProductPreview from '../components/admin/ProductPreview';
import SimpleProductBuilder from '../components/admin/SimpleProductBuilder';
import { BlogWorkspace } from '../components/admin/BlogWorkspace';
import { BlogPreview } from '../components/admin/BlogPreview';
import { IdeasModal } from '../components/admin/IdeasModal';
import { Product, BlogPost } from '../types';
import AdminLogin from '../components/admin/AdminLogin';

export const AdminPage: React.FC = () => {
    const { isAuthenticated, currentUserEmail, logout } = useApp();
    const [mode, setMode] = useState<AdminMode>('ai_product');
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
    const [currentBlogPost, setCurrentBlogPost] = useState<Partial<BlogPost> | null>(null);
    const [refreshProducts, setRefreshProducts] = useState(false);
    const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);

    const handleProductSave = useCallback(() => {
        setRefreshProducts(prev => !prev);
    }, []);

    const handlePostSave = useCallback(() => {
        // Add logic to refresh post list if needed
    }, []);

    if (!isAuthenticated) {
        return <AdminLogin />;
    }

    const renderWorkspace = () => {
        switch (mode) {
            case 'ai_product':
                return (
                    <SimpleProductBuilder 
                        onProductBuilt={(product) => {
                            setCurrentProduct(product);
                            handleProductSave();
                        }}
                    />
                );
            case 'ai_blog':
                return (
                    <BlogWorkspace 
                        user={{ id: 'admin', email: currentUserEmail || 'admin@rigrater.com' }}
                        currentPost={currentBlogPost}
                        setCurrentPost={setCurrentBlogPost}
                        onPostSaved={handlePostSave}
                    />
                );
            case 'manage_products':
                return <h1 className="text-white p-8">Manage Products - Coming Soon</h1>;
            case 'manage_posts':
                return <h1 className="text-white p-8">Manage Blog Posts - Coming Soon</h1>;
            case 'settings':
                 return <h1 className="text-white p-8">Settings - Coming Soon</h1>;
            default:
                return null;
        }
    };
    
    const handleModeChange = (newMode: AdminMode) => {
        setMode(newMode);
        // Clear workspace when switching modes to avoid showing stale data
        setCurrentProduct(null);
        setCurrentBlogPost(null);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-slate-900 text-white">
            <AdminSidebar 
                mode={mode} 
                onModeChange={handleModeChange} 
                onLogout={logout}
                onOpenIdeas={() => setIsIdeasModalOpen(true)}
            />
            <main className="flex-1 flex overflow-hidden">
                {renderWorkspace()}
            </main>
            <IdeasModal 
                isOpen={isIdeasModalOpen} 
                onClose={() => setIsIdeasModalOpen(false)} 
            />
        </div>
    );
};

export default AdminPage;