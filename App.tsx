import React, { useState, useCallback, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/public/Header';
import Footer from './components/public/Footer';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import BlogPage from './pages/BlogPage';
import ComparisonsPage from './pages/ComparisonsPage';
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
import { Page } from './types';
import ToastContainer from './components/shared/ToastContainer';

const AppContent: React.FC = () => {
    const { page, setPage } = useApp();

    const renderPage = () => {
        switch (page) {
            case Page.HOME:
                return <HomePage />;
            case Page.ADMIN:
                return <AdminPage />;
            case Page.CATEGORIES:
                return <CategoriesPage />;
            case Page.BLOG:
                return <BlogPage />;
            case Page.COMPARISONS:
                return <ComparisonsPage />;
            default:
                return <HomePage />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 theme-teal bg-grid bg-noise">
            <Header onNavigate={setPage} currentPage={page} />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Suspense fallback={<div className="py-20 text-center">Loading…</div>}>
                    {renderPage()}
                </Suspense>
            </main>
            <Footer />
            <ToastContainer />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;