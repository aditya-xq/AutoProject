import type { RequestHandler } from '@sveltejs/kit';
import { LinearClient } from '@linear/sdk';
import { processTasks } from '$lib';

// Initialize Linear client
const linearClient = new LinearClient({ apiKey: process.env.VITE_LINEAR_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { tasks } = await request.json();
        if (!tasks) {
            return new Response(JSON.stringify({ error: "Invalid or missing task array data." }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        await processTasks(linearClient, tasks);
        return new Response(JSON.stringify({ message: `${tasks.length} tasks created successfully.` }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("Error creating tasks:", error);
        return new Response(JSON.stringify({ error: "An error occurred while creating the issues." }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
