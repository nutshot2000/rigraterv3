import React, { useState, useEffect } from 'react';
import { BlogPost, User } from '../../types';
import { ArrowPathIcon, DocumentPlusIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { createBlogPost, updateBlogPostById } from '../../services/blogService';
import { EditableField } from './EditableField';
import { FALLBACK_IMAGE_URL } from '../../constants';

// Helper function to proxy image URLs
const getProxiedImageUrl = (url: string) => {
    if (!url) return FALLBACK_IMAGE_URL;
    if (url.startsWith('/api/proxy-image')) return url;
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
        body: JSON.stringify({ message: `Generate:
SEO Title (<=60 chars)
SEO Description (<=155 chars)
for this blog post content. Return JSON { seo_title, seo_description } only.\n\n${text}` })
      });
      
      if (!resp.ok) {
        throw new Error('Failed to generate SEO content');
      }
      
      const data = await resp.json();
      let seoData;
      
      // Try to parse the response as JSON
      try {
        const jsonText = (data.response || '').replace(/```json|```/g, '').trim();
        seoData = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse AI response', e);
        throw new Error('Invalid response format');
      }
      
      if (seoData?.seo_title) updateField('seo_title', seoData.seo_title);
      if (seoData?.seo_description) updateField('seo_description', seoData.seo_description);
      
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
  
  return (
    <div className="flex-1 flex flex-col bg-slate-900/50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Builder UI */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">AI Blog Post Builder</h2>
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

        {/* Editor Form */}
        {currentPost && (
          <div className="space-y-6">
            <EditableField
              label="Title"
              value={currentPost.title || ''}
              onChange={(v) => updateField('title', v)}
            />
            <EditableField
              label="Slug"
              value={currentPost.slug || ''}
              onChange={(v) => updateField('slug', v)}
            />
             <EditableField
              label="Summary"
              value={currentPost.summary || ''}
              onChange={(v) => updateField('summary', v)}
              isTextarea
            />
            <EditableField
              label="Content (Markdown)"
              value={currentPost.content || ''}
              onChange={(v) => updateField('content', v)}
              isTextarea
              rows={15}
            />
            {/* Cover Image with Clear Button */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-grow">
                  <EditableField
                    label="Cover Image URL"
                    value={currentPost.cover_image_url || ''}
                    onChange={(v) => updateField('cover_image_url', v)}
                    helpText="This can be a direct URL or an Unsplash/Pexels search query from the AI."
                  />
                </div>
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
            
            {/* Additional Blog Images */}
            <details className="form-section" open>
              <summary>Additional Blog Images</summary>
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

            {/* SEO Section */}
            <details className="form-section" open>
                <summary>SEO Settings</summary>
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
            
            <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
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
  );
};
