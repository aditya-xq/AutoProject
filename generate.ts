import { TodoItem, validateAndParseJsonArray } from "./util";

export async function generatePrdContent(model: any, prompt: string): Promise<string> {
    console.log("Generating PRD...");
    try {
        const prdResult = await model.generateContent(prompt);
        const prd = await prdResult.response.text();
        console.log("PRD generated successfully.");
        return prd;
    } catch (error) {
        console.error("Error during PRD generation:", error);
        throw error;
    }
}

export async function generateTaskArray(model: any, prompt: string): Promise<TodoItem[] | null> {
    console.info("Generating task array...");
    try {
        // Generate the task array content
        const taskArrayStringResult = await model.generateContent(prompt);
        // Read the response content as text
        const taskArrayString = await taskArrayStringResult.response.text();
        
        // Parse and validate the JSON array
        const taskArray = validateAndParseJsonArray(taskArrayString);

        // Check for empty or invalid results
        if (!Array.isArray(taskArray)) {
            console.warn("Parsed data is not an array or is invalid.");
            return null;
        }

        // Task array successfully generated
        console.info("Task array generated and parsed successfully.");
        return taskArray;
    } catch (error) {
        // Log any errors that occur during processing
        console.error("Error occurred while generating the task array:", error);
        return null;
    }
}

