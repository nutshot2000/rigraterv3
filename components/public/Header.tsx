
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChipIcon } from './Icons';
import { useApp } from '../../context/AppContext';

const Header: React.FC = () => {
    const { promoButton } = useApp();

    const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
        `btn-blueprint ${isActive ? 'btn-blueprint--primary' : ''} text-base crt-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;

    const promo = promoButton && promoButton.enabled
        ? { ...promoButton, url: promoButton.url || '/deals' }
        : undefined;

    const sizeClasses =
        promo?.size === 'lg'
            ? 'px-6 py-3 text-base'
            : promo?.size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : 'px-4 py-2 text-sm';

    const colorBase =
        promo?.color === 'sky'
            ? 'bg-sky-500 text-slate-950 border border-sky-300 shadow-lg shadow-sky-500/40 hover:bg-sky-400 focus-visible:ring-sky-300'
            : promo?.color === 'emerald'
            ? 'bg-emerald-500 text-emerald-50 border border-emerald-300 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 focus-visible:ring-emerald-300'
            : promo?.color === 'rose'
            ? 'bg-rose-500 text-rose-50 border border-rose-300 shadow-lg shadow-rose-500/40 hover:bg-rose-400 focus-visible:ring-rose-300'
            : 'bg-amber-400 text-slate-950 border border-amber-300 shadow-lg shadow-amber-500/40 hover:bg-amber-300 focus-visible:ring-amber-400';

    const animationClasses =
        promo?.animation === 'bounce'
            ? 'animate-bounce'
            : promo?.animation === 'pulse'
            ? 'animate-pulse'
            : promo?.animation === 'glow'
            ? 'promo-animate-glow'
            : promo?.animation === 'wiggle'
            ? 'promo-animate-wiggle'
            : '';

    const centerVisual =
        promo && promo.position === 'center' && promo.color === 'amber'
            ? `border border-amber-300 text-slate-900 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 shadow-lg shadow-amber-500/40 tracking-[0.22em] uppercase ${animationClasses}`
            : `${colorBase} ${animationClasses}`;

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
                                    className={`inline-flex items-center justify-center rounded-md font-semibold ${sizeClasses} ${centerVisual} min-w-[220px] md:min-w-[260px]`}
                                >
                                    {promo.label || 'Deals'}
                                </a>
                            ) : (
                                    <NavLink
                                    to={promo.url}
                                    className={() =>
                                        `inline-flex items-center justify-center rounded-md font-semibold ${sizeClasses} ${centerVisual} min-w-[220px] md:min-w-[260px]`
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
                                        className={`inline-flex items-center justify-center rounded-md font-semibold crt-strong ${sizeClasses} ${colorBase}`}
                                    >
                                        {promo.label || 'Deals'}
                                    </a>
                                ) : (
                                    <NavLink
                                        to={promo.url}
                                        className={() =>
                                            `inline-flex items-center justify-center rounded-md font-semibold crt-strong ${sizeClasses} ${colorBase}`
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
                                        className={`inline-flex items-center justify-center rounded-md font-semibold crt-strong ${sizeClasses} ${colorBase}`}
                                    >
                                        {promo.label || 'Deals'}
                                    </a>
                                ) : (
                                    <NavLink
                                        to={promo.url}
                                        className={() =>
                                            `inline-flex items-center justify-center rounded-md font-semibold crt-strong ${sizeClasses} ${colorBase}`
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
