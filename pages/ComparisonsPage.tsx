import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ComparisonsPage: React.FC = () => {
    const { comparisons, products } = useApp();
    const [openId, setOpenId] = useState<string | null>(null);
    const current = useMemo(() => comparisons.find(c => c.id === openId) || null, [openId, comparisons]);

    const productNames = (ids: string[]) => ids.map(id => products.find(p => p.id === id)?.name || 'Unknown').join(' vs ');

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Comparisons</h1>
            <div className="space-y-3">
                {comparisons.map(doc => (
                    <div key={doc.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50" onClick={() => setOpenId(doc.id)}>
                        <div className="text-white font-semibold">{doc.title}</div>
                        <div className="text-gray-400 text-sm">{productNames(doc.productIds)}</div>
                        <div className="text-gray-300 text-sm mt-2">{doc.specDiffSummary}</div>
                    </div>
                ))}
            </div>

            {current && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpenId(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-3xl font-bold text-white">{current.title}</h2>
                            <div className="text-sm text-gray-400 mt-1">{productNames(current.productIds)}</div>
                            <div className="prose prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(current.content || '') as string) }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonsPage;

