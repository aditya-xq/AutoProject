import { env } from "$env/dynamic/private"
import { createResponse } from "$lib"
import type { ProjectDetails } from "$lib/utils/interface"
import { LinearClient } from "@linear/sdk"

export const createLinearProject = async (projectDetails: ProjectDetails, prd: string) => {
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const teams = await linearClient.teams()
    const team = teams.nodes[0]
    const userId  = (await linearClient.viewer).id
    if (team.id) {
        const projectResponse = await linearClient.createProject({
            name: projectDetails.name,
            teamIds: [team.id],
            description: projectDetails.description,
            leadId: userId,
        })
        if (!projectResponse.success) {
            throw new Error('Failed to create project')
        }
        const documentResponse = await linearClient.createDocument({
            title: `PRD: ${projectDetails.name}`,
            content: prd,
            projectId: (await projectResponse.project)?.id,
        })
        if (!documentResponse.success) {
            throw new Error('Failed to create PRD')
        }
        // Create user stories as issues under the newly created project
        for (const userStory of projectDetails.userStories) {
            const issueResponse = await linearClient.createIssue({
                title: userStory.title,
                description: userStory.description,
                teamId: team.id,
                projectId: (await projectResponse.project)?.id,
                assigneeId: userId,
            })
            if (!issueResponse.success) {
                throw new Error(`Failed to create user story.`)
            }
        }
        return createResponse(`Project created successfully.`, 200)
    }
}

export const updateLinearProject = async (projectId: string, featureDetails: ProjectDetails, prd: string) => {
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const teams = await linearClient.teams()
    const team = teams.nodes[0]
    const userId  = (await linearClient.viewer).id
    if (team.id) {
        const documentResponse = await linearClient.createDocument({
            title: `Feature PRD: ${featureDetails.name}`,
            content: prd,
            projectId: projectId,
        })
        if (!documentResponse.success) {
            throw new Error('Failed to create Feature PRD')
        }
        // Create new user stories under the existing project
        for (const userStory of featureDetails.userStories) {
            const issueResponse = await linearClient.createIssue({
                title: userStory.title,
                description: userStory.description,
                teamId: team.id,
                projectId: projectId,
                assigneeId: userId,
            })
            if (!issueResponse.success) {
                throw new Error(`Failed to create user story.`)
            }
        }
        return createResponse(`Project updated successfully.`, 200)
    }
}

export const getAllLinearProjects = async () => {
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const projectResponse = await linearClient.projects()
    const projects = await Promise.all(projectResponse.nodes.map(async (project) => {
        const issues = await project.issues()
        const projectIssues = issues.nodes.map((issue) => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            url: issue.url,
            updatedAt: issue.updatedAt,
            completedAt: issue.completedAt,
        }))
        
        return {
            id: project.id,
            name: project.name,
            description: project.description,
            url: project.url,
            updatedAt: project.updatedAt,
            issues: projectIssues,
        }
    }))
    return projects
}

export const markIssueAsCompleted = async (issueId: string) => {
    const DEFAULT_ID_FOR_COMPLETED = "3c08af79-7b48-47bd-9c2f-ca1733a7866c"
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const issueResponse = await linearClient.updateIssue(issueId, {
        stateId: DEFAULT_ID_FOR_COMPLETED,
    })
    return issueResponse
}

export const unmarkIssueAsCompleted = async (issueId: string) => {
    const DEFAULT_ID_FOR_BACKLOG = "776a627c-9985-466b-a0da-566e2c760e81"
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const issueResponse = await linearClient.updateIssue(issueId, {
        stateId: DEFAULT_ID_FOR_BACKLOG,
    })
    return issueResponse
}

export const deleteLinearIssue = async (issueId: string) => {
    const linearClient = new LinearClient({ apiKey: env.SECRET_LINEAR_API_KEY })
    const issueResponse = await linearClient.deleteIssue(issueId)
    return issueResponse
}
