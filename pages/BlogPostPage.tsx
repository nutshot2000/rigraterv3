import React from 'react';
import { BlogPost } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface BlogPostPageProps {
    post: BlogPost;
    onBack: () => void;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ post, onBack }) => {
    const sanitizedHtml = DOMPurify.sanitize(marked.parse(post.content || '') as string);

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="sticky top-20 z-10">
                <button onClick={onBack} className="btn-blueprint">
                    &larr; Back to All Posts
                </button>
            </div>
            <div className="h-6" />

            <article className="panel-blueprint p-6 md:p-8">
                {post.coverImageUrl && (
                    <div className="mb-8 rounded-lg overflow-hidden border border-slate-700">
                        <img src={post.coverImageUrl} alt={post.title} className="w-full h-auto object-cover" />
                    </div>
                )}
                
                <header className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{post.title}</h1>
                    <div className="text-sm text-slate-400">
                        <span>Published on {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                </header>
                
                <div 
                    className="prose prose-lg prose-invert max-w-none prose-headings:text-sky-300 prose-a:text-sky-300 hover:prose-a:text-sky-400 prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
                />
            </article>
        </div>
    );
};

export default BlogPostPage;
