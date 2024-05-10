// Define the structure for the expected JSON objects
export interface TodoItem {
    title: string;
    description: string;
}

// Helper function to validate and parse JSON array input
export function validateAndParseJsonArray(jsonString: string): TodoItem[] | null {
    try {
        // Extract JSON from within code fences if present
        const codeFenceStart = "```json";
        const codeFenceEnd = "```";
        if (jsonString.startsWith(codeFenceStart) && jsonString.endsWith(codeFenceEnd)) {
            jsonString = jsonString.substring(codeFenceStart.length, jsonString.length - codeFenceEnd.length).trim();
        }

        // Parse the JSON string into an array
        const jsonArray = JSON.parse(jsonString);
        if (!Array.isArray(jsonArray)) throw new Error("Provided JSON is not an array.");

        // Validate each object in the array
        jsonArray.forEach((item, index) => {
            if (!item || typeof item !== 'object') throw new Error(`Item at index ${index} is not an object.`);
            if (!item.title || typeof item.title !== 'string') throw new Error(`Item at index ${index} does not have a valid 'title' property.`);
            if (!item.description || typeof item.description !== 'string') throw new Error(`Item at index ${index} does not have a valid 'description' property.`);
        });

        // Return the parsed and validated array
        return jsonArray as TodoItem[];
    } catch (error) {
        console.error("Validation failed:", (error as Error).message);
        return null;
    }
}
