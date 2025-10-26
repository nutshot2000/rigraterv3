import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CompareIcon, XIcon } from './Icons';
import ComparisonModal from './ComparisonModal';
import { FALLBACK_IMAGE_URL } from '../../constants';

const ComparisonBar: React.FC = () => {
    const { comparisonList, removeFromComparison, clearComparison } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (comparisonList.length === 0) {
        return null;
    }
    
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null;
    };

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-md border-t border-gray-700 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold text-white hidden sm:block">Compare Products ({comparisonList.length}/3)</h3>
                        <div className="flex items-center gap-2">
                            {comparisonList.map(product => (
                                <div key={product.id} className="relative group">
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-12 h-12 object-cover rounded-md"
                                        onError={handleImageError}
                                        loading="lazy"
                                    />
                                    <button
                                        onClick={() => removeFromComparison(product.id)}
                                        className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Remove ${product.name} from comparison`}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 py-2 px-4 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={comparisonList.length < 2}
                        >
                            <CompareIcon className="w-5 h-5" />
                            <span className="hidden md:inline">Compare</span>
                        </button>
                         <button 
                            onClick={clearComparison}
                            className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition hidden md:inline"
                        >
                           Clear All
                        </button>
                    </div>
                </div>
            </div>
            {isModalOpen && <ComparisonModal onClose={() => setIsModalOpen(false)} />}
        </>
    );
};

export default ComparisonBar;