
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChipIcon } from './Icons';
import { useApp } from '../../context/AppContext';

const Header: React.FC = () => {
    const { promoButton } = useApp();

    const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
        `btn-blueprint ${isActive ? 'btn-blueprint--primary' : ''} text-base crt-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;

    const promo = promoButton && promoButton.enabled && promoButton.url ? promoButton : undefined;

    const sizeClasses =
        promo?.size === 'lg'
            ? 'px-6 py-3 text-base'
            : promo?.size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : 'px-4 py-2 text-sm';

    const colorBase =
        promo?.color === 'sky'
            ? 'border-sky-500/50 text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 focus-visible:ring-sky-400'
            : promo?.color === 'emerald'
            ? 'border-emerald-500/50 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 focus-visible:ring-emerald-400'
            : promo?.color === 'rose'
            ? 'border-rose-500/50 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 focus-visible:ring-rose-400'
            : 'border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 focus-visible:ring-amber-400';

    const centerVisual =
        promo && promo.position === 'center' && promo.color === 'amber'
            ? 'border border-amber-300 text-slate-900 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 shadow-lg shadow-amber-500/40 tracking-[0.22em] uppercase'
            : `border ${colorBase}`;

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
                    {/* Center promo button on desktop when configured */}
                    {promo && promo.position === 'center' && (
                        <div className="hidden md:flex flex-1 justify-center">
                            {promo.url.startsWith('http') ? (
                                <a
                                    href={promo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`btn-blueprint crt-strong ${sizeClasses} ${centerVisual} min-w-[220px] md:min-w-[260px]`}
                                >
                                    {promo.label || 'Deals'}
                                </a>
                            ) : (
                                    <NavLink
                                    to={promo.url}
                                    className={() =>
                                        `btn-blueprint crt-strong ${sizeClasses} ${centerVisual} min-w-[220px] md:min-w-[260px]`
                                    }
                                >
                                    {promo.label || 'Deals'}
                                </NavLink>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                        <NavLink to="/" className={navLinkClasses}>
                            Storefront
                        </NavLink>
                        <NavLink to="/blog" className={navLinkClasses}>
                            Blog
                        </NavLink>
                        {/* If position is 'right' or we're on mobile, keep promo with nav */}
                        {promo && (
                            <div className="flex md:hidden">
                                {promo.url.startsWith('http') ? (
                                    <a
                                        href={promo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`btn-blueprint crt-strong ${sizeClasses} border ${colorBase}`}
                                    >
                                        {promo.label || 'Deals'}
                                    </a>
                                ) : (
                                    <NavLink
                                        to={promo.url}
                                        className={({ isActive }) =>
                                            `btn-blueprint crt-strong ${sizeClasses} border ${colorBase} ${
                                                isActive ? 'btn-blueprint--primary' : ''
                                            }`
                                        }
                                    >
                                        {promo.label || 'Deals'}
                                    </NavLink>
                                )}
                            </div>
                        )}
                        {promo && promo.position === 'right' && (
                            <div className="hidden md:flex">
                                {promo.url.startsWith('http') ? (
                                    <a
                                        href={promo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`btn-blueprint crt-strong ${sizeClasses} border ${colorBase}`}
                                    >
                                        {promo.label || 'Deals'}
                                    </a>
                                ) : (
                                    <NavLink
                                        to={promo.url}
                                        className={({ isActive }) =>
                                            `btn-blueprint crt-strong ${sizeClasses} border ${colorBase} ${
                                                isActive ? 'btn-blueprint--primary' : ''
                                            }`
                                        }
                                    >
                                        {promo.label || 'Deals'}
                                    </NavLink>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
