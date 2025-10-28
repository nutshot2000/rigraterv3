import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BlogPost } from '../types';
import { fetchBlogPostBySlug } from '../services/blogService';
import { FALLBACK_IMAGE_URL } from '../constants';

const BlogPostPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setError('No post specified');
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                setLoading(true);
                const p = await fetchBlogPostBySlug(slug);
                if (!p) {
                    setError('Post not found');
                } else {
                    setPost(p);
                }
            } catch (e: any) {
                setError(e.message || 'Failed to load post');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading Post…</div>;
    }

    if (error || !post) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Could Not Load Post</h1>
                <p className="text-slate-400 mb-6">{error}</p>
                <Link to="/blog" className="btn-blueprint btn-blueprint--primary">Back to Blog</Link>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{post.seoTitle || post.title} | RIGRATER Blog</title>
                <meta name="description" content={post.seoDescription || post.summary} />
            </Helmet>

            <article className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white leading-tight">{post.title}</h1>
                    <p className="text-slate-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>

                {post.coverImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-700 mb-8 bg-slate-800/50">
                        <img
                            src={`/api/proxy-image?url=${encodeURIComponent(post.coverImageUrl)}`}
                            alt={post.title}
                            className="w-full h-80 object-cover"
                            onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE_URL)}
                        />
                    </div>
                )}

                <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                    {post.content}
                </div>
            </article>
        </>
    );
};

export default BlogPostPage;
