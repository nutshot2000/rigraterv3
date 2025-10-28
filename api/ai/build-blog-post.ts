import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { stripHtml } from 'string-strip-html';

export const config = {
  runtime: 'nodejs',
  maxDuration: 180,
};

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-pro-latest').trim();
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

  const { source, type } = req.body || {}; // source can be URL or topic

  if (!source || !type) {
    return res.status(400).json({ error: 'Missing source or type' });
  }

  let context = '';
  let extractedCoverUrl: string | null = null;
  if (type === 'url') {
    const htmlContent = await fetchPageContent(source);
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
    You are an expert tech blogger and SEO specialist for a website called RIGRATER, which focuses on PC hardware, gaming peripherals, and tech reviews.
    Your tone is knowledgeable, engaging, slightly informal, and persuasive, aiming to help readers make informed purchasing decisions.
    
    ${context}
    
    Please generate a complete blog post. The output must be a single, clean JSON object and nothing else.
    
    The JSON object must have the following structure:
    {
      "title": "string",
      "slug": "string (kebab-case, based on title)",
      "summary": "string (A concise, compelling summary of the article, 2-3 sentences max).",
      "content": "string (Full blog post content in Markdown format. It should be well-structured with headings, paragraphs, lists, etc. Keep it tight: 700-900 words.)",
      "seoTitle": "string (An SEO-optimized title, 60 characters max).",
      "seoDescription": "string (An SEO-optimized meta description, 160 characters max).",
      "cover_image_url": "string (A suggested Unsplash or Pexels search query for a relevant, high-quality cover image. For example: 'gaming keyboard RGB' or 'man building custom PC')."
    }

    Guidelines for the content:
    - **Title:** Make it catchy and relevant.
    - **Content (Markdown):** 
      - Start with an engaging introduction.
      - Use headings (##), subheadings (###), bold text (**), and bullet points (*) to structure the content.
      - Ensure the information is accurate and up-to-date.
      - If rewriting from a URL, do not plagiarize. Synthesize the information and present it in your own unique voice and structure.
      - End with a strong conclusion and a call-to-action if appropriate (e.g., "Check out our latest reviews" or "What do you think? Let us know in the comments!").
      - Aim for 700-900 words (concise, no fluff).
    - **SEO:** Title and description should be optimized for search engines, using relevant keywords naturally.
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

    // Clean the response text to ensure it's valid JSON
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const blogPost = JSON.parse(cleanJson);
    if ((!blogPost.cover_image_url || /^\w+(?:\s|$)/.test(blogPost.cover_image_url)) && extractedCoverUrl) {
      blogPost.cover_image_url = extractedCoverUrl;
    }

    return res.status(200).json(blogPost);
  } catch (error: any) {
    console.error('Error generating blog post:', error);
    return res.status(500).json({ error: 'Failed to generate blog post content from AI.', details: error?.message || String(error) });
  }
}
