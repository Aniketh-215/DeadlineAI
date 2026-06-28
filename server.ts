/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY environment variable is not defined or is placeholder. AI will run in fallback mock mode.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({ apiKey: key });
    } catch (e) {
      console.error("Error initializing GoogleGenAI client:", e);
      return null;
    }
  }
  return aiClient;
}

// JSON parsing helper for Gemini responses
function cleanAndParseJSON(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

// ----------------- BACKEND API ENDPOINTS -----------------

// API Endpoint 1: Smart Task Prioritization & Actionable Suggestions
app.post("/api/ai/prioritize", async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Invalid tasks format" });
  }

  const ai = getAI();
  if (!ai) {
    // Fallback Mock Prioritization
    const mockPrioritized = tasks.map((task, idx) => {
      const isUrgent = task.priority === "Urgent";
      const isHigh = task.priority === "High";
      return {
        id: task.id,
        whyExplanation: isUrgent 
          ? `Urgent deadline alert! This task is scheduled first to prevent immediate deadline violation.` 
          : isHigh 
            ? `This high priority task is scheduled early to ensure adequate focus and high-quality completion.` 
            : `Scheduled sequentially based on category and duration to ensure balanced energy.`
      };
    });

    const mockSuggestions = [
      {
        id: "s1",
        title: "High Focus Block Needed",
        type: "tip" as const,
        explanation: "You have several demanding study sessions today. Block notifications between 10:00 AM and 12:00 PM to maximize focus."
      },
      {
        id: "s2",
        title: "Micro-Break Opportunity",
        type: "action" as const,
        explanation: "A 45-minute gap exists between your scheduled activities. Take a 10-minute walk to rejuvenate."
      }
    ];

    return res.json({ prioritizedTasks: mockPrioritized, suggestions: mockSuggestions });
  }

  try {
    const prompt = `
      You are the Decision Engine of DeadlineAI. Analyze the following list of tasks.
      Sort them in the absolute best execution order based on their deadline, priority, estimated duration, and categories.
      For each task, provide a high-quality human-like explanation (whyExplanation) of why it occupies this position in the schedule.
      Never use generic phrases like "Priority 1" or index numbers. Be supportive and explain tradeoffs (e.g. nearest deadlines vs heavy effort).
      
      Tasks list:
      ${JSON.stringify(tasks, null, 2)}

      Additionally, generate 2-3 custom high-value AISuggestions for the user to optimize their daily workflow.
      An AISuggestion should contain:
      - title: A short title
      - type: "warning" | "tip" | "action"
      - explanation: A detailed action item

      Return ONLY a JSON object with this exact structure (no other text or explanations outside the JSON block):
      {
        "prioritizedTasks": [
          {
            "id": "task_id_here",
            "whyExplanation": "High quality explanation here..."
          }
        ],
        "suggestions": [
          {
            "id": "unique_s_id",
            "title": "Suggestion Title",
            "type": "tip",
            "explanation": "Explanation..."
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const resultText = response.text;
    const parsed = cleanAndParseJSON(resultText || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini API Error /api/ai/prioritize:", error);
    return res.status(500).json({ error: error.message || "Failed to prioritize tasks" });
  }
});

// API Endpoint 2: AI Daily Planner (Create an Hourly Timetable)
app.post("/api/ai/plan-day", async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Invalid tasks format" });
  }

  const ai = getAI();
  if (!ai) {
    // Fallback Mock Daily Planner
    let startHour = 9;
    const timetable = tasks.map((task, idx) => {
      const durationHours = Math.ceil(task.estimatedDuration / 60);
      const startStr = `${String(startHour).padStart(2, "0")}:00`;
      const endStr = `${String(startHour + durationHours).padStart(2, "0")}:00`;
      startHour += durationHours + 0.5; // add 30-min break
      return {
        id: `slot_${idx}`,
        taskId: task.id,
        title: task.title,
        startTime: startStr,
        endTime: endStr,
        category: task.category,
        completed: task.completed
      };
    });

    return res.json({
      timetable,
      explanation: "Generated a healthy sequential schedule starting from 9:00 AM with 30-minute buffers to prevent cognitive fatigue."
    });
  }

  try {
    const prompt = `
      You are the Daily Planner Engine of DeadlineAI. Create an optimized day schedule with specific start and end times for the active tasks.
      The timeline should ideally cover 08:00 to 21:00.
      Incorporate buffers (breaks of 10-20 mins) between tasks so the user doesn't burn out.
      Include non-task slots like "Lunch Break" or "Afternoon Walk" if there are gaps.
      
      Tasks to schedule:
      ${JSON.stringify(tasks.filter(t => !t.completed), null, 2)}

      Return ONLY a JSON object matching this structure (no other text):
      {
        "timetable": [
          {
            "id": "slot_unique_id",
            "taskId": "associated_task_id_or_null_if_break",
            "title": "Task title or Break name",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "category": "Work | Study | Personal | Other"
          }
        ],
        "explanation": "A high-level explanation of your planning philosophy for today."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini API Error /api/ai/plan-day:", error);
    return res.status(500).json({ error: error.message || "Failed to plan day" });
  }
});

// API Endpoint 3: Dynamic Rescheduling (Move Tasks intelligently and Explain)
app.post("/api/ai/reschedule", async (req, res) => {
  const { tasks, uncompletedTaskId } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Invalid tasks format" });
  }

  const failedTask = tasks.find(t => t.id === uncompletedTaskId);
  const ai = getAI();

  if (!ai) {
    // Fallback Mock Rescheduler
    const updatedTasks = tasks.map(t => {
      if (t.id === uncompletedTaskId) {
        return {
          ...t,
          whyExplanation: "Rescheduled because this session was missed. Urgency increased to prevent deadline breach."
        };
      }
      return t;
    });

    return res.json({
      rescheduledTasks: updatedTasks,
      explanation: failedTask 
        ? `Since you missed '${failedTask.title}', I've recalculated your day. Urgent items have been bumped forward, and flexible personal tasks have been pushed to tomorrow morning.` 
        : "I recalculated your remaining schedule to ensure your primary deadlines remain safe.",
      timetable: [] // Will re-generate planner client-side
    });
  }

  try {
    const prompt = `
      You are the Dynamic Rescheduler of DeadlineAI - the application's core highlight.
      The user failed to complete or marked as INCOMPLETE the following task:
      "${failedTask ? failedTask.title : 'Missed Task'}" (ID: ${uncompletedTaskId})

      You must instantly:
      1. Recalculate the priority/urgency of the remaining tasks.
      2. Rearrange the schedule to ensure we do not miss impending deadlines.
      3. Move tasks around and balance the workload, pushing low priority/flexible items if necessary.
      4. Write a custom explanation of how the schedule was adapted and WHY (e.g. "I moved your project to 7 PM and postponed your workout because your assignment is due tomorrow morning and must be completed first.").

      Remaining Tasks:
      ${JSON.stringify(tasks.filter(t => !t.completed), null, 2)}

      Return ONLY a JSON object with this exact structure:
      {
        "rescheduledTasks": [
          {
            "id": "task_id_here",
            "whyExplanation": "New adjusted explanation here..."
          }
        ],
        "explanation": "Main explanation to display in the alert panel..."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini API Error /api/ai/reschedule:", error);
    return res.status(500).json({ error: error.message || "Failed to reschedule" });
  }
});

// API Endpoint 4: AI Task Breakdown into Subtasks
app.post("/api/ai/breakdown", async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const ai = getAI();
  if (!ai) {
    // Fallback Subtasks
    const mockSubtasks = [
      { title: "Initial Planning and Research", estimatedDuration: 30 },
      { title: "Drafting Outline & Key Elements", estimatedDuration: 45 },
      { title: "Core Implementation Block", estimatedDuration: 90 },
      { title: "Testing, Review & Refinements", estimatedDuration: 30 }
    ];
    return res.json({ subtasks: mockSubtasks });
  }

  try {
    const prompt = `
      You are the Task Breakdown Engine of DeadlineAI.
      Break down the following major task into 4 to 7 highly actionable, bite-sized subtasks with realistic estimated durations (in minutes).

      Task Title: "${title}"
      Description: "${description || "No description provided"}"

      Return ONLY a JSON object with this exact structure (no other wrapper text):
      {
        "subtasks": [
          {
            "title": "Subtask Name",
            "estimatedDuration": 45
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini API Error /api/ai/breakdown:", error);
    return res.status(500).json({ error: error.message || "Failed to break down task" });
  }
});

// API Endpoint 5: Chat Assistant
app.post("/api/ai/chat", async (req, res) => {
  const { messages, tasks } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const ai = getAI();
  const currentTaskListSummary = tasks && Array.isArray(tasks) 
    ? tasks.map((t: any) => `- [${t.completed ? "COMPLETED" : "PENDING"}] ${t.title} (Priority: ${t.priority}, Category: ${t.category}, Deadline: ${t.deadline}, Duration: ${t.estimatedDuration}m)`).join("\n")
    : "No active tasks in database.";

  if (!ai) {
    // Fallback Chat Responder
    const lastUserMessage = messages[messages.length - 1]?.text?.toLowerCase() || "";
    let reply = "I am running in local offline mode since no API key is set. I can help answer layout questions! If you want full-power AI scheduling, make sure to add your GEMINI_API_KEY.";
    
    if (lastUserMessage.includes("do next") || lastUserMessage.includes("what should")) {
      reply = "Looking at your schedule, you should focus on your closest pending deadline task next. Break it into bite-sized milestones and schedule 45-minute deep focus sprints!";
    } else if (lastUserMessage.includes("finish") || lastUserMessage.includes("can i")) {
      reply = "Yes, you can absolutely finish everything! By scheduling buffer periods between tasks and maintaining deep-work habits, your list is completely achievable. Avoid multitasking!";
    } else if (lastUserMessage.includes("reschedule")) {
      reply = "I recommend moving lower priority items to tomorrow so you can dedicate undivided attention to your imminent deadlines.";
    }

    return res.json({ text: reply });
  }

  try {
    // Build context-aware chat session
    const chatHistory = messages.map((m: any) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.text }]
    }));

    // Inject system instructions as the very first instruction in history or in a systemInstruction parameter
    const systemPrompt = `
      You are the virtual AI Copilot of DeadlineAI, an intelligent productivity companion.
      The user is working on tasks, trying to beat their deadlines instead of procrastinating.
      Be extremely practical, encouraging, empathetic, and direct. Avoid high-level generic fluff.
      Use the user's active task list to provide precise advice, answering questions like "What should I do next?", "Can I finish everything today?", or "How can I improve my productivity?".

      User's Current Tasks List:
      ${currentTaskListSummary}

      Give short, crisp responses (1-3 short paragraphs, or highly focused bullet points).
    `;

    // In the new @google/genai SDK, generateContent takes systemInstruction inside config
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages.map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`).join("\n") + `\nAI:`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error /api/ai/chat:", error);
    return res.status(500).json({ error: error.message || "Failed to chat with Assistant" });
  }
});

// ----------------- VITE DEVELOPMENT & PRODUCTION SERVING -----------------

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DeadlineAI] Server running on http://localhost:${PORT}`);
  });
}

startServer();
