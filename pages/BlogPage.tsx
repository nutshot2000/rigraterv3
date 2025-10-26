import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const BlogPage: React.FC = () => {
    const { blogPosts } = useApp();
    const [openSlug, setOpenSlug] = useState<string | null>(null);
    const current = useMemo(() => blogPosts.find(b => b.slug === openSlug) || null, [openSlug, blogPosts]);

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Blog</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogPosts.map(post => (
                    <article key={post.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:bg-gray-700/50 transition cursor-pointer" onClick={() => setOpenSlug(post.slug)}>
                        {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="w-full h-40 object-cover" loading="lazy" />}
                        <div className="p-4">
                            <h2 className="text-xl font-semibold text-white">{post.title}</h2>
                            <p className="text-gray-400 text-sm mt-1">{post.summary}</p>
                            <div className="mt-2 text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</div>
                        </div>
                    </article>
                ))}
            </div>

            {current && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpenSlug(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                        {current.coverImageUrl && <img src={current.coverImageUrl} alt={current.title} className="w-full h-60 object-cover" loading="lazy" />}
                        <div className="p-6">
                            <h2 className="text-3xl font-bold text-white">{current.title}</h2>
                            <div className="prose prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(current.content || '') as string) }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlogPage;

