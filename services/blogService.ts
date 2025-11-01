import { supabase, isBackendEnabled } from './supabaseClient';
import { BlogPost } from '../types';

// Fetch latest blog posts from Supabase
export async function fetchBlogPosts(): Promise<BlogPost[]> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map(mapRowToBlogPost);
}

export async function createBlogPost(input: Omit<BlogPost, 'id' | 'createdAt'>): Promise<BlogPost> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        slug: input.slug,
        cover_image_url: input.coverImageUrl,
        summary: input.summary,
        content: input.content,
        tags: input.tags || [],
        blog_images: (input as any).blogImages || [],
        seo_title: input.seoTitle || '',
        seo_description: input.seoDescription || '',
    };
    const { data, error } = await supabase
        .from('blog_posts')
        .insert(payload)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToBlogPost(data as any);
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
    if (error) {
        // PostgREST not found code can vary; return null on not found
        if ((error as any).code === 'PGRST116' || (error as any).details?.includes('Results contain 0 rows')) {
            return null;
        }
        throw error;
    }
    if (!data) return null;
    return mapRowToBlogPost(data as any);
}

export async function updateBlogPostById(id: string, input: Omit<BlogPost, 'id' | 'createdAt'>): Promise<BlogPost> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        slug: input.slug,
        cover_image_url: input.coverImageUrl,
        summary: input.summary,
        content: input.content,
        tags: input.tags || [],
        blog_images: (input as any).blogImages || [],
        seo_title: input.seoTitle || '',
        seo_description: input.seoDescription || '',
    };
    const { data, error } = await supabase
        .from('blog_posts')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToBlogPost(data as any);
}

export async function deleteBlogPostById(id: string): Promise<void> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
}

function mapRowToBlogPost(row: any): BlogPost {
    return {
        id: String(row.id),
        title: row.title,
        slug: row.slug || '',
        coverImageUrl: row.cover_image_url || '',
        summary: row.summary || '',
        content: row.content || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        blogImages: Array.isArray(row.blog_images) ? row.blog_images : [],
        createdAt: row.created_at,
        seoTitle: row.seo_title || '',
        seoDescription: row.seo_description || '',
        author_id: row.author_id,
        published_at: row.published_at,
    };
}


