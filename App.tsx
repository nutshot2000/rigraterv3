import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/public/Header';
import Footer from './components/public/Footer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import DealsPage from './pages/DealsPage';
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
import ToastContainer from './components/shared/ToastContainer';
import { HelmetProvider } from 'react-helmet-async';
import GoogleAnalytics from './components/shared/GoogleAnalytics';
import AdminLogin from './components/admin/AdminLogin';

const AdminGate: React.FC = () => {
    const { isAuthenticated } = useApp();
    if (!isAuthenticated) {
        return <AdminLogin />;
    }
    return (
        <Suspense fallback={<div className="py-20 text-center">Loading…</div>}>
            <AdminPage />
        </Suspense>
    );
};

const ScrollToTop: React.FC = () => {
    const { pathname, search } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [pathname, search]);
    return null;
};

const App: React.FC = () => {
    return (
        <HelmetProvider>
            <GoogleAnalytics />
            <AppProvider>
                <BrowserRouter>
                    <ScrollToTop />
                    <div className="flex flex-col min-h-screen text-gray-100 theme-blueprint bg-grid bg-noise bg-crt-dark">
                        <Header />
                        <main className="flex-grow container mx-auto px-4 py-8">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/blog" element={<BlogPage />} />
                                <Route path="/deals" element={<DealsPage />} />
                                <Route path="/products/:slug" element={<ProductPage />} />
                                <Route path="/blog/:slug" element={<BlogPostPage />} />
                                <Route path="/admin" element={<AdminGate />} />
                            </Routes>
                        </main>
                        <Footer />
                        <ToastContainer />
                    </div>
                </BrowserRouter>
            </AppProvider>
        </HelmetProvider>
    );
};

export default App;