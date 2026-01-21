import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function parseSystemSpecsWithAI(rawText: string) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are a computer hardware expert. I will paste the raw output from a system information command (like system_profiler or Get-ComputerInfo).
    
    Extract the following details into a JSON object:
    - brand (e.g. Apple, Dell, HP)
    - model (e.g. MacBook Pro 14, Latitude 5420)
    - processor (Exact CPU model, e.g. Intel Core i7-12700H, Apple M1 Pro)
    - ram (Total memory, e.g. 16 GB)
    - storage (Total storage capacity and type, e.g. 512 GB SSD)
    - serial_number
    - os (Operating System version)

    Raw Text:
    "${rawText.substring(0, 10000)}"

    Return ONLY valid JSON. No markdown formatting.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Parsing Failed:", error);
        return null;
    }
}
