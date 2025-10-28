
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChipIcon } from './Icons';

const Header: React.FC = () => {
    const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
        `btn-blueprint ${isActive ? 'btn-blueprint--primary' : ''} text-base crt-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;

    return (
        <header className="bg-gray-900/40 sticky top-0 z-50 border-b border-slate-700/50">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
                           <ChipIcon className="h-8 w-8 text-sky-400" />
                           <span className="text-white text-2xl font-bold">RIGRATER</span>
                           <span className="hidden sm:inline text-xs text-slate-400 tracking-widest">RATE • COMPARE • UPGRADE</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                        <NavLink to="/" className={navLinkClasses}>
                            Storefront
                        </NavLink>
                        <NavLink to="/blog" className={navLinkClasses}>
                            Blog
                        </NavLink>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
