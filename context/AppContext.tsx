import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Product, Page, ToastMessage, BlogPost, ComparisonDoc, AuditEntry } from '../types';
import { MOCK_PRODUCTS } from '../services/mockData';
import { ADMIN_PASSWORD } from '../constants';
import { isBackendEnabled } from '../services/supabaseClient';
import { fetchProducts, createProduct as createProductApi, updateProductById, deleteProductById } from '../services/productService';
import { loginWithEmailPassword, logoutSession } from '../services/authService';

const MAX_COMPARISON_ITEMS = 3;

interface AppContextType {
    products: Product[];
    addProduct: (productData: Omit<Product, 'id'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string) => void;
    
    isAuthenticated: boolean;
    login: (password: string, email?: string) => Promise<boolean>;
    logout: () => void;
    
    toasts: ToastMessage[];
    addToast: (message: string, type: ToastMessage['type']) => void;
    removeToast: (id: number) => void;
    
    page: Page;
    setPage: (page: Page) => void;
    
    comparisonList: Product[];
    addToComparison: (product: Product) => void;
    removeFromComparison: (productId: string) => void;
    clearComparison: () => void;

    blogPosts: BlogPost[];
    addBlogPost: (post: Omit<BlogPost, 'id' | 'createdAt'>) => void;
    updateBlogPost: (post: BlogPost) => void;
    deleteBlogPost: (id: string) => void;

    comparisons: ComparisonDoc[];
    addComparisonDoc: (doc: Omit<ComparisonDoc, 'id' | 'createdAt'>) => void;
    updateComparisonDoc: (doc: ComparisonDoc) => void;
    deleteComparisonDoc: (id: string) => void;

    preferredRegion: 'US' | 'UK';
    setPreferredRegion: (r: 'US' | 'UK') => void;

    audits: AuditEntry[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>(() => {
        try {
            const stored = localStorage.getItem('products');
            if (stored) {
                const parsed = JSON.parse(stored) as Product[];
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return MOCK_PRODUCTS;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [page, setPage] = useState<Page>(Page.HOME);
    const [comparisonList, setComparisonList] = useState<Product[]>(() => {
        try {
            const stored = localStorage.getItem('comparisonList');
            if (stored) {
                const parsed = JSON.parse(stored) as Product[];
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [];
    });

    const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
        try { const s = localStorage.getItem('blogPosts'); if (s) return JSON.parse(s); } catch {}
        return [];
    });

    const [comparisons, setComparisons] = useState<ComparisonDoc[]>(() => {
        try { const s = localStorage.getItem('comparisons'); if (s) return JSON.parse(s); } catch {}
        return [];
    });

    const [preferredRegion, setPreferredRegionState] = useState<'US' | 'UK'>(() => {
        try { const s = localStorage.getItem('preferredRegion'); if (s === 'US' || s === 'UK') return s; } catch {}
        // Browser-based detection fallback
        try {
            const host = window.location.hostname;
            if (host.endsWith('.co.uk') || host.endsWith('.uk')) return 'UK';
            const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).map(l => l.toLowerCase());
            if (langs.some(l => l.endsWith('-gb') || l === 'en-gb')) return 'UK';
            return 'US';
        } catch { return 'US'; }
    });

    const [audits, setAudits] = useState<AuditEntry[]>(() => {
        try { const s = localStorage.getItem('audits'); if (s) return JSON.parse(s); } catch {}
        return [];
    });

    const recordAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'ts' | 'actor'>) => {
        const full: AuditEntry = { id: Date.now().toString(), ts: new Date().toISOString(), actor: 'admin', ...entry };
        setAudits(prev => [full, ...prev].slice(0, 500));
    }, []);

    // Product Management
    const addProduct = useCallback((productData: Omit<Product, 'id'>) => {
        if (isBackendEnabled) {
            // Fire-and-forget; optimistic update
            (async () => {
                try {
                    const created = await createProductApi(productData);
                    setProducts(prev => [created, ...prev]);
                    recordAudit({ action: 'product.create', targetType: 'product', targetId: created.id, details: { name: created.name } });
                } catch {
                    // fallback to local optimistic add
                    const newProduct: Product = { id: Date.now().toString(), ...productData };
                    setProducts(prev => [newProduct, ...prev]);
                    recordAudit({ action: 'product.create', targetType: 'product', targetId: newProduct.id, details: { name: newProduct.name } });
                }
            })();
        } else {
            const newProduct: Product = {
                id: Date.now().toString(),
                ...productData,
            };
            setProducts(prev => [newProduct, ...prev]);
            recordAudit({ action: 'product.create', targetType: 'product', targetId: newProduct.id, details: { name: newProduct.name } });
        }
    }, []);

    const updateProduct = useCallback((updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        recordAudit({ action: 'product.update', targetType: 'product', targetId: updatedProduct.id, details: { name: updatedProduct.name } });
        if (isBackendEnabled) {
            (async () => {
                try {
                    await updateProductById(updatedProduct.id, { ...updatedProduct, id: undefined as any });
                } catch {}
            })();
        }
    }, []);

    const deleteProduct = useCallback((productId: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        recordAudit({ action: 'product.delete', targetType: 'product', targetId: productId });
        if (isBackendEnabled) {
            (async () => {
                try { await deleteProductById(productId); } catch {}
            })();
        }
    }, []);

    // Authentication
    const login = async (password: string, email?: string): Promise<boolean> => {
        if (isBackendEnabled && email) {
            const ok = await loginWithEmailPassword(email, password);
            if (ok) {
                setIsAuthenticated(true);
                setPage(Page.ADMIN);
                return true;
            }
            return false;
        }
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPage(Page.ADMIN);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        setPage(Page.HOME);
        if (isBackendEnabled) {
            void logoutSession();
        }
    };
    
    // Toast Notifications
    const addToast = useCallback((message: string, type: ToastMessage['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Comparison Management
    const addToComparison = useCallback((product: Product) => {
        if (comparisonList.length < MAX_COMPARISON_ITEMS && !comparisonList.find(p => p.id === product.id)) {
            setComparisonList(prev => [...prev, product]);
            addToast(`${product.name} added to comparison.`, 'info');
        } else if (comparisonList.length >= MAX_COMPARISON_ITEMS) {
             addToast(`You can only compare up to ${MAX_COMPARISON_ITEMS} products.`, 'error');
        } else {
             addToast(`${product.name} is already in the comparison list.`, 'info');
        }
    }, [comparisonList, addToast]);

    const removeFromComparison = useCallback((productId: string) => {
        setComparisonList(prev => prev.filter(p => p.id !== productId));
    }, []);

    const clearComparison = useCallback(() => {
        setComparisonList([]);
    }, []);

    // Blog Management
    const addBlogPost = useCallback((post: Omit<BlogPost, 'id' | 'createdAt'>) => {
        const newPost: BlogPost = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...post };
        setBlogPosts(prev => [newPost, ...prev]);
        recordAudit({ action: 'blog.create', targetType: 'blog', targetId: newPost.id, details: { title: newPost.title } });
    }, []);

    const updateBlogPost = useCallback((post: BlogPost) => {
        setBlogPosts(prev => prev.map(p => p.id === post.id ? post : p));
        recordAudit({ action: 'blog.update', targetType: 'blog', targetId: post.id, details: { title: post.title } });
    }, []);

    const deleteBlogPost = useCallback((id: string) => {
        setBlogPosts(prev => prev.filter(p => p.id !== id));
        recordAudit({ action: 'blog.delete', targetType: 'blog', targetId: id });
    }, []);

    // Comparison Docs
    const addComparisonDoc = useCallback((doc: Omit<ComparisonDoc, 'id' | 'createdAt'>) => {
        const newDoc: ComparisonDoc = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...doc };
        setComparisons(prev => [newDoc, ...prev]);
        recordAudit({ action: 'comparison.create', targetType: 'comparison', targetId: newDoc.id, details: { title: newDoc.title } });
    }, []);

    const updateComparisonDoc = useCallback((doc: ComparisonDoc) => {
        setComparisons(prev => prev.map(d => d.id === doc.id ? doc : d));
        recordAudit({ action: 'comparison.update', targetType: 'comparison', targetId: doc.id, details: { title: doc.title } });
    }, []);

    const deleteComparisonDoc = useCallback((id: string) => {
        setComparisons(prev => prev.filter(d => d.id !== id));
        recordAudit({ action: 'comparison.delete', targetType: 'comparison', targetId: id });
    }, []);

    // Persistence
    useEffect(() => {
        try {
            localStorage.setItem('products', JSON.stringify(products));
        } catch {}
    }, [products]);

    useEffect(() => {
        try {
            localStorage.setItem('comparisonList', JSON.stringify(comparisonList));
        } catch {}
    }, [comparisonList]);

    useEffect(() => {
        try { localStorage.setItem('blogPosts', JSON.stringify(blogPosts)); } catch {}
    }, [blogPosts]);

    useEffect(() => {
        try { localStorage.setItem('comparisons', JSON.stringify(comparisons)); } catch {}
    }, [comparisons]);

    useEffect(() => {
        try { localStorage.setItem('preferredRegion', preferredRegion); } catch {}
    }, [preferredRegion]);

    useEffect(() => {
        try { localStorage.setItem('audits', JSON.stringify(audits)); } catch {}
    }, [audits]);

    // Backend bootstrap
    useEffect(() => {
        if (!isBackendEnabled) return;
        (async () => {
            try {
                const remote = await fetchProducts();
                if (Array.isArray(remote) && remote.length) {
                    setProducts(remote);
                }
            } catch {}
        })();
    }, []);


    const value = {
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        isAuthenticated,
        login,
        logout,
        toasts,
        addToast,
        removeToast,
        page,
        setPage,
        comparisonList,
        addToComparison,
        removeFromComparison,
        clearComparison,
        blogPosts,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        comparisons,
        addComparisonDoc,
        updateComparisonDoc,
        deleteComparisonDoc,
        preferredRegion,
        setPreferredRegion: setPreferredRegionState,
        audits,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};