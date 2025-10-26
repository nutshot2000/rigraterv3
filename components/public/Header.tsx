
import React, { useRef } from 'react';
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
        `btn-blueprint ${currentPage === page ? 'btn-blueprint--primary' : ''} text-base crt-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;

    const navOrder: Page[] = [Page.HOME, Page.CATEGORIES, Page.BLOG, Page.COMPARISONS, Page.ADMIN];
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        const key = e.key;
        const currentIndex = navOrder.findIndex(p => p === currentPage);
        let nextIndex = -1;
        if (key === 'ArrowRight') nextIndex = (currentIndex + 1) % navOrder.length;
        else if (key === 'ArrowLeft') nextIndex = (currentIndex - 1 + navOrder.length) % navOrder.length;
        else if (key === 'Home') nextIndex = 0;
        else if (key === 'End') nextIndex = navOrder.length - 1;
        else if (key === 'Enter' || key === ' ') {
            const focusedIndex = tabRefs.current.findIndex(el => el === (document.activeElement as HTMLElement | null));
            if (focusedIndex >= 0) onNavigate(navOrder[focusedIndex]);
            return;
        } else {
            return;
        }
        e.preventDefault();
        const el = tabRefs.current[nextIndex];
        if (el) el.focus();
    };

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
                    <div 
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap"
                        role="tablist" aria-label="Main"
                        onKeyDown={handleKeyDown}
                    >
                        <button
                            className={navLinkClasses(Page.HOME)}
                            role="tab"
                            aria-selected={currentPage === Page.HOME}
                            tabIndex={currentPage === Page.HOME ? 0 : -1}
                            ref={el => (tabRefs.current[0] = el)}
                            onClick={() => onNavigate(Page.HOME)}
                        >
                            Storefront
                        </button>
                        <button
                            className={navLinkClasses(Page.CATEGORIES)}
                            role="tab"
                            aria-selected={currentPage === Page.CATEGORIES}
                            tabIndex={currentPage === Page.CATEGORIES ? 0 : -1}
                            ref={el => (tabRefs.current[1] = el)}
                            onClick={() => onNavigate(Page.CATEGORIES)}
                        >
                            Categories
                        </button>
                        <button
                            className={navLinkClasses(Page.BLOG)}
                            role="tab"
                            aria-selected={currentPage === Page.BLOG}
                            tabIndex={currentPage === Page.BLOG ? 0 : -1}
                            ref={el => (tabRefs.current[2] = el)}
                            onClick={() => onNavigate(Page.BLOG)}
                        >
                            Blog
                        </button>
                        <button
                            className={navLinkClasses(Page.COMPARISONS)}
                            role="tab"
                            aria-selected={currentPage === Page.COMPARISONS}
                            tabIndex={currentPage === Page.COMPARISONS ? 0 : -1}
                            ref={el => (tabRefs.current[3] = el)}
                            onClick={() => onNavigate(Page.COMPARISONS)}
                        >
                            Comparisons
                        </button>
                        <button
                            className={navLinkClasses(Page.ADMIN)}
                            role="tab"
                            aria-selected={currentPage === Page.ADMIN}
                            tabIndex={currentPage === Page.ADMIN ? 0 : -1}
                            ref={el => (tabRefs.current[4] = el)}
                            onClick={() => onNavigate(Page.ADMIN)}
                            title={isAuthenticated ? 'Admin Panel' : 'Login required'}
                        >
                            <span className="flex items-center gap-2">
                                {isAuthenticated && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                                Admin Panel
                            </span>
                        </button>
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
