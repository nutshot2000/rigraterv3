import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/public/Header';
import Footer from './components/public/Footer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import BlogPage from './pages/BlogPage';
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
import ToastContainer from './components/shared/ToastContainer';
import { HelmetProvider } from 'react-helmet-async';
import GoogleAnalytics from './components/shared/GoogleAnalytics';

const App: React.FC = () => {
    return (
        <HelmetProvider>
            <GoogleAnalytics />
            <AppProvider>
                <BrowserRouter>
                    <div className="flex flex-col min-h-screen text-gray-100 theme-blueprint bg-grid bg-noise bg-crt-dark">
                        <Header />
                        <main className="flex-grow container mx-auto px-4 py-8">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/blog" element={<BlogPage />} />
                                <Route path="/products/:slug" element={<ProductPage />} />
                                <Route path="/admin" element={
                                    <Suspense fallback={<div className="py-20 text-center">Loading…</div>}>
                                        <AdminPage />
                                    </Suspense>
                                } />
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