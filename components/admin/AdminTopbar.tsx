import React from 'react';
import { AdminMode } from './AdminSidebar';

interface AdminTopbarProps {
    mode: AdminMode;
    onCreateNew: () => void;
    onNavigate?: (mode: AdminMode) => void;
}

const titleForMode = (mode: AdminMode): string => {
    switch (mode) {
        case 'ai_product': return 'AI Product Builder';
        case 'manage_products': return 'Manage Products';
        case 'ai_blog': return 'AI Blog Builder';
        case 'manage_posts': return 'Manage Blog Posts';
        case 'settings': return 'Settings';
        default: return '';
    }
};

const actionLabelForMode = (mode: AdminMode): string | null => {
    if (mode === 'manage_products') return 'New Product';
    if (mode === 'manage_posts') return 'New Post';
    return null;
};

const AdminTopbar: React.FC<AdminTopbarProps> = ({ mode, onCreateNew, onNavigate }) => {
    const title = titleForMode(mode);
    const actionLabel = actionLabelForMode(mode);

    return (
        <div className="w-full flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <button className="hover:text-slate-200" onClick={() => onNavigate?.('ai_product')}>Admin</button>
                <span className="opacity-60">/</span>
                <span className="text-slate-200">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                {actionLabel && (
                    <button className="btn-blueprint btn-blueprint--primary" onClick={onCreateNew}>{actionLabel}</button>
                )}
            </div>
        </div>
    );
};

export default AdminTopbar;


