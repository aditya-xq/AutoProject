import express from "express";
import cors from "cors";
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LinearClient } from '@linear/sdk';
import { generatePrdContent, generateTaskArray } from "./generate";
import { prompts } from "./prompts";
import { processTasks } from "./create";

// Load environment variables
config();

// API Keys
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const linearApiKey = process.env.LINEAR_API_KEY;

// Initialize Linear client
const linearClient = new LinearClient({ apiKey: linearApiKey });

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const app = express();
const port = 8080;
app.use(cors());
app.use(express.json());

// Endpoint to generate PRD
app.post('/generate-prd', async (req, res) => {
    try {
        const { requirements } = req.body;
        if (!requirements || typeof requirements !== 'string') {
            return res.status(400).json({ error: "Invalid or missing requirements data." });
        }
        const prd = await generatePrdContent(model, `${requirements} ${prompts.PRD_FORMAT_PROMPT}`);
        res.json({ prd });
    } catch (error) {
        console.error("Error generating PRD:", error);
        res.status(500).json({ error: "An error occurred while generating the PRD." });
    }
});

// Endpoint to generate tasks
app.post('/generate-tasks', async (req, res) => {
    try {
        const { prd } = req.body;
        if (!prd || typeof prd !== 'string') {
            return res.status(400).json({ error: "Invalid or missing PRD data." });
        }
        const tasks = await generateTaskArray(model, `${prd} ${prompts.TASKS_CREATION_PROMPT}`);
        res.json({ tasks });
    } catch (error) {
        console.error("Error generating tasks:", error);
        res.status(500).json({ error: "An error occurred while generating the tasks." });
    }
});


// Endpoint to create tasks as issues in Linear
app.post('/create-tasks', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks) {
            return res.status(400).json({ error: "Invalid or missing task array data." });
        }
        await processTasks(linearClient, tasks);
        res.json({ message: `${tasks.length} tasks created successfully.` });
    } catch (error) {
        console.error("Error generating tasks:", error);
        res.status(500).json({ error: "An error occurred while creating the issues." });
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});