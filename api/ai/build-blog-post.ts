import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { stripHtml } from 'string-strip-html';

export const config = {
  runtime: 'edge',
  maxDuration: 180,
};

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ],
});

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


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { source, type } = await req.json(); // source can be URL or topic

  if (!source || !type) {
    return new Response(JSON.stringify({ error: 'Missing source or type' }), { status: 400 });
  }

  let context = '';
  if (type === 'url') {
    const htmlContent = await fetchPageContent(source);
    if (!htmlContent) {
      return new Response(JSON.stringify({ error: 'Failed to fetch content from URL' }), { status: 500 });
    }
    context = `Based on the following article content: ${sanitizeHtml(htmlContent)}`;
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
      "content": "string (Full blog post content in Markdown format. It should be well-structured with headings, paragraphs, lists, etc. At least 500 words.)",
      "seoTitle": "string (An SEO-optimized title, 60 characters max).",
      "seoDescription": "string (An SEO-optimized meta description, 160 characters max).",
      "coverImageUrl": "string (A suggested Unsplash or Pexels search query for a relevant, high-quality cover image. For example: 'gaming keyboard RGB' or 'man building custom PC')."
    }

    Guidelines for the content:
    - **Title:** Make it catchy and relevant.
    - **Content (Markdown):** 
      - Start with an engaging introduction.
      - Use headings (##), subheadings (###), bold text (**), and bullet points (*) to structure the content.
      - Ensure the information is accurate and up-to-date.
      - If rewriting from a URL, do not plagiarize. Synthesize the information and present it in your own unique voice and structure.
      - End with a strong conclusion and a call-to-action if appropriate (e.g., "Check out our latest reviews" or "What do you think? Let us know in the comments!").
      - Make it comprehensive. It must be a minimum of 500 words.
    - **SEO:** Title and description should be optimized for search engines, using relevant keywords naturally.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean the response text to ensure it's valid JSON
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const cleanJson = jsonMatch ? jsonMatch[1] : responseText;
    
    const blogPost = JSON.parse(cleanJson);

    return new Response(JSON.stringify(blogPost), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error generating blog post:", error);
    return new Response(JSON.stringify({ error: 'Failed to generate blog post content from AI.' }), {
      status: 500,
    });
  }
}
