import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { stripHtml } from 'string-strip-html';

export const config = {
  runtime: 'nodejs',
  maxDuration: 180,
};

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-pro-latest').trim();
const AMAZON_TAG_US = (process.env.AMAZON_TAG_US || process.env.VITE_AMAZON_TAG_US || '').trim();
const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching page content:", error);
    return "";
  }
}

function sanitizeHtml(html: string): string {
    const { result, allTagLocations } = stripHtml(html, {
        stripTogetherWithTheirContents: ["script", "style", "nav", "footer", "aside"],
        ignoreTags: ['h1', 'h2', 'h3', 'h4', 'p', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'img'],
    });

    return result.replace(/\s\s+/g, ' ').trim();
}

function toSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function clampLength(str: string, max: number): string {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1).trimEnd();
}

// Extract ASIN from Amazon URL
function extractASIN(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/product\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

// Generate amazon.com affiliate link using US tag
function generateAffiliateLink(url: string): string | null {
  const asin = extractASIN(url);
  if (!asin) return null;
  const tag = AMAZON_TAG_US;
  return `https://www.amazon.com/dp/${asin}${tag ? `?tag=${tag}` : ''}`;
}

// --- Affiliate helpers (shared logic with product builder) ---
// Extract ASIN from an Amazon URL
function extractASIN(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/product\/([A-Z0-9]{10})/i);
  return match ? match[1] : null;
}

// Generate a clean amazon.com affiliate link for blog posts
function generateAffiliateLink(url: string): string | null {
  const asin = extractASIN(url);
  if (!asin) return null;
  const tag = AMAZON_TAG_US;
  return `https://www.amazon.com/dp/${asin}${tag ? `?tag=${tag}` : ''}`;
}

function normalizeBlogPost(raw: any): any {
  const post = { ...raw };
  post.title = (post.title || '').trim();
  post.slug = post.slug && String(post.slug).trim() ? post.slug : toSlug(post.title);
  post.summary = (post.summary || '').trim();
  post.content = (post.content || '').replace(/```[\s\S]*?```/g, '').trim();
  post.seoTitle = clampLength((post.seoTitle || post.title || '').trim(), 60);
  post.seoDescription = clampLength((post.seoDescription || post.summary || '').trim(), 160);
  // Keep suggested search query if present; will be proxied client-side
  if (typeof post.cover_image_url === 'string') {
    post.cover_image_url = post.cover_image_url.trim();
  }
  return post;
}

// Extract candidate image URLs from HTML (Amazon-aware)
function extractImagesFromHTML(html: string): string[] {
  const urls = new Set<string>();
  // Amazon data-old-hires
  const oldHiresMatches = [...html.matchAll(/data-old-hires\s*=\s*"(https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))"/gi)];
  oldHiresMatches.forEach(m => urls.add(m[1]));

  // Amazon dynamic image JSON
  const dynAttr = [...html.matchAll(/data-a-dynamic-image\s*=\s*"([\s\S]*?)"/gi)];
  for (const m of dynAttr) {
    try {
      const jsonText = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const obj = JSON.parse(jsonText);
      Object.keys(obj).forEach(k => urls.add(k));
    } catch {}
  }

  // hiRes in embedded JSON
  const hiResMatches = [...html.matchAll(/\"hiRes\"\s*:\s*\"(https?:\\\/[^"']+?\.(?:jpg|jpeg|png|webp))\"/gi)];
  hiResMatches.forEach(m => urls.add(m[1].replace(/\\\//g, '/')));

  // Generic <img src>
  (html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi) || []).forEach(u => urls.add(u));

  return Array.from(urls).slice(0, 20);
}


export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ai) {
    return res.status(500).json({ error: 'AI service not configured. Missing API key.' });
  }

  const { source, type, mode, urls } = req.body || {}; // source can be URL or topic

  if (!source || !type) {
    return res.status(400).json({ error: 'Missing source or type' });
  }

  let context = '';
  let extractedCoverUrl: string | null = null;
  const urlList: string[] = Array.isArray(urls) && urls.length ? urls : [source];
  const primaryUrl = urlList[0];
  const finalMode: 'review' | 'comparison' =
    mode === 'comparison' || mode === 'review'
      ? mode
      : (urlList.length > 1 ? 'comparison' : 'review');

  if (type === 'url') {
    const htmlContent = await fetchPageContent(primaryUrl);
    if (!htmlContent) {
      return res.status(500).json({ error: 'Failed to fetch content from URL' });
    }
    context = `Based on the following article content: ${sanitizeHtml(htmlContent)}`;
    try {
      const candidates = extractImagesFromHTML(htmlContent);
      // validate first working image
      for (const url of candidates) {
        let candidate = url;
        if (candidate.includes('amazon.com/images/I/')) {
          const stripped = candidate
            .replace(/\._AC_SL\d+_/i, '')
            .replace(/\._SL\d+_/i, '')
            .replace(/\._SX\d+_/i, '')
            .replace(/\._SY\d+_/i, '')
            .replace(/\._UX\d+_/i, '')
            .replace(/\._UY\d+_/i, '')
            .replace(/\._SS\d+_/i, '')
            .replace(/\._SR\d+,\d+_/i, '')
            .replace(/\._CR\d+,\d+,\d+,\d+_/i, '');
          if (stripped !== candidate) candidate = stripped;
        }
        try {
          const ok = await fetch(candidate, { method: 'HEAD' });
          if (ok.ok && (ok.headers.get('content-type') || '').startsWith('image/')) { extractedCoverUrl = candidate; break; }
        } catch {}
      }
    } catch {}
  } else {
    context = `Based on the following topic: "${source}"`;
  }
  
  const prompt = `
    You are an expert tech blogger and SEO specialist for a website called RIGRATER (PC hardware, gaming peripherals, tech reviews).
    Tone: knowledgeable, energetic, friendly, and benefit‑led. Persuasive without being pushy. Make readers feel good about choosing smartly (pride of ownership, peace of mind, future‑proof value).

    ${context}

    Please generate a complete blog post. The output must be a single, clean JSON object and nothing else. Wrap the JSON in a single \`\`\`json code block to avoid extra text.

    The JSON object must have the following structure:
    {
      "title": "string",
      "slug": "string (kebab-case, based on title)",
      "summary": "string (A concise, compelling summary of the article, 2-3 sentences max).",
      "content": "string (Full blog post content in Markdown with clear structure. Keep it tight yet substantial: 800-1100 words.)",
      "seoTitle": "string (An SEO-optimized title, <=60 characters).",
      "seoDescription": "string (An SEO-optimized meta description, <=160 characters).",
      "cover_image_url": "string (A suggested Unsplash or Pexels search query for a relevant, high-quality cover image. For example: 'gaming keyboard RGB' or 'man building custom PC')."
    }

    Guidelines for the content:
    - **Title:** Catchy and relevant.
    - **Content (Markdown):** 
      - Start with a short intro (2-3 sentences) focused on reader benefits/outcomes.
      - Include a "## Key Takeaways" section with 3-5 concise bullets.
      - Use clear H2/H3 headings, short paragraphs, and bulleted lists where helpful.
      - Include a brief "## Pros and Cons" section with 3 specific bullets each.
      - If rewriting from a URL, DO NOT copy; synthesize in a unique voice.
      - Post type: ${finalMode === 'comparison'
        ? 'Write this as a comparison between the key products referenced in the context (for example, different CPUs or GPUs). Call out which is better for which user.'
        : 'Write this as a focused review of the main product referenced in the context (for example, a single CPU or GPU). You may mention alternatives briefly, but do NOT turn this into a head-to-head comparison article.'}
      - End with a confident conclusion and a natural, non‑pushy CTA.
      - Aim for 800-1100 words (tight, no fluff; avoid filler).
    - **SEO:** Use relevant keywords naturally; no clickbait; respect length limits.
    - **Quality:** Be accurate and cautious; avoid invented metrics/benchmarks; acknowledge trade‑offs honestly.
  `;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean and robustly extract JSON object from the model response
    let blogPost: any;
    try {
      // First try: direct parse after stripping common code fences
      const stripped = responseText.replace(/```json|```/g, '').trim();
      blogPost = JSON.parse(stripped);
    } catch {
      // Fallback: find first top-level JSON object
      const match = responseText.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('Model returned no JSON object');
      }
      blogPost = JSON.parse(match[0]);
    }
    blogPost = normalizeBlogPost(blogPost);
    if ((!blogPost.cover_image_url || /^\w+(?:\s|$)/.test(blogPost.cover_image_url)) && extractedCoverUrl) {
      blogPost.cover_image_url = extractedCoverUrl;
    }

    // If this post was created from an Amazon URL, automatically inject an
    // affiliate link block so the blog page can render Buy buttons.
    if (type === 'url') {
      const affiliate = generateAffiliateLink(primaryUrl);
      if (affiliate) {
        const content: string = blogPost.content || '';
        if (!/\[links\][\s\S]*?\[\/links\]/i.test(content)) {
          blogPost.content = `${content.trim()}\n\n[links]\n${affiliate}\n[/links]\n`;
        }
      }
    }

    return res.status(200).json(blogPost);
  } catch (error: any) {
    console.error('Error generating blog post:', error);
    return res.status(500).json({ error: 'Failed to generate blog post content from AI.', details: error?.message || String(error) });
  }
}
