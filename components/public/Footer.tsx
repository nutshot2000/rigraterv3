
import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-800 border-t border-gray-700 mt-12">
            <div className="container mx-auto py-6 px-4 text-center text-gray-400">
                <p>&copy; {new Date().getFullYear()} AI PC Parts. All rights reserved.</p>
                <p className="text-sm mt-1">
                    Powered by React, Tailwind CSS, and Gemini AI.
                </p>
                 <p className="text-xs mt-2">As an Amazon Associate, we earn from qualifying purchases.</p>
            </div>
        </footer>
    );
};

export default Footer;
