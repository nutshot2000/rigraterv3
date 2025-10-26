import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORY_GROUPS } from '../constants';

const CategoriesPage: React.FC = () => {
    const { products, setPage } = useApp();
    const counts = useMemo(() => {
        const m: Record<string, number> = {};
        products.forEach(p => {
            const key = p.category || 'Uncategorized';
            m[key] = (m[key] || 0) + 1;
        });
        return m;
    }, [products]);

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Browse Categories</h1>
            <div className="space-y-6">
                {CATEGORY_GROUPS.map(group => (
                    <div key={group.name}>
                        <h2 className="text-xl font-semibold text-white mb-3">{group.name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {group.categories.map(name => (
                                <button
                                    key={name}
                                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:bg-gray-700/50 transition"
                                    onClick={() => {
                                        const params = new URLSearchParams(window.location.search);
                                        params.set('cat', name);
                                        const url = `?${params.toString()}`;
                                        window.history.replaceState(null, '', url);
                                        setPage('HOME' as any);
                                    }}
                                >
                                    <div className="text-white font-semibold flex items-center justify-between">
                                        <span>{name}</span>
                                        <span className="text-xs text-gray-400">{counts[name] || 0}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoriesPage;


