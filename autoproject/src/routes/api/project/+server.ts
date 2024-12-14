import { createResponse } from '$lib';
import { createLinearProject } from '$lib/integrations/linear';
import type { RequestHandler } from '@sveltejs/kit';
// import { createJiraProject } from '$lib/integrations/jira';
// import { createAsanaProject } from '$lib/integrations/asana';
// import { createPlaneProject } from '$lib/integrations/plane';
// import { createTaskTabProject } from '$lib/integrations/tasktab';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { projectDetails, userStories, tool } = await request.json();

        let response;
        
        switch (tool) {
            case 'Linear':
                response = await createLinearProject(projectDetails, userStories);
                break;
            // case 'Jira':
            //     response = await createJiraProject(projectDetails, userStories);
            //     break;
            // case 'Asana':
            //     response = await createAsanaProject(projectDetails, userStories);
            //     break;
            // case 'Plane':
            //     response = await createPlaneProject(projectDetails, userStories);
            //     break;
            // case 'TaskTab':
            //     response = await createTaskTabProject(projectDetails, userStories);
            //     break;
            default:
                return createResponse('Invalid tool selected', 400);
            }
            return createResponse(response, 200);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return createResponse(`Server error: ${errorMessage}`, 500);
    }
}
