import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BlogPost } from '../types';
import { fetchBlogPosts } from '../services/blogService';
import { FALLBACK_IMAGE_URL } from '../constants';

const BlogPage: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPosts = async () => {
            try {
                setLoading(true);
                const fetchedPosts = await fetchBlogPosts();
                setPosts(fetchedPosts || []);
            } catch (err: any) {
                console.error('Error loading blog posts:', err);
                // If backend is not configured or there are no posts, just show empty state
                setError(null);
                setPosts([]);
            } finally {
                setLoading(false);
            }
        };

        loadPosts();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                <p className="mt-4 text-slate-400">Loading blog posts...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Blog</h1>
                <p className="text-slate-400">{error}</p>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Blog | RIGRATER - PC Hardware Reviews & Tech Insights</title>
                <meta name="description" content="Read the latest PC hardware reviews, tech insights, and gaming peripheral guides from RIGRATER." />
                <link rel="canonical" href="https://www.rigrater.tech/blog" />
            </Helmet>

            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4">Tech Blog</h1>
                    <p className="text-xl text-slate-400">Latest reviews, insights, and guides</p>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg">No blog posts yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts
                          .filter(p => (p.status || 'published') === 'published')
                          .map((post) => (
                            <Link
                                key={post.id}
                                to={`/blog/${post.slug}`}
                                className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-sky-500 transition-all duration-300 hover:transform hover:scale-105"
                            >
                                <div className="aspect-video w-full overflow-hidden bg-slate-900">
                                    <img
                                        src={post.coverImageUrl ? `/api/proxy-image?url=${encodeURIComponent(post.coverImageUrl)}` : FALLBACK_IMAGE_URL}
                                        alt={post.title}
                                        className="w-full h-full object-contain"
                                        loading="lazy"
                                        onError={(e) => {
                                            const img = e.currentTarget as HTMLImageElement;
                                            if (post.coverImageUrl && (img as any)._triedDirect !== true) {
                                                (img as any)._triedDirect = true;
                                                img.src = post.coverImageUrl; // try direct URL
                                            } else {
                                                img.src = FALLBACK_IMAGE_URL; // final fallback
                                            }
                                        }}
                                    />
                                </div>
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">{post.title}</h2>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-3">{post.summary}</p>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                        {post.tags && post.tags.length > 0 && (
                                            <span className="text-sky-400">#{post.tags[0]}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default BlogPage;
