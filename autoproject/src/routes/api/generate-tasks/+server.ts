
import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateTaskArray, TASKS_CREATION_PROMPT } from '$lib';

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { prd } = await request.json();
        if (!prd || typeof prd !== 'string') {
            return new Response(JSON.stringify({ error: "Invalid or missing PRD data." }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        const tasks = await generateTaskArray(model, `${prd} ${TASKS_CREATION_PROMPT}`);
        return new Response(JSON.stringify({ tasks }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("Error generating tasks:", error);
        return new Response(JSON.stringify({ error: "An error occurred while generating the tasks." }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
