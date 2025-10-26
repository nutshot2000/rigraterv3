import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatWithAI, extractProductsFromText, generateProductInfo } from '../../services/geminiService';
import { useApp } from '../../context/AppContext';
import { CloseIcon } from '../public/Icons';
import { BlogPost } from '../../types';

type Msg = { role: 'user' | 'assistant'; content: string };

const AIChatModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { products, addBlogPost, addToast, addProduct } = useApp();
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);

    const context = useMemo(() => {
        // Provide brief catalog context: top categories and a few names
        const cats = Array.from(new Set(products.map(p => p.category))).slice(0, 10).join(', ');
        const names = products.slice(0, 20).map(p => p.name).join(' | ');
        return `Categories: ${cats}\nSample items: ${names}`;
    }, [products]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        if (!input.trim()) return;
        const next = [...messages, { role: 'user', content: input.trim() }];
        setMessages(next);
        setInput('');
        setLoading(true);
        try {
            const text = await chatWithAI(next as any, { context });
            setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process that request.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden relative border border-gray-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">AI Assistant</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 h-[60vh] overflow-y-auto space-y-3">
                    {messages.length === 0 && (
                        <div className="text-gray-400 text-sm">Ask for suggestions, comparisons, copywriting, specs…</div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                            <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-100'}`}>{m.content}</div>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
                <div className="p-4 border-t border-gray-700 flex flex-col gap-2">
                    {messages.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                                onClick={() => {
                                    const last = messages[messages.length - 1];
                                    const title = last.content.split('\n')[0].slice(0, 60) || 'Untitled';
                                    const post: Omit<BlogPost, 'id' | 'createdAt'> = {
                                        title,
                                        slug: title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                                        coverImageUrl: '',
                                        summary: title,
                                        content: last.content,
                                        tags: ['ai-draft']
                                    };
                                    addBlogPost(post);
                                    addToast('Saved as blog draft', 'success');
                                }}
                            >
                                Save reply as Blog Draft
                            </button>
                            <button
                                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs"
                                onClick={async () => {
                                    const last = messages[messages.length - 1];
                                    try {
                                        const names = await extractProductsFromText(last.content);
                                        if (!names.length) { addToast('No products detected in reply.', 'info'); return; }
                                        let created = 0;
                                        for (const n of names.slice(0, 5)) {
                                            try {
                                                const info = await generateProductInfo(n);
                                                addProduct({ name: n, category: '', imageUrl: info.imageUrl, price: info.price, affiliateLink: info.affiliateLink, review: info.review, specifications: info.specifications });
                                                created++;
                                            } catch {}
                                        }
                                        addToast(`Created ${created} product drafts from reply.`, 'success');
                                    } catch {
                                        addToast('Failed to extract products.', 'error');
                                    }
                                }}
                            >
                                Extract products → drafts
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white"
                            placeholder="Ask something…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                        />
                        <button onClick={() => void send()} disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md disabled:opacity-50">Send</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatModal;

