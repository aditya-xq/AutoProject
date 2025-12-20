import type { RequestHandler } from '@sveltejs/kit'
import { createResponse, createValidationError } from '$lib'
import { markIssueAsCompleted, unmarkIssueAsCompleted, deleteLinearIssue } from '$lib/integrations/linear'

export const PUT: RequestHandler = async ({ params, request }) => {
    try {
        const { issueId } = params
        const { tool, status} = await request.json()

        if (!issueId) {
            throw createValidationError('issueId is required', 400)
        }

        let response

        switch (tool) {
            case 'Linear':
                if (status === 'DONE') {
                    response = await markIssueAsCompleted(issueId)
                } else if (status === 'UNDONE') {
                    response = await unmarkIssueAsCompleted(issueId)
                }
                break
            default:
                throw createValidationError('Invalid tool selected', 400)
        }

        if (!response?.success) {
            throw new Error('Failed to mark story as completed')
        }

        return createResponse(
            {
                message: 'User story marked as completed',
                issueId
            },
            200
        )
    } catch (error: any) {
        return createResponse(
            error.message || 'Internal server error',
            error.code || 500
        )
    }
}

export const DELETE: RequestHandler = async ({ params, request }) => {
    try {
        const { issueId } = params
        const { tool } = await request.json()

        if (!issueId) {
            throw createValidationError('issueId is required', 400)
        }

        let response

        switch (tool) {
            case 'Linear':
                response = await deleteLinearIssue(issueId)
                break
            default:
                throw createValidationError('Invalid tool selected', 400)
        }

        if (!response?.success) {
            throw new Error('Failed to delete user story')
        }

        return createResponse(
            {
                message: 'User story deleted successfully',
                issueId
            },
            200
        )
    } catch (error: any) {
        return createResponse(
            error.message || 'Internal server error',
            error.code || 500
        )
    }
}
