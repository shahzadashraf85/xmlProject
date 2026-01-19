import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set')
        }

        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ];

        // Format the conversation history for the prompt
        const conversationText = messages.map((msg: any) => {
            const role = (msg.from_type === 'CUSTOMER') ? 'Customer' : 'Shop (You)';
            return `${role} (${msg.date_created}): ${msg.body}`;
        }).join('\n\n');

        const prompt = `
You are a customer support agent for "LapTek" on Best Buy.
Your goal is to write a reply to the customer that is **short, crisp, and human-like**.

Guidelines:
- **Be Concise**: Keep it to 2-4 sentences max. No fluff.
- **Be Human**: Use natural language. Avoid robotic phrases like "I understand your concern".
- **Be Helpful**: Directly answer the question or ask for exactly what is needed.
- **No Fillers**: Skip "I hope this message finds you well". Just start with a friendly greeting.
- **Signature**: Always end exactly with:
Best regards,
LapTek Team

Context:
- Shop Name: LapTek
- Tone: Friendly, direct, professional.

Conversation History:
${conversationText}

Draft the reply now. text only.
        `.trim();

        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to generate reply using model: ${modelName}`);
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // If successful, return immediately
                return new Response(
                    JSON.stringify({ reply: text, modelUsed: modelName }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to the next model in the list
                continue;
            }
        }

        // If loop finishes without success, throw the last error
        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
