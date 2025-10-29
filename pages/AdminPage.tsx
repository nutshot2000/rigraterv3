import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { AdminSidebar, AdminMode } from '../components/admin/AdminSidebar';
import { ProductWorkspace } from '../components/admin/ProductWorkspace';
import ProductPreview from '../components/admin/ProductPreview';
import SimpleProductBuilder from '../components/admin/SimpleProductBuilder';
import ProductManagement from '../components/admin/ProductManagement';
import { BlogWorkspace } from '../components/admin/BlogWorkspace';
import BlogManagement from '../components/admin/BlogManagement';
import { BlogPreview } from '../components/admin/BlogPreview';
import { IdeasModal } from '../components/admin/IdeasModal';
import { Product, BlogPost } from '../types';
import AdminLogin from '../components/admin/AdminLogin';
import AdminTopbar from '../components/admin/AdminTopbar';

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

    // Keyboard shortcuts: Ctrl+Shift+P (AI Product), Ctrl+Shift+B (AI Blog), Ctrl+N (New in current list)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                setMode('ai_product');
            } else if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
                setMode('ai_blog');
            } else if ((e.ctrlKey || (e as any).metaKey) && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                if (mode === 'manage_posts') {
                    setCurrentBlogPost({
                        title: '', slug: '', summary: '', content: '', cover_image_url: '', tags: [], seo_title: '', seo_description: '', blog_images: []
                    } as any);
                    setMode('ai_blog');
                } else if (mode === 'manage_products') {
                    setMode('ai_product');
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode]);

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
                return <ProductManagement />;
            case 'manage_posts':
                return (
                    <BlogManagement 
                        onEdit={(post) => {
                            setCurrentBlogPost(post);
                            setMode('ai_blog');
                        }}
                        onCreate={() => {
                            setCurrentBlogPost({
                                title: '',
                                slug: '',
                                summary: '',
                                content: '',
                                cover_image_url: '',
                                tags: [],
                                seo_title: '',
                                seo_description: '',
                                blog_images: []
                            } as any);
                            setMode('ai_blog');
                        }}
                    />
                );
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
            <main className="flex-1 flex flex-col overflow-hidden">
                <AdminTopbar 
                    mode={mode}
                    onCreateNew={() => {
                        if (mode === 'manage_posts') {
                            setCurrentBlogPost({ title: '', slug: '', summary: '', content: '', cover_image_url: '', tags: [], seo_title: '', seo_description: '', blog_images: [] } as any);
                            setMode('ai_blog');
                        } else if (mode === 'manage_products') {
                            setMode('ai_product');
                        }
                    }}
                    onNavigate={(m) => setMode(m)}
                />
                <div className="flex-1 flex overflow-hidden">
                    {renderWorkspace()}
                </div>
            </main>
            <IdeasModal 
                isOpen={isIdeasModalOpen} 
                onClose={() => setIsIdeasModalOpen(false)} 
            />
        </div>
    );
};

export default AdminPage;