import React from 'react';

const SkeletonCard: React.FC = () => {
    return (
        <div className="bg-gray-900 p-3 rounded-lg flex items-start gap-3 animate-pulse">
            <div className="w-20 h-20 bg-gray-700 rounded-md"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
        </div>
    );
};

export default SkeletonCard;
