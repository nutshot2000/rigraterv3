
import React from 'react';
import { Page } from '../../types';
import { ChipIcon, LockClosedIcon } from './Icons';
import { useApp } from '../../context/AppContext';


interface HeaderProps {
    onNavigate: (page: Page) => void;
    currentPage: Page;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
    const { isAuthenticated } = useApp();

    const navLinkClasses = (page: Page) => 
        `cursor-pointer px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
            currentPage === page ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;

    return (
        <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-50 shadow-lg shadow-black/20">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div 
                            className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                            onClick={() => onNavigate(Page.HOME)}
                        >
                           <ChipIcon className="h-8 w-8 text-teal-400" />
                           <span className="text-white text-xl font-extrabold tracking-tight">Rigrater</span>
                           <span className="hidden sm:inline text-xs text-teal-300/80 ml-1">rate. compare. upgrade.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
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
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
