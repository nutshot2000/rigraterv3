import React from 'react';
import { Page } from '../../types';

interface QuickNavProps {
    current: Page;
    onGo: (p: Page) => void;
}

const QuickNav: React.FC<QuickNavProps> = ({ current, onGo }) => {
    const items: { key: Page; label: string; num: string }[] = [
        { key: Page.HOME, label: 'Storefront', num: '1' },
        { key: Page.CATEGORIES, label: 'Categories', num: '2' },
        { key: Page.BLOG, label: 'Blog', num: '3' },
        { key: Page.COMPARISONS, label: 'Comparisons', num: '4' },
        { key: Page.ADMIN, label: 'Admin', num: '5' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl p-2 flex gap-2">
                {items.map(({ key, label, num }) => (
                    <button
                        key={key}
                        className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                            current === key
                                ? 'border-sky-500/60 text-sky-300 bg-sky-500/10'
                                : 'border-slate-700 text-slate-300 hover:text-white hover:border-sky-500 hover:bg-slate-800/60'
                        }`}
                        title={`${label} (press ${num})`}
                        onClick={() => onGo(key)}
                    >
                        {num}
                        <span className="hidden sm:inline ml-2">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickNav;


