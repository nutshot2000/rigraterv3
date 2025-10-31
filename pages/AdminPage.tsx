import React, { useState } from 'react';
import { useApp, Page } from '../context/AppContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import AdminTopbar from '../components/admin/AdminTopbar';
import ProductManagement from '../components/admin/ProductManagement';
import SimpleProductBuilder from '../components/admin/SimpleProductBuilder';
import BlogManagement from '../components/admin/BlogManagement';
// import { BlogWorkspace } from '../components/admin/BlogWorkspace';
import AIChatModal from '../components/admin/AIChatModal';
import CommandPalette from '../components/admin/CommandPalette';
import { BlogPost } from '../types';
import BlogEditorModal from '../components/admin/BlogEditorModal';

export const AdminPage: React.FC = () => {
    const { page, setPage, currentUserEmail, addBlogPost, updateBlogPost } = useApp();
    const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleCreateNewPost = () => {
        setEditingPost({}); // Start with a new, empty post object
    };

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post);
    };

    const handleCloseEditor = () => {
        setEditingPost(null);
    };

    const normalizeDraftForCreate = (draft: Partial<BlogPost>): Omit<BlogPost, 'id' | 'createdAt'> => ({
        title: draft.title || '',
        slug: draft.slug || (draft.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        coverImageUrl: draft.coverImageUrl || draft.cover_image_url || '',
        summary: draft.summary || '',
        content: draft.content || '',
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        blog_images: Array.isArray(draft.blog_images) ? draft.blog_images : [],
        seoTitle: draft.seoTitle || draft.seo_title || '',
        seoDescription: draft.seoDescription || draft.seo_description || '',
    });

    const normalizeDraftForUpdate = (draft: Partial<BlogPost>): BlogPost => ({
        id: String(draft.id),
        title: draft.title || '',
        slug: draft.slug || '',
        coverImageUrl: draft.coverImageUrl || draft.cover_image_url || '',
        cover_image_url: draft.cover_image_url || draft.coverImageUrl || '',
        summary: draft.summary || '',
        content: draft.content || '',
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        blog_images: Array.isArray(draft.blog_images) ? draft.blog_images : [],
        createdAt: draft.createdAt || new Date().toISOString(),
        seoTitle: draft.seoTitle || draft.seo_title || '',
        seo_title: draft.seo_title || draft.seoTitle || '',
        seoDescription: draft.seoDescription || draft.seo_description || '',
        seo_description: draft.seo_description || draft.seoDescription || '',
    });

    const handleSavePost = (draft: Partial<BlogPost>) => {
        try {
            if (draft.id) {
                updateBlogPost(normalizeDraftForUpdate(draft));
            } else {
                addBlogPost(normalizeDraftForCreate(draft));
            }
        } finally {
            setEditingPost(null);
        }
    };
    
    return (
        <div className="flex h-screen bg-slate-900 text-white">
            <AdminSidebar currentPage={page} onNavigate={setPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminTopbar onOpenChat={() => setIsChatOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                    {page === Page.ADMIN_AI_PRODUCT && (
                        <SimpleProductBuilder onProductBuilt={() => {}} />
                    )}
                    {page === Page.ADMIN_MANAGE_PRODUCTS && <ProductManagement />}
                    {(page === Page.ADMIN_AI_BLOG || page === Page.ADMIN_MANAGE_POSTS) && (
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
                    onSave={handleSavePost}
                    onClose={handleCloseEditor}
                />
            )}

            {isChatOpen && <AIChatModal onClose={() => setIsChatOpen(false)} />}
            <CommandPalette />
        </div>
    );
};

export default AdminPage;