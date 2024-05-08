import { TodoItem } from "./util";

async function createTask(linearClient: any, task: TodoItem) {
    const { id: teamId } = (await linearClient.teams()).nodes[0];
    // const { id: projectId } = (await linearClient.projects()).nodes[0];
    const { id: assigneeId } = await linearClient.viewer;

    if (teamId) {
        await linearClient.createIssue({
            teamId,
            // projectId,
            assigneeId,
            priority: 2,  // HIGH priority
            title: task.title,
            description: task.description,
        });
        // Delay to simulate a wait of 1 second
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

export async function processTasks(linearClient: any, taskArray: TodoItem[]) {
    for (const task of taskArray) {
        await createTask(linearClient, task);
    }
    console.log(`${taskArray.length} tasks created!`);
}
