import React from 'react';
import { PlusIcon, SparklesIcon, TrashIcon, PencilIcon, LogoutIcon } from '../public/Icons';

export type AdminMode = 'ai_url' | 'manual_product' | 'manage_products' | 'manage_blog' | 'manage_comparisons' | 'bulk_ai';

interface AdminSidebarProps {
  mode: AdminMode;
  setMode: (mode: AdminMode) => void;
  onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ mode, setMode, onLogout }) => {
  const navItemClasses = (itemMode: AdminMode) =>
    `flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
      mode === itemMode
        ? 'bg-sky-500/10 text-sky-300'
        : 'text-slate-300 hover:bg-slate-800/60'
    }`;

  return (
    <div className="bg-slate-900/80 border-r border-slate-700/50 p-4 flex flex-col h-full">
      <div className="flex-grow">
        <h2 className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-4">Content Creation</h2>
        <div className="space-y-2">
          <button className={navItemClasses('ai_url')} onClick={() => setMode('ai_url')}>
            <SparklesIcon className="w-5 h-5" />
            <span>New from URL (AI)</span>
          </button>
          <button className={navItemClasses('manual_product')} onClick={() => setMode('manual_product')}>
            <PlusIcon className="w-5 h-5" />
            <span>Manual Product Entry</span>
          </button>
          <button className={navItemClasses('bulk_ai')} onClick={() => setMode('bulk_ai')}>
            <SparklesIcon className="w-5 h-5" />
            <span>Bulk AI Generation</span>
          </button>
        </div>

        <h2 className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-8 mb-4">Management</h2>
        <div className="space-y-2">
          <button className={navItemClasses('manage_products')} onClick={() => setMode('manage_products')}>
            <PencilIcon className="w-5 h-5" />
            <span>Manage Products</span>
          </button>
          {/* Future items can be added here */}
          {/* <button className={navItemClasses('manage_blog')} onClick={() => setMode('manage_blog')}>
            <PencilIcon className="w-5 h-5" />
            <span>Manage Blog Posts</span>
          </button>
          <button className={navItemClasses('manage_comparisons')} onClick={() => setMode('manage_comparisons')}>
            <PencilIcon className="w-5 h-5" />
            <span>Manage Comparisons</span>
          </button> */}
        </div>
      </div>

      <div className="mt-auto">
         <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-red-400 hover:bg-red-500/10"
        >
            <LogoutIcon className="w-5 h-5" />
            <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
