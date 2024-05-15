import { LinearClient } from "@linear/sdk";
import type { ProjectManagementTool } from "./utils/types";
import type { ProjectCreateInput } from "@linear/sdk/dist/_generated_documents";
import { type UserStory } from "$lib";

// Utility function to fetch initial configuration data in Linear
async function fetchInitialData(linearClient: LinearClient) {
    const [teamData, viewerData] = await Promise.all([
        linearClient.teams(),
        linearClient.viewer,
    ]);
    if (!teamData.nodes[0]?.id || !viewerData.id) {
        throw new Error("Failed to fetch initial data from Linear");
    }
    return {
        teamId: teamData.nodes[0]?.id,
        assigneeId: viewerData.id,
    };
}

// Function to create a new linear project
async function createProject(linearClient: LinearClient, teamId: string, assigneeId: string, projectCreateInput: ProjectCreateInput) {
    if (!teamId || !assigneeId) {
        throw new Error("Missing required team or assignee ID for project creation.");
    }
    return await linearClient.createProject({
        teamIds : [teamId],
        leadId: assigneeId,
        name: projectCreateInput.name,
        description: projectCreateInput.description
    });
}

// Main function to create stories
export async function createStories(tool: ProjectManagementTool, projectDetails: ProjectCreateInput, userStories: UserStory[]) {
    try {
        if (tool !== 'Linear') {
            throw new Error(`Integration with ${tool} is not yet complete. Stay tuned for future updates.`);
        }

        const linearApiKey = process.env.VITE_LINEAR_API_KEY;
        if (!linearApiKey) {
            throw new Error("Linear API key is not configured.");
        }

        const linearClient = new LinearClient({ apiKey: linearApiKey });

        const { teamId, assigneeId } = await fetchInitialData(linearClient);

        const project = await createProject(linearClient, teamId, assigneeId, projectDetails);
        const projectId = project._project.id;

        const result = await Promise.all(userStories.map(story => 
            linearClient.createIssue({
                teamId,
                assigneeId,
                projectId,
                title: story.title,
                description: story.description,
            })
        ));

        return {
            message: "Operation successful",
            status: 200,
            data: result
        };
    } catch (error: any) {
        return {
            error: `Operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            status: 500
        };
    }
}
