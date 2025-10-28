
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    const { isAuthenticated } = useApp();
    return (
        <footer className="bg-gray-800 border-t border-gray-700 mt-12">
            <div className="container mx-auto py-6 px-4 text-center text-gray-400">
                <p>&copy; {new Date().getFullYear()} AI PC Parts. All rights reserved.</p>
                <p className="text-sm mt-1">
                    Powered by React, Tailwind CSS, and Gemini AI.
                </p>
                 <p className="text-xs mt-2">As an Amazon Associate, we earn from qualifying purchases.</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                    <Link
                        to="/admin"
                        className="text-slate-500 hover:text-slate-300 underline decoration-dotted"
                        title="Staff access"
                    >
                        Staff
                    </Link>
                    {isAuthenticated && (
                        <span className="px-2 py-0.5 rounded-full border border-slate-600 text-slate-400">Logged in</span>
                    )}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
