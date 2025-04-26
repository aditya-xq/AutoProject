import { createResponse, createValidationError } from '$lib'
import { createLinearProject, getAllLinearProjects, updateLinearProject } from '$lib/integrations/linear'
import type { RequestHandler } from '@sveltejs/kit'
// import { createJiraProject } from '$lib/integrations/jira'
// import { createAsanaProject } from '$lib/integrations/asana'
// import { createPlaneProject } from '$lib/integrations/plane'
// import { createTaskTabProject } from '$lib/integrations/tasktab'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { projectId, projectDetails, prd, tool } = await request.json()

        let response
        
        switch (tool) {
            case 'Linear':
                response = projectId ? await updateLinearProject(projectId, projectDetails, prd) : await createLinearProject(projectDetails, prd)
                break
            // case 'Jira':
            //     response = await createJiraProject(projectDetails, userStories)
            //     break
            // case 'Asana':
            //     response = await createAsanaProject(projectDetails, userStories)
            //     break
            // case 'Plane':
            //     response = await createPlaneProject(projectDetails, userStories)
            //     break
            // case 'TaskTab':
            //     response = await createTaskTabProject(projectDetails, userStories)
            //     break
            default:
                throw createValidationError('Invalid tool selected', 400)
            }
            return createResponse(response, 200)
    } catch (error: any) {
        return createResponse(error.message || 'Internal server error', error.code || 500)
    }
}

export const GET: RequestHandler = async ({ url }) => {
    try {
        const tool = url.searchParams.get('tool')
        let response
        switch (tool) {
            case 'Linear':
                response = await getAllLinearProjects()
                break
            // case 'Jira':
            //     response = await getAllJiraProjects()
            //     break
            // case 'Asana':
            //     response = await getAllAsanaProjects()
            //     break
            // case 'Plane':
            //     response = await getAllPlaneProjects()
            //     break
            // case 'TaskTab':
            //     response = await getAllTaskTabProjects()
            //     break
            default:
                throw createValidationError('Invalid tool selected', 400)
            }
        return createResponse(response, 200)
    } catch (error: any) {
        return createResponse(error.message || 'Internal server error', error.code || 500)
    }
}