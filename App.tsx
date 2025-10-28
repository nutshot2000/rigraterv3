import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/public/Header';
import Footer from './components/public/Footer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import AdminPage from './pages/AdminPage';
import ToastContainer from './components/shared/ToastContainer';
import { HelmetProvider } from 'react-helmet-async';
import { Page } from './types';

const AppContent: React.FC = () => {
    const { page, setPage } = useApp();
    const navigate = useNavigate();

    React.useEffect(() => {
        switch (page) {
            case Page.HOME:
                navigate('/');
                break;
            case Page.ADMIN:
                navigate('/admin');
                break;
            // Add other cases here
        }
    }, [page, navigate]);

    return (
        <div className="flex flex-col min-h-screen text-gray-100 theme-blueprint bg-grid bg-noise bg-crt-dark">
            <Header onNavigate={setPage} currentPage={page} />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products/:slug" element={<ProductPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                </Routes>
            </main>
            <Footer onNavigate={setPage} />
            <ToastContainer />
        </div>
    );
};

const App: React.FC = () => (
    <HelmetProvider>
        <AppProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </AppProvider>
    </HelmetProvider>
);

export default App;