import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BlogPost } from '../../types';
import { generateBlogPost } from '../../services/geminiService';
import Spinner from '../shared/Spinner';
import { CloseIcon, SparklesIcon } from '../public/Icons';

const BlogEditorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addBlogPost, addToast } = useApp();
    const [title, setTitle] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!title) { addToast('Enter a title first.', 'error'); return; }
        setIsGenerating(true);
        try {
            const post = await generateBlogPost(title);
            setCoverImageUrl(post.coverImageUrl || '');
            setSummary(post.summary || '');
            setContent(post.content || '');
            setTags((post.tags || []).join(', '));
            addToast('AI draft generated', 'success');
        } catch (e) {
            addToast('Failed to generate blog draft.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        const newPost = {
            title,
            slug: title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            coverImageUrl,
            summary,
            content,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        } as Omit<BlogPost, 'id' | 'createdAt'>;
        addBlogPost(newPost);
        addToast('Blog post saved', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">New Blog Post</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Title</label>
                            <input className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Cover Image URL</label>
                            <input className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Summary</label>
                        <textarea className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" rows={2} value={summary} onChange={e => setSummary(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Content (Markdown)</label>
                        <textarea className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" rows={10} value={content} onChange={e => setContent(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Tags (comma separated)</label>
                            <input className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" value={tags} onChange={e => setTags(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleGenerate} disabled={isGenerating || !title} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                                {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5" />} AI Draft
                            </button>
                            <button onClick={handleSave} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogEditorModal;

