import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '../../types';
import { FALLBACK_IMAGE_URL } from '../../constants';
import { CalendarIcon, UserCircleIcon } from '@heroicons/react/24/solid';

interface BlogPreviewProps {
  post: Partial<BlogPost> | null;
}

export const BlogPreview: React.FC<BlogPreviewProps> = ({ post }) => {
  if (!post) {
    return (
      <div className="w-[400px] flex-shrink-0 bg-slate-900 border-l border-slate-700/50 flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">Blog Post Preview</h3>
          <p className="text-slate-400 mt-2">
            Generate a blog post or start typing in the workspace to see a live preview here.
          </p>
        </div>
      </div>
    );
  }

  const { title, content, cover_image_url, published_at } = post;
  
  const formattedDate = published_at ? new Date(published_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric' 
  }) : "Just now";

  return (
    <div className="w-[400px] flex-shrink-0 bg-slate-900 border-l border-slate-700/50 overflow-y-auto">
      <div className="p-1">
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <img 
            src={cover_image_url || FALLBACK_IMAGE_URL} 
            alt={title || 'Blog Post Cover'} 
            className="w-full h-48 object-cover" 
            onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE_URL)}
          />
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-4">{title || 'Untitled Post'}</h1>
            
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                <div className="flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5" />
                    <span>Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{formattedDate}</span>
                </div>
            </div>
            
            <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-strong:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || 'Start writing your blog post content...'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* SEO PREVIEW */}
        <div className="mt-4 bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">SEO Preview</h3>
            <div className="bg-slate-900 p-3 rounded-md">
                <p className="text-blue-500 text-lg truncate">{post.seo_title || title || 'SEO Title Preview'}</p>
                <p className="text-green-500 text-sm">https://rigrater.com/blog/{post.slug || 'your-post-slug'}</p>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{post.seo_description || post.summary || 'This is how your SEO description will appear on search engine results pages. Keep it concise and compelling.'}</p>
            </div>
        </div>
      </div>
    </div>
  );
};
