import React from 'react';
import { 
    Cog6ToothIcon, 
    CpuChipIcon, 
    RectangleStackIcon, 
    BookOpenIcon, 
    NewspaperIcon,
    LightBulbIcon 
} from '@heroicons/react/24/outline';

export type AdminMode =
  | 'ai_product'
  | 'manage_products'
  | 'ai_blog'
  | 'manage_posts'
  | 'settings';

interface AdminSidebarProps {
  mode: AdminMode;
  onModeChange: (mode: AdminMode) => void;
  onLogout: () => void;
  onOpenIdeas: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mode, onModeChange, onLogout, onOpenIdeas }) => {

  const getButtonClass = (buttonMode: AdminMode) => {
    const baseClass = "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150";
    if (mode === buttonMode) {
      return `${baseClass} bg-sky-500/20 text-sky-400 border border-sky-500/30`;
    }
    return `${baseClass} text-slate-300 hover:bg-slate-700/50`;
  };

  return (
    <div className="w-64 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col">
      <div className="space-y-2 flex-grow">
        <button
          className={getButtonClass('ai_product')}
          onClick={() => onModeChange('ai_product')}
        >
          <CpuChipIcon className="h-6 w-6" />
          <span>AI Product Builder</span>
        </button>

        <button
          className={getButtonClass('manage_products')}
          onClick={() => onModeChange('manage_products')}
        >
          <RectangleStackIcon className="h-6 w-6" />
          <span>Manage Products</span>
        </button>

        <div className="px-4">
            <div className="border-t border-slate-700/60 my-2"></div>
        </div>

        <button
          className={getButtonClass('ai_blog')}
          onClick={() => onModeChange('ai_blog')}
        >
          <BookOpenIcon className="h-6 w-6" />
          <span>AI Blog Builder</span>
        </button>

        <button
          className={getButtonClass('manage_posts')}
          onClick={() => onModeChange('manage_posts')}
        >
          <NewspaperIcon className="h-6 w-6" />
          <span>Manage Posts</span>
        </button>

        <div className="px-4">
            <div className="border-t border-slate-700/60 my-2"></div>
        </div>
        
        <button
          onClick={onOpenIdeas}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 text-slate-300 hover:bg-slate-700/50"
        >
          <LightBulbIcon className="h-6 w-6" />
          <span>AI Ideas</span>
        </button>

        <button
          className={getButtonClass('settings')}
          onClick={() => onModeChange('settings')}
        >
          <Cog6ToothIcon className="h-6 w-6" />
          <span>Settings</span>
        </button>
      </div>

      <div className="mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
