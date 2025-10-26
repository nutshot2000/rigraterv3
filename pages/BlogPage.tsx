import React from 'react';
import { useApp } from '../context/AppContext';
import { BlogPost } from '../types';

interface BlogPageProps {
    onSelectPost: (post: BlogPost) => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onSelectPost }) => {
    const { blogPosts } = useApp();

    return (
        <div className="animate-fade-in">
            <header className="mb-10 text-center relative p-8 panel-blueprint">
                <h1 className="text-5xl md:text-7xl text-white leading-tight font-bold">
                    THE <span className="text-sky-300">RIGRATER</span> BLOG
                </h1>
                <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto">
                    AI-powered insights, reviews, and guides for PC hardware enthusiasts.
                </p>
            </header>

            {blogPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blogPosts.map(post => (
                        <BlogPostCard key={post.id} post={post} onSelectPost={onSelectPost} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 panel-blueprint">
                    <p className="text-slate-400 text-xl">No blog posts have been published yet.</p>
                </div>
            )}
        </div>
    );
};

interface BlogPostCardProps {
    post: BlogPost;
    onSelectPost: (post: BlogPost) => void;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, onSelectPost }) => {
    return (
        <div 
            className="bg-slate-900/50 rounded-lg overflow-hidden transition-all duration-300 group hover:scale-[1.02] border border-slate-800 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/10 cursor-pointer"
            onClick={() => onSelectPost(post)}
        >
            <div className="h-48 bg-slate-800/50 flex items-center justify-center overflow-hidden">
                <img 
                    src={post.coverImageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div className="p-4 bg-slate-900">
                <h3 className="text-lg font-bold text-white line-clamp-2 mb-2 h-14">{post.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-3 mb-4 h-16">{post.summary}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-sky-400 group-hover:underline">Read More →</span>
                </div>
            </div>
        </div>
    )
}

export default BlogPage;

