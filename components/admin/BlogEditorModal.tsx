import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, User, Product } from '../../types';
import { XMarkIcon, DocumentPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateBlogPost } from '../../services/geminiService'; // Assuming you have this service
import { useApp } from '../../context/AppContext';

// Inserter Menu Component
const InserterMenu: React.FC<{ onInsert: (type: 'image' | 'product' | 'button') => void }> = ({ onInsert }) => (
    <div className="absolute z-10 bg-slate-700 rounded-md shadow-lg p-2 flex gap-2">
        <button onClick={() => onInsert('image')} className="p-2 hover:bg-slate-600 rounded">Image</button>
        <button onClick={() => onInsert('product')} className="p-2 hover:bg-slate-600 rounded">Product</button>
        <button onClick={() => onInsert('button')} className="p-2 hover:bg-slate-600 rounded">Button</button>
    </div>
);

// Product Embed Modal
const ProductEmbedModal: React.FC<{ products: Product[], onSelect: (p: Product) => void, onClose: () => void }> = ({ products, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg p-4 w-96" onClick={e => e.stopPropagation()}>
                <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="input-blueprint w-full mb-4" />
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filtered.map(p => <div key={p.id} onClick={() => onSelect(p)} className="p-2 hover:bg-slate-700 rounded cursor-pointer">{p.name}</div>)}
                </div>
            </div>
        </div>
    );
};


const BlogEditorModal: React.FC<{
    user: User;
    post: Partial<BlogPost>;
    onSave: (post: Partial<BlogPost>) => void;
    onClose: () => void;
}> = ({ user, post, onSave, onClose }) => {
    const { products } = useApp();
    const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>(post);
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');
    const [view, setView] = useState<'write' | 'preview'>('write');
    const [aiSource, setAiSource] = useState('');
    const [aiBuildType, setAiBuildType] = useState<'topic' | 'url'>('topic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showInserter, setShowInserter] = useState(false);
    const [inserterPos, setInserterPos] = useState({ top: 0, left: 0 });
    const [isProductEmbedOpen, setIsProductEmbedOpen] = useState(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    const [galleryText, setGalleryText] = useState('');

    useEffect(() => {
        setCurrentPost(post);
        setGalleryText((post.blogImages || []).join('\n'));
    }, [post]);

    const updateField = (field: keyof BlogPost, value: any) => {
        setCurrentPost(prev => ({ ...prev, [field]: value }));
    };

    const buildGalleryBlock = (urls: string[]) => {
        if (!urls.length) return '';
        return `\n\n[gallery]\n${urls.join('\n')}\n[/gallery]\n\n`;
    };

    const upsertGalleryBlock = (body: string, urls: string[]) => {
        const block = buildGalleryBlock(urls);
        if (!block) {
            return body.replace(/\[gallery\][\s\S]*?\[\/gallery\]/i, '').trim();
        }
        if (/\[gallery\][\s\S]*?\[\/gallery\]/i.test(body)) {
            return body.replace(/\[gallery\][\s\S]*?\[\/gallery\]/i, block.trim());
        }
        return (body || '').trim() + block;
    };

    const handleSave = () => {
        const images = galleryText
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        const contentWithGallery = upsertGalleryBlock(currentPost.content || '', images);

        const postToSave: Partial<BlogPost> = {
            ...currentPost,
            content: contentWithGallery,
            blogImages: images,
        };
        onSave(postToSave);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateBlogPost(aiSource);

            setCurrentPost(prev => {
                // Prefer AI title; otherwise fall back to existing title or the source text.
                const sourceFallback = aiSource || '';
                const nextTitle = (result.title && result.title.trim())
                    || (prev.title && prev.title.trim())
                    || sourceFallback.trim();

                // Prefer slug from AI; otherwise derive from title/source or keep existing.
                const baseSlug = (result.slug || prev.slug || nextTitle)
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Tags: use AI tags if provided; otherwise derive simple tags from title.
                let tags: string[] = Array.isArray(result.tags) ? result.tags : (prev.tags || []);
                if (!tags || tags.length === 0) {
                    const stop = new Set(['the','for','and','with','from','your','you','usb','rgb','pc','mic','microphone','gaming','best','guide']);
                    const words = nextTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stop.has(w));
                    tags = Array.from(new Set(words)).slice(0, 5);
                }

            // Merge AI content into the current post without overwriting user edits on unrelated fields
                return {
                    ...prev,
                    title: nextTitle,
                    slug: baseSlug,
                    content: result.content || prev.content,
                    summary: result.summary || prev.summary,
                    coverImageUrl: result.coverImageUrl || prev.coverImageUrl,
                    tags,
                };
            });

            setMode('manual'); // Switch to editor to refine
        } catch (e) {
            console.error(e); // TODO: replace with a toast notification
        } finally {
            setIsGenerating(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        updateField('content', val);
        if (val.endsWith('\n+')) {
            const pos = e.currentTarget.getBoundingClientRect();
            setInserterPos({ top: pos.top + 20, left: pos.left + 20 });
            setShowInserter(true);
        } else {
            setShowInserter(false);
        }
    };

    const handleInsert = (type: 'image' | 'product' | 'button') => {
        let snippet = '';
        if (type === 'image') {
            const url = prompt('Enter image URL:');
            if (url) snippet = `\n![alt text](${url})\n`;
        } else if (type === 'button') {
            const url = prompt('Enter button URL:');
            const text = prompt('Enter button text:');
            if (url && text) snippet = `\n[${text}](${url})\n`;
        } else if (type === 'product') {
            setIsProductEmbedOpen(true);
        }
        
        if (snippet && contentRef.current) {
            const current = contentRef.current.value.replace(/\+\s*$/, '');
            updateField('content', current + snippet);
        }
        setShowInserter(false);
    };

    const handleProductSelect = (p: Product) => {
        const snippet = `\n[product id="${p.id}"]\n`;
        if (contentRef.current) {
            const current = contentRef.current.value.replace(/\+\s*$/, '');
            updateField('content', current + snippet);
        }
        setIsProductEmbedOpen(false);
    };

    const renderManualEditor = () => (
        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <input
                    type="text"
                    placeholder="Post Title"
                    value={currentPost.title || ''}
                    onChange={e => updateField('title', e.target.value)}
                    className="input-blueprint text-2xl font-bold w-full"
                />
                <div className="relative">
                    <textarea
                        ref={contentRef}
                        placeholder="Start writing... type '+' on a new line for commands"
                        value={currentPost.content || ''}
                        onChange={handleContentChange}
                        className="input-blueprint w-full flex-1 h-full"
                        rows={20}
                    />
                    {showInserter && <InserterMenu onInsert={handleInsert} />}
                </div>
            </div>
            <div className="w-80 bg-slate-800 p-6 space-y-4 overflow-y-auto border-l border-slate-700">
                <h3 className="font-bold text-lg">Post Settings</h3>
                <div>
                    <label className="text-sm font-medium">Slug</label>
                    <input type="text" value={currentPost.slug || ''} onChange={e => updateField('slug', e.target.value)} className="input-blueprint w-full" />
                </div>
                <div>
                    <label className="text-sm font-medium">Summary</label>
                    <textarea value={currentPost.summary || ''} onChange={e => updateField('summary', e.target.value)} className="input-blueprint w-full" rows={3} />
                </div>
                <div>
                    <label className="text-sm font-medium">Cover Image URL</label>
                    <input type="text" value={currentPost.coverImageUrl || ''} onChange={e => updateField('coverImageUrl', e.target.value)} className="input-blueprint w-full" />
                </div>
                <div>
                    <label className="text-sm font-medium">Image Gallery (one URL per line)</label>
                    <textarea 
                        value={galleryText} 
                        onChange={e => setGalleryText(e.target.value)} 
                        className="input-blueprint w-full" 
                        rows={5} 
                    />
                </div>
                <details open={false}>
                    <summary className="font-semibold cursor-pointer">SEO</summary>
                    <div className="mt-2 space-y-2">
                        <label className="text-sm font-medium">SEO Title</label>
                        <input type="text" value={currentPost.seoTitle || ''} onChange={e => updateField('seoTitle', e.target.value)} className="input-blueprint w-full" />
                        <label className="text-sm font-medium">SEO Description</label>
                        <textarea value={currentPost.seoDescription || ''} onChange={e => updateField('seoDescription', e.target.value)} className="input-blueprint w-full" rows={3} />
                    </div>
                </details>
            </div>
        </div>
    );

    const renderPreview = () => (
        <div className="p-8 prose prose-invert max-w-none">
            <h1>{currentPost.title}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentPost.content || ''}</ReactMarkdown>
        </div>
    );

    const renderAiAssist = () => (
        <div className="p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">AI Assist</h2>
            <div className="bg-slate-700/50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                    <button 
                      onClick={() => setAiBuildType('topic')} 
                      className={`px-4 py-2 rounded-md text-sm font-medium ${aiBuildType === 'topic' ? 'bg-sky-500 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                    >
                      From Topic
                    </button>
                    <button 
                      onClick={() => setAiBuildType('url')} 
                      className={`px-4 py-2 rounded-md text-sm font-medium ${aiBuildType === 'url' ? 'bg-sky-500 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                    >
                      From URL
                    </button>
                </div>
                <div className="flex gap-4">
                    <input
                      type="text"
                      value={aiSource}
                      onChange={(e) => setAiSource(e.target.value)}
                      placeholder={aiBuildType === 'topic' ? 'e.g., Best GPUs for 1440p Gaming' : 'https://example.com/article'}
                      className="input-blueprint flex-grow"
                      disabled={isGenerating}
                    />
                    <button onClick={handleGenerate} className="btn-blueprint-primary" disabled={isGenerating}>
                      <ArrowPathIcon className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Generating...' : 'Generate & Edit'}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="bg-slate-800/90 border border-slate-700 rounded-lg shadow-2xl w-full h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        <button className={`px-3 py-1 rounded-md text-sm ${mode === 'manual' ? 'bg-sky-600' : 'bg-slate-700'}`} onClick={() => setMode('manual')}>Manual</button>
                        <button className={`px-3 py-1 rounded-md text-sm ${mode === 'ai' ? 'bg-sky-600' : 'bg-slate-700'}`} onClick={() => setMode('ai')}>AI Assist</button>
                    </div>
                    <div className="flex items-center gap-4">
                        {mode === 'manual' && (
                            <div className="flex items-center gap-2">
                                <button className={`px-3 py-1 rounded-md text-sm ${view === 'write' ? 'bg-slate-600' : 'bg-slate-700'}`} onClick={() => setView('write')}>Write</button>
                                <button className={`px-3 py-1 rounded-md text-sm ${view === 'preview' ? 'bg-slate-600' : 'bg-slate-700'}`} onClick={() => setView('preview')}>Preview</button>
                            </div>
                        )}
                        <button className="btn-blueprint-primary" onClick={handleSave}>Save Post</button>
                        <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                </div>
                {mode === 'manual' ? (view === 'write' ? (
                    <div className="flex flex-1 overflow-hidden">
                        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                            <input
                                type="text"
                                placeholder="Post Title"
                                value={currentPost.title || ''}
                                onChange={e => updateField('title', e.target.value)}
                                className="input-blueprint text-2xl font-bold w-full"
                            />
                            <div className="relative">
                                <textarea
                                    ref={contentRef}
                                    placeholder="Start writing... type '+' on a new line for commands"
                                    value={currentPost.content || ''}
                                    onChange={(e) => updateField('content', e.target.value)}
                                    className="input-blueprint w-full flex-1 h-full"
                                    rows={20}
                                />
                            </div>
                        </div>
                        <div className="w-80 bg-slate-800 p-6 space-y-4 overflow-y-auto border-l border-slate-700">
                            <h3 className="font-bold text-lg">Post Settings</h3>
                            <div>
                                <label className="text-sm font-medium">Slug</label>
                                <input type="text" value={currentPost.slug || ''} onChange={e => updateField('slug', e.target.value)} className="input-blueprint w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Summary</label>
                                <textarea value={currentPost.summary || ''} onChange={e => updateField('summary', e.target.value)} className="input-blueprint w-full" rows={3} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={(currentPost.tags || []).join(', ')}
                                    onChange={e => {
                                        const tags = e.target.value
                                            .split(',')
                                            .map(t => t.trim())
                                            .filter(Boolean);
                                        updateField('tags' as any, tags);
                                    }}
                                    placeholder="e.g., gaming pc, budget, rtx"
                                    className="input-blueprint w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Cover Image URL</label>
                                <input type="text" value={currentPost.coverImageUrl || ''} onChange={e => updateField('coverImageUrl', e.target.value)} className="input-blueprint w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Image Gallery (one URL per line)</label>
                                <textarea 
                                    value={galleryText} 
                                    onChange={e => setGalleryText(e.target.value)} 
                                    className="input-blueprint w-full" 
                                    rows={5} 
                                />
                            </div>
                            <details open={false}>
                                <summary className="font-semibold cursor-pointer">SEO</summary>
                                <div className="mt-2 space-y-2">
                                    <label className="text-sm font-medium">SEO Title</label>
                                    <input type="text" value={currentPost.seoTitle || ''} onChange={e => updateField('seoTitle', e.target.value)} className="input-blueprint w-full" />
                                    <label className="text-sm font-medium">SEO Description</label>
                                    <textarea value={currentPost.seoDescription || ''} onChange={e => updateField('seoDescription', e.target.value)} className="input-blueprint w-full" rows={3} />
                                </div>
                            </details>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 prose prose-invert max-w-none">
                        <h1>{currentPost.title}</h1>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentPost.content || ''}</ReactMarkdown>
                    </div>
                )) : (
                    <div className="p-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold mb-4">AI Assist</h2>
                        <div className="bg-slate-700/50 p-6 rounded-lg">
                            <div className="flex items-center gap-2 mb-4">
                                <button 
                                  onClick={() => setAiBuildType('topic')} 
                                  className={`px-4 py-2 rounded-md text-sm font-medium ${aiBuildType === 'topic' ? 'bg-sky-500 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                                >
                                  From Topic
                                </button>
                                <button 
                                  onClick={() => setAiBuildType('url')} 
                                  className={`px-4 py-2 rounded-md text-sm font-medium ${aiBuildType === 'url' ? 'bg-sky-500 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                                >
                                  From URL
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <input
                                  type="text"
                                  value={aiSource}
                                  onChange={(e) => setAiSource(e.target.value)}
                                  placeholder={aiBuildType === 'topic' ? 'e.g., Best GPUs for 1440p Gaming' : 'https://example.com/article'}
                                  className="input-blueprint flex-grow"
                                  disabled={isGenerating}
                                />
                                <button onClick={handleGenerate} className="btn-blueprint-primary" disabled={isGenerating}>
                                  <ArrowPathIcon className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                                  <span>{isGenerating ? 'Generating...' : 'Generate & Edit'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {isProductEmbedOpen && <ProductEmbedModal products={products} onSelect={handleProductSelect} onClose={() => setIsProductEmbedOpen(false)} />}
        </div>
    );
};

export default BlogEditorModal;

