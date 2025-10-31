import React from 'react';

interface AdminTopbarProps {
    onOpenChat: () => void;
}

const AdminTopbar: React.FC<AdminTopbarProps> = ({ onOpenChat }) => {
    return (
        <div className="w-full flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                {/* Breadcrumbs can be simplified or made dynamic later */}
                <span>Admin</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    className="btn-blueprint"
                    onClick={onOpenChat}
                >
                    AI Assistant
                </button>
            </div>
        </div>
    );
};

export default AdminTopbar;


