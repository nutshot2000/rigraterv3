import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
  maxDuration: 60,
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

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { message } = await req.json();

  if (!message) {
    return new Response(JSON.stringify({ error: 'Missing message in request body' }), { status: 400 });
  }

  const prompt = `
    You are "RIGRATER AI", a helpful and creative assistant for a tech review website focused on PC hardware, gaming peripherals, and accessories.
    Your tone should be knowledgeable, enthusiastic, and slightly informal. You are brainstorming with the site owner.
    Your goal is to provide interesting ideas, suggest content, and help with creative tasks.
    Keep your responses concise, well-structured (using Markdown like lists, bold text etc.), and directly helpful.

    The user's request is: "${message}"

    Provide a helpful and creative response.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ reply: responseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error generating chat reply:", error);
    return new Response(JSON.stringify({ error: 'Failed to get a reply from AI.' }), {
      status: 500,
    });
  }
}
