import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BlogPost } from '../../types';

interface BlogManagementProps {
    onEdit: (post: BlogPost) => void;
    onCreate: () => void;
}

const formatDate = (iso?: string) => {
    try {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString();
    } catch { return ''; }
};

const BlogManagement: React.FC<BlogManagementProps> = ({ onEdit, onCreate }) => {
    const { blogPosts, deleteBlogPost, addToast } = useApp();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return blogPosts;
        return blogPosts.filter(p =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.slug || '').toLowerCase().includes(q) ||
            (p.summary || '').toLowerCase().includes(q) ||
            (Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '').includes(q)
        );
    }, [query, blogPosts]);

    const handleDelete = (id: string) => {
        if (!id) return;
        const ok = window.confirm('Delete this post? This cannot be undone.');
        if (!ok) return;
        try {
            deleteBlogPost(id);
            addToast('Post deleted', 'success');
        } catch {
            addToast('Failed to delete post', 'error');
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-900/70">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <h1 className="text-2xl font-bold text-white">Manage Blog Posts</h1>
                    <div className="flex gap-3">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by title, slug, tags..."
                            className="input-blueprint w-full md:w-80"
                        />
                        <button onClick={onCreate} className="btn-blueprint btn-blueprint--primary">New Post</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-800/80 text-slate-300">
                            <tr>
                                <th className="text-left px-4 py-3">Title</th>
                                <th className="text-left px-4 py-3">Slug</th>
                                <th className="text-left px-4 py-3">Tags</th>
                                <th className="text-left px-4 py-3">Created</th>
                                <th className="text-right px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No posts found.</td>
                                </tr>
                            )}
                            {filtered.map(post => (
                                <tr key={post.id} className="border-t border-slate-700/60 hover:bg-slate-800/40 cursor-pointer" onClick={() => onEdit(post)}>
                                    <td className="px-4 py-3 text-white">{post.title}</td>
                                    <td className="px-4 py-3 text-slate-300">{post.slug}</td>
                                    <td className="px-4 py-3 text-slate-300">{Array.isArray(post.tags) ? post.tags.join(', ') : ''}</td>
                                    <td className="px-4 py-3 text-slate-300">{formatDate(post.createdAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex gap-2">
                                            <button className="btn-blueprint" onClick={(e) => { e.stopPropagation(); onEdit(post); }}>Edit</button>
                                            <button className="btn-blueprint-danger" onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BlogManagement;


