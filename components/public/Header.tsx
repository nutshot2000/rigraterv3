
import React, { useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChipIcon } from './Icons';
import { useApp } from '../../context/AppContext';

const Header: React.FC = () => {
    const { isAuthenticated, currentUserEmail } = useApp();
    const backendOn = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

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
                        {/* Add other links for categories, blog etc. later */}
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
