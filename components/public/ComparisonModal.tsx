import React from 'react';
import { useApp } from '../../context/AppContext';
import { CloseIcon } from './Icons';
import { FALLBACK_IMAGE_URL } from '../../constants';
import BuyButtons from './BuyButtons';

const ComparisonModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { comparisonList } = useApp();

    // Collect all unique spec keys
    const allSpecKeys = React.useMemo(() => {
        const keys = new Set<string>();
        comparisonList.forEach(product => {
            product.specifications.split(',').forEach(spec => {
                const [key] = spec.split(':').map(s => s.trim());
                if (key) keys.add(key);
            });
        });
        return Array.from(keys);
    }, [comparisonList]);

    const getSpecValue = (productSpecs: string, key: string): string => {
        const spec = productSpecs.split(',').find(s => s.trim().startsWith(key + ':'));
        if (spec) {
            return spec.split(':').slice(1).join(':').trim();
        }
        return '-';
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-auto relative border border-gray-700 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 z-10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Product Comparison</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="grid gap-6" style={{ gridTemplateColumns: `150px repeat(${comparisonList.length}, 1fr)` }}>
                        {/* Header Row */}
                        <div className="font-bold text-teal-400"></div> {/* Spacer */}
                        {comparisonList.map(product => (
                            <div key={product.id} className="text-center">
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-32 object-contain rounded-lg mb-2"
                                    onError={handleImageError}
                                    loading="lazy"
                                />
                                <h3 className="font-semibold text-white">{product.name}</h3>
                                <p className="text-lg font-bold text-teal-400">{product.price}</p>
                                <div className="mt-2">
                                    <BuyButtons 
                                        affiliateLink={product.affiliateLink}
                                        productName={product.name}
                                        productCategory={product.category}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Spacer Row */}
                        <div className="col-span-full border-t border-gray-700 my-4"></div>

                        {/* Spec Rows */}
                        {allSpecKeys.map(key => (
                            <React.Fragment key={key}>
                                <div className="font-bold text-gray-300 self-center">{key}</div>
                                {comparisonList.map(product => (
                                    <div key={product.id} className="text-center self-center text-gray-200">
                                        {getSpecValue(product.specifications, key)}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                         {/* Review Row */}
                        <div className="col-span-full border-t border-gray-700 my-4"></div>
                         <div className="font-bold text-gray-300 self-start pt-2">Review</div>
                        {comparisonList.map(product => (
                            <div key={product.id} className="text-sm text-gray-300 text-left">
                                {product.review}
                            </div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonModal;
