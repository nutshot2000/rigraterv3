import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/public/Header';
import Footer from './components/public/Footer';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import ComparisonsPage from './pages/ComparisonsPage';
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
import { Page, Product, BlogPost } from './types';
import ToastContainer from './components/shared/ToastContainer';

const AppContent: React.FC = () => {
    const { page, setPage } = useApp();
    const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            const target = e.target as HTMLElement | null;
            const tag = (target?.tagName || '').toLowerCase();
            const isTyping = tag === 'input' || tag === 'textarea' || (target?.isContentEditable ?? false);
            if (isTyping) return;
            const map: Record<string, Page> = {
                '1': Page.HOME,
                '2': Page.CATEGORIES,
                '3': Page.BLOG,
                '4': Page.COMPARISONS,
                '5': Page.ADMIN,
            };
            const next = map[e.key];
            if (next) {
                e.preventDefault();
                setPage(next);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [setPage]);

    const renderPage = () => {
        if (selectedBlogPost) {
            return <BlogPostPage post={selectedBlogPost} onBack={() => setSelectedBlogPost(null)} />;
        }

        switch (page) {
            case Page.HOME:
                return <HomePage />;
            case Page.ADMIN:
                return <AdminPage />;
            case Page.CATEGORIES:
                return <CategoriesPage />;
            case Page.BLOG:
                return <BlogPage onSelectPost={setSelectedBlogPost} />;
            case Page.COMPARISONS:
                return <ComparisonsPage />;
            default:
                return <HomePage />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen text-gray-100 theme-blueprint bg-grid bg-noise bg-crt-dark">
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