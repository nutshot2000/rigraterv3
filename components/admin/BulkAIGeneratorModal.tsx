import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateProductInfo } from '../../services/geminiService';
import Spinner from '../shared/Spinner';
import { CloseIcon } from '../public/Icons';

const BulkAIGeneratorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addProduct, addToast } = useApp();
    const [names, setNames] = useState('');
    const [loading, setLoading] = useState(false);

    const run = async () => {
        const list = names.split('\n').map(s => s.trim()).filter(Boolean);
        if (list.length === 0) return;
        setLoading(true);
        let success = 0;
        for (const name of list) {
            try {
                const info = await generateProductInfo(name);
                addProduct({ name, category: '', imageUrl: info.imageUrl, price: info.price, affiliateLink: info.affiliateLink, review: info.review, specifications: info.specifications });
                success++;
            } catch {}
        }
        setLoading(false);
        addToast(`Generated ${success} products.`, 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Bulk AI Product Generator</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <p className="text-gray-400 text-sm">Paste one product name per line. AI will fetch details.</p>
                    <textarea className="w-full h-48 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" value={names} onChange={e => setNames(e.target.value)} placeholder={'NVIDIA GeForce RTX 4070 Super\nCorsair RM850x\nSamsung Odyssey G7'} />
                    <button disabled={loading || !names.trim()} onClick={() => void run()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                        {loading ? <Spinner /> : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkAIGeneratorModal;

