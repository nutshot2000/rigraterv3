import React, { useState } from 'react';
import { useApp, Page } from '../context/AppContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import AdminTopbar from '../components/admin/AdminTopbar';
import ProductWorkspace from '../components/admin/ProductWorkspace';
import BlogManagement from '../components/admin/BlogManagement';
// import { BlogWorkspace } from '../components/admin/BlogWorkspace';
import AIChatModal from '../components/admin/AIChatModal';
import CommandPalette from '../components/admin/CommandPalette';
import { BlogPost } from '../types';
import BlogEditorModal from '../components/admin/BlogEditorModal';

export const AdminPage: React.FC = () => {
    const { page, setPage, currentUserEmail } = useApp();
    const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);

    const handleCreateNewPost = () => {
        setEditingPost({}); // Start with a new, empty post object
    };

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post);
    };

    const handleCloseEditor = () => {
        setEditingPost(null);
    };

    const handlePostSaved = () => {
        setEditingPost(null);
        // The BlogManagement component will auto-refresh its list
    };
    
    return (
        <div className="flex h-screen bg-slate-900 text-white">
            <AdminSidebar currentPage={page} onNavigate={setPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminTopbar />
                <main className="flex-1 overflow-y-auto">
                    {page === Page.ADMIN_PRODUCTS && <ProductWorkspace />}
                    {page === Page.ADMIN_BLOG && (
                        <BlogManagement 
                            onCreate={handleCreateNewPost}
                            onEdit={handleEditPost}
                        />
                    )}
                </main>
            </div>
            
            {editingPost && (
                <BlogEditorModal
                    user={{ id: 'admin', email: currentUserEmail || 'admin@rigrater.com' }}
                    post={editingPost}
                    onSave={handlePostSaved}
                    onClose={handleCloseEditor}
                />
            )}

            <AIChatModal />
            <CommandPalette />
        </div>
    );
};

export default AdminPage;