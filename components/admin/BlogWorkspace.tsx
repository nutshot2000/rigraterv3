import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost, User } from '../../types';
import { ArrowPathIcon, DocumentPlusIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { createBlogPost, updateBlogPostById } from '../../services/blogService';
import { EditableField } from './EditableField';
import { FALLBACK_IMAGE_URL } from '../../constants';
import BuyButtons from '../public/BuyButtons';

// Helper function to proxy image URLs
const getProxiedImageUrl = (url: string) => {
    if (!url) return FALLBACK_IMAGE_URL;
    if (url.startsWith('/api/proxy-image')) return url;
    
    // Handle Unsplash/Pexels search query formatting
    if (!url.startsWith('http') && !url.includes('.')) {
        // This is likely a search query, not a URL
        return `/api/proxy-image?url=${encodeURIComponent(`https://source.unsplash.com/featured/?${encodeURIComponent(url)}`)}`;
    }
    
    if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return url;
};

interface BlogWorkspaceProps {
  user: User;
  currentPost: Partial<BlogPost> | null;
  setCurrentPost: (post: Partial<BlogPost> | null) => void;
  onPostSaved: () => void;
}

export const BlogWorkspace: React.FC<BlogWorkspaceProps> = ({ user, currentPost, setCurrentPost, onPostSaved }) => {
  const [source, setSource] = useState('');
  const [buildType, setBuildType] = useState<'url' | 'topic'>('topic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [blogImages, setBlogImages] = useState<string[]>([]); // Array for additional blog images
  
  // Initialize blogImages from currentPost when it changes
  useEffect(() => {
    if (currentPost?.blog_images && Array.isArray(currentPost.blog_images)) {
      setBlogImages(currentPost.blog_images);
    } else {
      setBlogImages([]);
    }
  }, [currentPost?.id]); // Only reset when the post ID changes

  const handleGenerate = async () => {
    if (!source.trim()) {
      toast.error('Please enter a topic or URL.');
      return;
    }
    setIsLoading(true);
    toast.loading('Generating blog post with AI...');
    try {
      const response = await fetch('/api/ai/build-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, type: buildType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate blog post.');
      }

      const postData = await response.json();
      setCurrentPost({
        ...postData,
        author_id: user.id,
        published_at: new Date().toISOString(),
      });
      toast.dismiss();
      toast.success('Blog post generated successfully!');
    } catch (error: any) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message || 'An error occurred during generation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentPost) return;
    setIsSaving(true);
    toast.loading('Saving blog post...');
    try {
      const { id, ...postData } = currentPost;
      // Map field names to match service expectations
      const mappedPostData = {
        title: postData.title || '',
        slug: postData.slug || '',
        coverImageUrl: postData.cover_image_url || '',
        summary: postData.summary || '',
        content: postData.content || '',
        tags: postData.tags || [],
        blogImages: blogImages, // Add the array of additional images
        seoTitle: postData.seo_title || '', // Save SEO fields
        seoDescription: postData.seo_description || '',
      };
      const savedPost = id
        ? await updateBlogPostById(id, mappedPostData)
        : await createBlogPost(mappedPostData);
      
      setCurrentPost(savedPost);
      onPostSaved(); // This will refetch the list of posts in the parent
      toast.dismiss();
      toast.success(`Blog post ${id ? 'updated' : 'created'} successfully!`);
    } catch (error: any) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message || 'Failed to save blog post.');
    } finally {
      setIsSaving(false);
    }
  };

  // Simple, zero-API image suggestions using Unsplash search proxy queries
  const suggestImages = () => {
    if (!currentPost) return;
    const title = (currentPost.title || '').trim();
    if (!title) { toast.error('Add a title first'); return; }
    const lower = title.toLowerCase();
    const isComparison = /\bvs\b|\bversus\b|\//i.test(lower);
    let queries: string[] = [];
    if (isComparison) {
      // Split by common separators to extract compared items
      const parts = title.split(/\s+vs\.?\s+|\s*\/\s*|\s+versus\s+/i).map(p => p.trim()).filter(Boolean);
      const base = parts.slice(0, 4); // limit
      // Cover: generic comparison banner
      const cover = `${parts.join(' vs ')} product comparison side by side, studio lighting, white background`;
      queries.push(cover);
      // Gallery: one image per item
      base.forEach(p => {
        queries.push(`${p} product photo on white background, close-up`);
      });
    } else {
      const tags = Array.isArray(currentPost.tags) ? (currentPost.tags as any[]).join(' ') : '';
      const core = (title + ' ' + tags).trim();
      queries = [
        `${core} hero photo, studio lighting`,
        `${core} lifestyle photo`,
        `${core} close-up on white background`,
        `${core} macro detail`,
      ];
    }
    // Apply: first becomes cover, rest gallery (dedup empty)
    const [first, ...rest] = queries.filter(Boolean);
    if (first) updateField('cover_image_url', first);
    if (rest.length) {
      setBlogImages(rest);
      updateField('blog_images', rest);
    }
    toast.success('Suggested images added. You can tweak or replace any of them.');
  };

  const updateField = (field: keyof BlogPost, value: any) => {
    setCurrentPost({ ...currentPost, [field]: value });
  };
  
  const addBlogImage = () => {
    setBlogImages([...blogImages, '']);
  };

  const updateBlogImage = (index: number, value: string) => {
    const newImages = [...blogImages];
    newImages[index] = value;
    setBlogImages(newImages);
    // Also update in the current post object
    updateField('blog_images', newImages);
  };

  const removeBlogImage = (index: number) => {
    const newImages = blogImages.filter((_, i) => i !== index);
    setBlogImages(newImages);
    // Also update in the current post object
    updateField('blog_images', newImages);
  };

  const handleGenerateSeo = async () => {
    if (!currentPost) return;
    
    setIsGeneratingSeo(true);
    toast.loading('Generating SEO content...');
    
    try {
      const text = `${currentPost.title || ''}\n\n${currentPost.summary || ''}\n\n${(currentPost.content || '').slice(0, 800)}`;
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Generate an SEO title (max 60 chars) and an SEO description (max 155 chars) for the following blog post. Return a single JSON object with the keys "seo_title" and "seo_description", and nothing else.

Content:
${text}` })
      });
      
      if (!resp.ok) {
        throw new Error('The AI service failed to respond.');
      }
      
      const data = await resp.json();
      let seoData;
      
      try {
        const rawResponse = data.reply || '';
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON object found in the AI's response.");
        }
        seoData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('The AI returned an invalid format. Please try again.');
      }
      
      if (seoData?.seo_title) {
        updateField('seo_title', seoData.seo_title);
      }
      if (seoData?.seo_description) {
        updateField('seo_description', seoData.seo_description);
      }
      
      toast.dismiss();
      toast.success('SEO content generated!');
    } catch (error: any) {
      console.error('SEO generation error:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to generate SEO content');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  // Affiliate links helpers
  const extractAffiliateLinks = (content: string): string[] => {
    const m = content.match(/\[links\]([\s\S]*?)\[\/links\]/i);
    if (!m) return [];
    return m[1]
      .split(/\r?\n|,/) // newline or comma separated
      .map(s => s.trim())
      .filter(s => /^https?:\/\//i.test(s));
  };

  const injectAffiliateLinks = (content: string, links: string[]): string => {
    const block = links.length
      ? `\n\n[links]\n${links.join('\n')}\n[/links]\n\n`
      : '';
    if (/\[links\][\s\S]*?\[\/links\]/i.test(content)) {
      return content.replace(/\[links\][\s\S]*?\[\/links\]/i, block.trim() ? block : '');
    }
    return content + block;
  };

  const [affiliateLinksInput, setAffiliateLinksInput] = useState<string>('');

  useEffect(() => {
    const links = extractAffiliateLinks(currentPost?.content || '');
    setAffiliateLinksInput(links.join('\n'));
  }, [currentPost?.id]);

  const handleAffiliateLinksChange = (val: string) => {
    setAffiliateLinksInput(val);
    const links = val
      .split(/\r?\n|,/) 
      .map(s => s.trim())
      .filter(s => /^https?:\/\//i.test(s));
    const next = injectAffiliateLinks(currentPost?.content || '', links);
    updateField('content', next);
  };
  
  return (
    <div className="flex-1 flex flex-row bg-slate-900/50 overflow-hidden">
      {/* Left Pane: Editor */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white">Simple Editor</h2>
        {/* AI Assist (optional) */}
        <details className="form-section" open={false}>
          <summary>AI Assist (optional)</summary>
          <div className="form-section-content">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">AI Blog Post Builder</h3>
              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={() => setBuildType('topic')} 
                  className={`px-4 py-2 rounded-md text-sm font-medium ${buildType === 'topic' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                  From Topic
                </button>
                <button 
                  onClick={() => setBuildType('url')} 
                  className={`px-4 py-2 rounded-md text-sm font-medium ${buildType === 'url' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                  From URL
                </button>
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={buildType === 'topic' ? 'e.g., Best GPUs for 1440p Gaming' : 'https://example.com/article'}
                  className="input-blueprint flex-grow"
                  disabled={isLoading}
                />
                <button onClick={handleGenerate} className="btn-blueprint" disabled={isLoading}>
                  <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Generating...' : 'Generate'}</span>
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* Editor Form */}
        {currentPost && (
          <div className="space-y-6">
            <EditableField
              label="Title"
              value={currentPost.title || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="Catchy headline…"
            />
            <EditableField
              label="Slug"
              value={currentPost.slug || ''}
              onChange={(v) => updateField('slug', v)}
              placeholder="auto-generated if left blank"
            />
             <EditableField
              label="Summary"
              value={currentPost.summary || ''}
              onChange={(v) => updateField('summary', v)}
              isTextarea
              placeholder="1–2 sentences intro…"
            />
            <EditableField
              label="Content (Markdown)"
              value={currentPost.content || ''}
              onChange={(v) => updateField('content', v)}
              isTextarea
              rows={15}
              placeholder="Write your post… Use # for headings, **bold**, *italics*."
              helpText="Tip: Paste affiliate URLs in the Affiliate Links box below – they will render as buttons."
            />
            {/* Cover Image with Clear Button */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-grow">
                  <EditableField
                    label="Cover Image URL"
                    value={currentPost.cover_image_url || ''}
                    onChange={(v) => updateField('cover_image_url', v)}
                    helpText="Direct URL or a simple Unsplash/Pexels search query."
                    placeholder="https://… or e.g. rtx 5090 product photo"
                  />
                </div>
                <button
                  onClick={suggestImages}
                  className="btn-blueprint h-10 self-end"
                  title="Suggest Images"
                >
                  Suggest Images
                </button>
                {currentPost.cover_image_url && (
                  <button 
                    onClick={() => updateField('cover_image_url', '')} 
                    className="btn-blueprint-danger h-10 self-end"
                    title="Clear Image"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              {currentPost.cover_image_url && (
                <div className="mt-2">
                  <p className="text-sm text-slate-400 mb-2">Cover Image Preview:</p>
                  <img
                    src={getProxiedImageUrl(currentPost.cover_image_url)}
                    alt="Cover Preview"
                    className="max-h-40 object-cover rounded border border-slate-700"
                    onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE_URL)}
                  />
                </div>
              )}
            </div>
            
            {/* Additional Blog Images (advanced) */}
            <details className="form-section" open={false}>
              <summary>Additional Blog Images (optional)</summary>
              <div className="form-section-content">
                <div className="space-y-4">
                  {blogImages.map((image, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-grow">
                        <EditableField
                          label={`Image ${index + 1}`}
                          value={image}
                          onChange={(v) => updateBlogImage(index, v)}
                        />
                      </div>
                      <button 
                        onClick={() => removeBlogImage(index)}
                        className="btn-blueprint-danger h-10 self-end"
                        title="Remove Image"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Image Preview */}
                      {image && (
                        <img
                          src={getProxiedImageUrl(image)}
                          alt={`Image ${index + 1}`}
                          className="h-10 w-10 object-cover rounded border border-slate-700"
                          onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE_URL)}
                        />
                      )}
                    </div>
                  ))}
                  
                  <button 
                    onClick={addBlogImage} 
                    className="btn-blueprint flex gap-2 items-center"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Image
                  </button>
                </div>
              </div>
            </details>

            {/* SEO Section (advanced) */}
            <details className="form-section" open={false}>
                <summary>SEO Settings (optional)</summary>
                <div className="form-section-content">
                    <EditableField
                        label="SEO Title"
                        value={currentPost.seo_title || ''}
                        onChange={(v) => updateField('seo_title', v)}
                    />
                    <EditableField
                        label="SEO Description"
                        value={currentPost.seo_description || ''}
                        onChange={(v) => updateField('seo_description', v)}
                        isTextarea
                    />
                  <button
                    className="btn-blueprint mt-2"
                    onClick={handleGenerateSeo}
                    disabled={isGeneratingSeo}
                  >
                    {isGeneratingSeo ? 'Generating...' : 'Auto-generate SEO'}
                  </button>
                </div>
            </details>

            {/* Affiliate Links */}
            <details className="form-section" open>
              <summary>Affiliate Links</summary>
              <div className="form-section-content">
                <p className="text-sm text-slate-400 mb-2">Paste one Amazon URL per line. Buttons will appear in the post.</p>
                <textarea
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white h-28"
                  value={affiliateLinksInput}
                  onChange={(e) => handleAffiliateLinksChange(e.target.value)}
                  placeholder="https://www.amazon.com/dp/ASIN...\nhttps://www.amazon.co.uk/dp/ASIN..."
                />
              </div>
            </details>
            
            <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex justify-end gap-4 p-4">
              <button onClick={() => setCurrentPost(null)} className="btn-blueprint-danger">
                Clear
              </button>
              <button onClick={handleSave} className="btn-blueprint-primary" disabled={isSaving}>
                <DocumentPlusIcon className="h-5 w-5" />
                <span>{isSaving ? 'Saving...' : (currentPost.id ? 'Update Post' : 'Create Post')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="flex-1 border-l border-slate-700 overflow-y-auto">
        <div className="p-6 prose prose-invert prose-slate max-w-none">
          {currentPost ? (
            <>
              <h1>{currentPost.title || 'Untitled Post'}</h1>
              {currentPost.cover_image_url && (
                <img src={getProxiedImageUrl(currentPost.cover_image_url)} alt="Cover" className="rounded-lg" />
              )}
              {/* Render markdown without [links] block */}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {(currentPost.content || '').replace(/\[links\][\s\S]*?\[\/links\]/i, '').trim()}
              </ReactMarkdown>
              {/* Render affiliate buttons */}
              {extractAffiliateLinks(currentPost.content || '').length > 0 && (
                <div className="not-prose mt-6 flex flex-col gap-3">
                  {extractAffiliateLinks(currentPost.content || '').map((u, idx) => (
                    <BuyButtons key={idx} affiliateLink={u} productName={currentPost.title || 'Blog'} productCategory={'BLOG'} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Live preview will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
