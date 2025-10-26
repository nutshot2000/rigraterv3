
export interface Product {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    price: string;
    affiliateLink: string;
    review: string;
    specifications: string;
    brand?: string;
    slug?: string;
    priceHistory?: PricePoint[];
    seoTitle?: string;
    seoDescription?: string;
}

export enum Page {
    HOME = 'HOME',
    ADMIN = 'ADMIN',
    CATEGORIES = 'CATEGORIES',
    BLOG = 'BLOG',
    COMPARISONS = 'COMPARISONS'
}

export interface PricePoint {
    date: string; // ISO date
    price: number; // USD numeric
}

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string;
    summary: string;
    content: string; // markdown
    tags: string[];
    createdAt: string; // ISO date
}

export interface ComparisonDoc {
    id: string;
    title: string;
    productIds: string[];
    content: string; // markdown
    specDiffSummary: string;
    createdAt: string; // ISO date
}

export interface AuditEntry {
    id: string;
    ts: string;
    actor: 'admin' | 'system';
    action: string; // e.g., product.create
    targetType: 'product' | 'blog' | 'comparison' | 'system';
    targetId?: string;
    details?: Record<string, any>;
}

export interface AIProductInfo {
    review: string;
    price: string;
    affiliateLink: string;
    imageUrl: string;
    specifications: string;
}

export interface AISuggestedProduct {
    name: string;
    category: string;
    imageUrl: string;
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}
