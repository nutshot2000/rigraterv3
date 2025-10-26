import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ComparisonDoc } from '../../types';
import { generateComparison } from '../../services/geminiService';
import { CloseIcon, SparklesIcon } from '../public/Icons';
import Spinner from '../shared/Spinner';

const ComparisonBuilderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { products, addComparisonDoc, addToast } = useApp();
    const [title, setTitle] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [specDiffSummary, setSpecDiffSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const canSelect = useMemo(() => products.slice(0, 200), [products]);

    const toggle = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleGenerate = async () => {
        if (!title || selectedIds.length < 2) { addToast('Pick a title and at least 2 products', 'error'); return; }
        setIsGenerating(true);
        try {
            const payload = selectedIds.map(id => {
                const p = products.find(pp => pp.id === id)!;
                return { name: p.name, specs: p.specifications };
            });
            const doc = await generateComparison(title, payload);
            setContent(doc.content || '');
            setSpecDiffSummary(doc.specDiffSummary || '');
            addToast('AI comparison generated', 'success');
        } catch {
            addToast('Failed to generate comparison.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        const doc = { title, productIds: selectedIds, content, specDiffSummary } as Omit<ComparisonDoc, 'id' | 'createdAt'>;
        addComparisonDoc(doc);
        addToast('Comparison saved', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">New Comparison</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Title</label>
                            <input className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Products ({selectedIds.length} selected)</label>
                            <div className="h-32 overflow-auto border border-gray-700 rounded-md p-2 bg-gray-900">
                                {canSelect.map(p => (
                                    <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300 py-1">
                                        <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
                                        <span>{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Spec Difference Summary</label>
                            <textarea className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" rows={4} value={specDiffSummary} onChange={e => setSpecDiffSummary(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Content (Markdown)</label>
                            <textarea className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" rows={8} value={content} onChange={e => setContent(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleGenerate} disabled={isGenerating || selectedIds.length < 2 || !title} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                            {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5" />} AI Generate
                        </button>
                        <button onClick={handleSave} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonBuilderModal;

