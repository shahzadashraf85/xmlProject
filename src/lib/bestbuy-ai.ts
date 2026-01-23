import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BestBuyColumn } from "../types/bestbuy";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface ExtractionInput {
    template_columns: BestBuyColumn[];
    product_name: string;
    specs_text: string;
    known_fields?: Record<string, any>;
}

export async function extractBestBuyData(input: ExtractionInput): Promise<Record<string, any>> {
    const { template_columns, product_name, specs_text, known_fields } = input;

    // Simplify columns for prompt to save tokens but keep context
    const simplifiedColumns = template_columns.map(c => ({
        code: c.code,
        label: c.label,
        type: c.data_type,
        allowed: c.allowed_values ? c.allowed_values.join(', ') : 'Any',
        required: c.required
    }));

    const prompt = `
    You are a Best Buy Canada product data extractor and SEO content specialist.
    You MUST attempt to populate EVERY field provided.

    Rules:
    - Output ONLY valid JSON.
    - JSON keys MUST exactly match ALL provided field codes.
    - If data is unknown or not inferable → value = null.
    - NEVER invent data.
    - Respect allowed_values, max length, Yes/No, Y/N.
    - BBYCat must be 'Computers/Laptops' when applicable.
    - Images only if URLs are provided in Known Data.
    
    SEO TITLE INSTRUCTIONS (CRITICAL):
    - For 'Product Name' / 'Title' field, generate an SEO-optimized title in this EXACT format:
      "Refurbished (Grade) – Brand Model Screen-Size Category, Processor, RAM, Storage, OS, GPU"
    - Grade mapping: A = "Excellent", B = "Good", C = "Fair"
    - Example for Grade B: "Refurbished (Good) – Dell Precision 5570 15.6" Mobile Workstation Laptop, Intel Core i7-12700, 32GB RAM, 512GB SSD, Windows 11 Pro, NVIDIA RTX A1000"
    - Example for Grade A: "Refurbished (Excellent) – HP EliteBook 840 G8 14" Business Laptop, Intel Core i5-1135G7, 16GB RAM, 256GB SSD, Windows 11 Pro"
    - Keep under 150 characters if possible
    - Include key specs: CPU, RAM, Storage, OS, GPU (if applicable)
    
    SEO DESCRIPTION INSTRUCTIONS (CRITICAL):
    - For 'Long Description' / 'Description' field, write a natural, informative product description
    - Use HTML formatting: <p> paragraphs and <ul><li> bullet points
    - Keep it concise: 150-250 words maximum
    - Focus on facts, not excessive marketing language
    - Structure:
      <p>Brief intro mentioning grade and main use case (1-2 sentences)</p>
      <ul>
        <li>Key spec 1</li>
        <li>Key spec 2</li>
        <li>Key spec 3</li>
        <li>Key spec 4</li>
      </ul>
      <p>Brief note about refurbishment quality and warranty (1-2 sentences)</p>
    
    - Example for Grade A:
      <p>This refurbished Dell Latitude 5410 is in excellent condition and ready for business or personal use.</p>
      <ul>
        <li>Intel Core i5-10310U processor (1.70GHz, 4 cores)</li>
        <li>8GB DDR4 RAM</li>
        <li>256GB SSD storage</li>
        <li>13.9" Full HD touchscreen display (1920x1080)</li>
        <li>Windows 11 Pro (64-bit)</li>
      </ul>
      <p>Professionally refurbished to Grade A standards with minimal signs of use. Includes 1-year warranty.</p>
    
    - OPTIMIZE 'Short Description': One clear sentence highlighting the main value (under 200 chars).
      Example: "Powerful business laptop with Intel Core i5, 8GB RAM, and 256GB SSD. Professionally refurbished to excellent condition."

    TARGET SCHEMA (Field Codes):
    ${JSON.stringify(simplifiedColumns, null, 2)}

    INPUT DATA:
    Product Name: ${product_name}
    Raw Specs: ${specs_text}
    Known Data: ${JSON.stringify(known_fields || {})}
    `;

    // Strategy: Try models in order of capability/recency
    const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-pro'
    ];

    let lastError;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying Gemini Model: ${modelName}`);
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Validate JSON
            const data = JSON.parse(text);
            return data;

        } catch (error: any) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
            // If 404 (Not Found) or 400 (Bad Request), try next. 
            // If 429 (Quota), maybe stop? But usually simple retry is okay.
        }
    }

    // If loop finishes without return
    throw lastError || new Error("All Gemini models failed to process the request.");
}
