import React, { useState } from 'react';
import { useApp, Page } from '../context/AppContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import AdminTopbar from '../components/admin/AdminTopbar';
import ProductManagement from '../components/admin/ProductManagement';
import SimpleProductBuilder from '../components/admin/SimpleProductBuilder';
import BlogManagement from '../components/admin/BlogManagement';
// import { BlogWorkspace } from '../components/admin/BlogWorkspace';
import AIChatModal from '../components/admin/AIChatModal';
import CommandPalette, { CommandItem } from '../components/admin/CommandPalette';
import { BlogPost } from '../types';
import BlogEditorModal from '../components/admin/BlogEditorModal';
import AdminSettings from '../components/admin/AdminSettings';

const normalizeImageUrl = (val?: string): string => {
    if (!val) return '';
    const s = val.trim();
    if (!s) return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('//')) return `https:${s}`;
    if (s.startsWith('/images/')) return `https://m.media-amazon.com${s}`;
    // Filename-only (common for Amazon assets like 81J3QqVGRPL._AC_SL1500_.jpg)
    if (/^[A-Za-z0-9][A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/i.test(s)) {
        return `https://m.media-amazon.com/images/I/${s}`;
    }
    return s;
};

export const AdminPage: React.FC = () => {
    const { page, setPage, currentUserEmail, addBlogPost, updateBlogPost } = useApp();
    const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    const commands: CommandItem[] = [
        { id: 'go-products', title: 'Go to Manage Products', shortcut: 'G P', run: () => setPage(Page.ADMIN_MANAGE_PRODUCTS) },
        { id: 'go-blog', title: 'Go to Manage Posts', shortcut: 'G B', run: () => setPage(Page.ADMIN_MANAGE_POSTS) },
        { id: 'go-settings', title: 'Go to Settings', shortcut: 'G S', run: () => setPage(Page.ADMIN) },
    ];

    const handleCreateNewPost = () => {
        setEditingPost({}); // Start with a new, empty post object
    };

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post);
    };

    const handleCloseEditor = () => {
        setEditingPost(null);
    };

    const handleSavePost = (draft: Partial<BlogPost>) => {
        try {
            if (draft.id) {
                // This is an UPDATE
                const postToUpdate: BlogPost = {
                    id: String(draft.id),
                    createdAt: draft.createdAt || new Date().toISOString(),
                    title: draft.title || '',
                    slug: draft.slug || '',
                    coverImageUrl: normalizeImageUrl(draft.coverImageUrl),
                    summary: draft.summary || '',
                    content: draft.content || '',
                    tags: Array.isArray(draft.tags) ? draft.tags : [],
                    blogImages: Array.isArray(draft.blogImages) ? draft.blogImages : [],
                    seoTitle: draft.seoTitle || '',
                    seoDescription: draft.seoDescription || '',
                };
                updateBlogPost(postToUpdate);
            } else {
                // This is a CREATE
                const postToCreate: Omit<BlogPost, 'id' | 'createdAt'> = {
                    title: draft.title || '',
                    slug: draft.slug || (draft.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                    coverImageUrl: normalizeImageUrl(draft.coverImageUrl),
                    summary: draft.summary || '',
                    content: draft.content || '',
                    tags: Array.isArray(draft.tags) ? draft.tags : [],
                    blogImages: Array.isArray(draft.blogImages) ? draft.blogImages : [],
                    seoTitle: draft.seoTitle || '',
                    seoDescription: draft.seoDescription || '',
                };
                addBlogPost(postToCreate);
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
                    {page === Page.ADMIN && <AdminSettings />}
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
            <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} commands={commands} />
        </div>
    );
};

export default AdminPage;