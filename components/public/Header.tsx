
import React from 'react';
import { Page } from '../../types';
import { ChipIcon, LockClosedIcon } from './Icons';
import { useApp } from '../../context/AppContext';


interface HeaderProps {
    onNavigate: (page: Page) => void;
    currentPage: Page;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
    const { isAuthenticated, currentUserEmail } = useApp();
    const backendOn = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

    const navLinkClasses = (page: Page) => 
        `cursor-pointer btn-crt ${currentPage === page ? 'btn-crt--primary' : ''} text-base crt-strong`;

    return (
        <header className="bg-gray-900/40 sticky top-0 z-50 border-b border-slate-700/50">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div 
                            className="flex-shrink-0 flex items-center gap-3 cursor-pointer"
                            onClick={() => onNavigate(Page.HOME)}
                        >
                           <ChipIcon className="h-8 w-8 text-sky-400" />
                           <span className="text-white text-2xl font-bold">RIGRATER</span>
                           <span className="hidden sm:inline text-xs text-slate-400 tracking-widest">RATE • COMPARE • UPGRADE</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={navLinkClasses(Page.HOME)} onClick={() => onNavigate(Page.HOME)}>
                            Storefront
                        </div>
                        <div className={navLinkClasses(Page.CATEGORIES)} onClick={() => onNavigate(Page.CATEGORIES)}>
                            Categories
                        </div>
                        <div className={navLinkClasses('BLOG' as any)} onClick={() => onNavigate('BLOG' as any)}>
                            Blog
                        </div>
                        <div className={navLinkClasses('COMPARISONS' as any)} onClick={() => onNavigate('COMPARISONS' as any)}>
                            Comparisons
                        </div>
                        <div className={navLinkClasses(Page.ADMIN)} onClick={() => onNavigate(Page.ADMIN)}>
                            <div className="flex items-center gap-2">
                               {isAuthenticated && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                               Admin Panel
                            </div>
                        </div>
                        <div className="hidden md:flex items-center text-xs px-2 py-1 rounded border neon-outline "
                             title={backendOn ? (isAuthenticated ? 'Connected to Supabase as admin' : 'Connected to Supabase - not logged in') : 'Local-only mode'}
                        >
                            <span className={`mr-2 w-2 h-2 rounded-full ${backendOn ? (isAuthenticated ? 'bg-green-400' : 'bg-yellow-400') : 'bg-red-400'}`}></span>
                            {backendOn ? (isAuthenticated ? `DB: ${currentUserEmail || 'Connected'}` : 'DB: Login required') : 'DB: Local-only'}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
