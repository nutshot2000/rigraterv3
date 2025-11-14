
export interface Product {
    id: string;
    name: string;
    category: string;
    price: string;
    imageUrl: string; // This will be deprecated and replaced by imageUrls
    imageUrls: string[];
    affiliateLink: string;
    review: string;
    specifications: string;
    brand?: string;
    slug?: string;
    priceHistory?: PricePoint[];
    seoTitle?: string;
    seoDescription?: string;
    // Short, benefit-led summary and bullets to reduce bounce on product pages
    quickVerdict?: string;
    prosShort?: string;
    consShort?: string;
    // Used for homepage/editor picks later if needed
    isFeatured?: boolean;
}

export enum Page {
    HOME = 'HOME',
    ADMIN = 'ADMIN',
    ADMIN_AI_PRODUCT = 'ADMIN_AI_PRODUCT',
    ADMIN_MANAGE_PRODUCTS = 'ADMIN_MANAGE_PRODUCTS',
    ADMIN_AI_BLOG = 'ADMIN_AI_BLOG',
    ADMIN_MANAGE_POSTS = 'ADMIN_MANAGE_POSTS',
    // legacy aliases kept for compatibility
    ADMIN_PRODUCTS = 'ADMIN_MANAGE_PRODUCTS',
    ADMIN_BLOG = 'ADMIN_AI_BLOG',
    CATEGORIES = 'CATEGORIES',
    BLOG = 'BLOG',
    COMPARISONS = 'COMPARISONS'
}

export interface PricePoint {
    date: string; // ISO 8601
    price: number;
}

export interface User {
    id: string;
    email?: string;
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
    author_id?: string;
    published_at?: string;
    blogImages?: string[]; // Array of additional blog images
    seoTitle?: string;
    seoDescription?: string;
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
    name: string;
    category: string;
    price: string;
    imageUrl: string; // This will be deprecated and replaced by imageUrls
    imageUrls: string[];
    affiliateLink: string;
    review: string;
    specifications: string; // comma-separated key:value pairs
    brand?: string;
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
}

export interface AISuggestedProduct {
    name: string;
    category: string;
    imageUrl: string; // This will be deprecated and replaced by imageUrls
    imageUrls: string[];
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}
