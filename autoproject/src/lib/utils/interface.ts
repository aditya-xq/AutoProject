export interface UserStory {
    title: string
    description: string
}

export interface ProjectDetails {
    name: string
    description: string
}

export interface GeneratePrdResponse {
    prd: string
    projectDetails: {
        name: string
        description: string
    }
}