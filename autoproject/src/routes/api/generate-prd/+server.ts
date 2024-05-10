import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePrdContent, PRD_FORMAT_PROMPT } from '$lib';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { requirements } = await request.json();
        if (!requirements || typeof requirements !== 'string') {
            return new Response(JSON.stringify({ error: "Invalid or missing requirements data." }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        const prd = await generatePrdContent(model, `${requirements} ${PRD_FORMAT_PROMPT}`);
        return new Response(JSON.stringify({ prd }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("Error generating PRD:", error);
        return new Response(JSON.stringify({ error: "An error occurred while generating the PRD." }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
