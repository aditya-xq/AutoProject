import type { RequestHandler } from '@sveltejs/kit';
import { createResponse, createStories } from '$lib';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { tool, projectDetails, userStories } = body;
        const response = await createStories(tool, projectDetails, userStories);
        return createResponse(response, response.status);
    } catch (error: any) {
        console.error("Server error: ", error);
        return createResponse(`Server error: ${error.message}`, 500);
    }
};
