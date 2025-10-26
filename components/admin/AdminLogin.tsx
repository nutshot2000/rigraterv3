import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LockClosedIcon } from '../public/Icons';
import { ADMIN_PASSWORD } from '../../constants';
import { isBackendEnabled } from '../../services/supabaseClient';

const AdminLogin: React.FC = () => {
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const { login } = useApp();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const ok = await login(password, isBackendEnabled ? email : undefined);
        if (!ok) {
            setError('Incorrect credentials. Please try again.');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-gray-800 rounded-lg border border-gray-700 shadow-2xl shadow-black/30 animate-fade-in">
            <div className="text-center mb-8">
                <LockClosedIcon className="w-12 h-12 mx-auto text-teal-400" />
                <h2 className="text-3xl font-bold text-white mt-4">Admin Access</h2>
                <p className="text-gray-400 text-xs mt-2">
                    {isBackendEnabled ? 'Supabase mode: sign in with your Supabase email + password' : 'Local mode: use the local admin password'}
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                {isBackendEnabled && (
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                )}
                <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                        placeholder="••••••••"
                        required
                    />
                </div>
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-4 animate-fade-in" role="alert">
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                >
                    Login
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;