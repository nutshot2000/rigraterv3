import React from 'react';
import { 
    Cog6ToothIcon, 
    CpuChipIcon, 
    RectangleStackIcon, 
    BookOpenIcon, 
    NewspaperIcon,
    LightBulbIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
import { Page } from '../../types';

interface AdminSidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPage, onNavigate }) => {

  const getButtonClass = (active: boolean) => {
    const baseClass = "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150";
    if (active) {
      return `${baseClass} bg-sky-500/20 text-sky-400 border border-sky-500/30`;
    }
    return `${baseClass} text-slate-300 hover:bg-slate-700/50`;
  };

  return (
    <div className="w-64 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col">
      <div className="space-y-2 flex-grow">
        <button
          className={getButtonClass(currentPage === Page.ADMIN_AI_PRODUCT)}
          onClick={() => onNavigate(Page.ADMIN_AI_PRODUCT)}
        >
          <CpuChipIcon className="h-6 w-6" />
          <span>AI/Product Tools</span>
        </button>

        <button
          className={getButtonClass(currentPage === Page.ADMIN_MANAGE_PRODUCTS)}
          onClick={() => onNavigate(Page.ADMIN_MANAGE_PRODUCTS)}
        >
          <RectangleStackIcon className="h-6 w-6" />
          <span>Manage Products</span>
        </button>

        <div className="px-4">
            <div className="border-t border-slate-700/60 my-2"></div>
        </div>

        <button
          className={getButtonClass(currentPage === Page.ADMIN_AI_BLOG)}
          onClick={() => onNavigate(Page.ADMIN_AI_BLOG)}
        >
          <BookOpenIcon className="h-6 w-6" />
          <span>AI Blog Builder</span>
        </button>

        <button
          className={getButtonClass(currentPage === Page.ADMIN_MANAGE_POSTS)}
          onClick={() => onNavigate(Page.ADMIN_MANAGE_POSTS)}
        >
          <NewspaperIcon className="h-6 w-6" />
          <span>Manage Posts</span>
        </button>

        <button
          className={getButtonClass(currentPage === Page.ADMIN_DEALS)}
          onClick={() => onNavigate(Page.ADMIN_DEALS)}
        >
          <TagIcon className="h-6 w-6" />
          <span>Deals</span>
        </button>

        <div className="px-4">
            <div className="border-t border-slate-700/60 my-2"></div>
        </div>
        
        <button
          onClick={() => window.alert('Ideas coming soon')}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 text-slate-300 hover:bg-slate-700/50"
        >
          <LightBulbIcon className="h-6 w-6" />
          <span>AI Ideas</span>
        </button>

        <button
          className={getButtonClass(currentPage === Page.ADMIN)}
          onClick={() => onNavigate(Page.ADMIN)}
        >
          <Cog6ToothIcon className="h-6 w-6" />
          <span>Header Deals Button</span>
        </button>
      </div>
    </div>
  );
};
