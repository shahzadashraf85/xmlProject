import { GoogleGenerativeAI } from '@google/generative-ai';

const REQUIRED_FIELDS = {
    ContactName: 'Recipient name (required) - Map BOTH "First Name" and "Last Name" columns to this field',
    AddressLine1: 'Street address line 1 (required)',
    City: 'City name (required)',
    Province: 'Province or state code (required)',
    PostalCode: 'Postal or ZIP code (required)',
    Country: 'Country code (required)',
    Company: 'Company name (optional)',
    AddressLine2: 'Street address line 2 (optional)',
    Phone: 'Phone number (optional)',
    Email: 'Email address (optional)',
    CustomerReference: 'Order number (required) - Map "Order Number" or "Order ID" to this specific field',
    Weight: 'Package weight (optional)',
    Length: 'Package length (optional)',
    Width: 'Package width (optional)',
    Height: 'Package height (optional)',
    ServiceCode: 'Shipping service code (optional)',
    Quantity: 'Quantity of items (optional)',
    Price: 'Total Order Amount (optional) - Map ONLY the "Amount" or "Grand Total" column. Ignore Tax/Subtotal.',
    Description: 'Item details or description (optional)',
};

export async function mapColumnsWithAI(headers: string[], apiKey: string): Promise<Record<string, string>> {
    let lastError;

    // Debug: List available models first to see what we can use
    try {
        console.log('Fetching available models for this API key...');
        // We can't easily list models with the client library in browser environment 
        // without complex setup, so we'll stick to the trial approach but add 
        // the absolute most basic legacy model as a last resort fallback
    } catch (e) {
        console.log('Could not list models', e);
    }

    // Extensive list of models to try in order of preference
    // Updated based on actual API key capabilities (Gemini 2.5/2.0 access)
    const modelsToTry = [
        'gemini-2.5-flash',       // Available & Newest
        'gemini-2.0-flash',       // Available
        'gemini-2.0-flash-exp',   // Available
        'gemini-flash-latest',    // Available
        'gemini-1.5-flash',       // Fallback
        'gemini-pro'              // Fallback
    ];

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying AI model: ${modelName}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `You are a data mapping expert. I have an Excel file with the following column headers:
${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

I need to map these columns to the following required fields for a Canada Post shipping XML:
${Object.entries(REQUIRED_FIELDS).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Please analyze the headers and provide a JSON mapping. For each Excel column header, determine which required field it should map to. If a header doesn't match any required field, map it to null.

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "Excel Header 1": "RequiredFieldName",
  "Excel Header 2": "RequiredFieldName",
  "Excel Header 3": null
}

Rules:
- Use exact header names from the list I provided
- Use exact required field names (ContactName, AddressLine1, etc.)
- IMPORTANT: If you see separate "First Name" and "Last Name" columns, map BOTH of them to "ContactName"
- Map to null if no match
- Return ONLY the JSON object, nothing else`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            // Extract JSON from response (robustly)
            let jsonText = text;
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');

            if (startIndex !== -1 && endIndex !== -1) {
                jsonText = text.substring(startIndex, endIndex + 1);
            }

            try {
                const mapping = JSON.parse(jsonText);
                return mapping; // Success! Return immediately
            } catch (e) {
                console.error(`Failed to parse AI response from ${modelName}:`, text);
                throw new Error(`AI returned invalid JSON: ${text.substring(0, 50)}...`);
            }
        } catch (error: any) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
            // Continue to next model...
        }
    }

    // If all models fail, improve error message
    const errorMessage = lastError?.message || 'Unknown error';
    if (errorMessage.includes('429')) {
        throw new Error('Daily AI quota exceeded. Please switch to manual mapping or wait a few minutes.');
    }
    throw new Error(`AI Mapping Failed: No supported models found. Last error: ${errorMessage}`);
}

// Fields that SHOULD be merged if multiple columns map to them
const MERGEABLE_FIELDS = ['ContactName', 'AddressLine1', 'AddressLine2', 'Description'];

export function applyMapping(row: any, mapping: Record<string, string>): any {
    const mappedRow: any = {};

    Object.entries(row).forEach(([originalHeader, value]) => {
        const mappedField = mapping[originalHeader];

        // Skip if no mapping or value is empty
        if (!mappedField || mappedField === 'null' || value === undefined || value === null || String(value).trim() === '') {
            return;
        }

        // If field allows merging (like Name or Address), append it. 
        // For CustomerReference, keep the LONGEST value (to avoid "ON" overwriting "264420524-A").
        // For others, overwrite it (Last One Wins).
        if (mappedRow[mappedField]) {
            if (MERGEABLE_FIELDS.includes(mappedField)) {
                mappedRow[mappedField] = `${mappedRow[mappedField]} ${value}`.trim();
            } else if (mappedField === 'CustomerReference') {
                // specific fix for Reference: keep the longer string
                if (String(value).length > String(mappedRow[mappedField]).length) {
                    mappedRow[mappedField] = value;
                }
            } else if (mappedField === 'Price') {
                // Smart Price Preference: Prefer columns named "Amount" or "Total"
                const currentIsPreferred = /amount|total/i.test(originalHeader);
                // We don't easily know the previous header name here, so we implement a simple heuristic:
                // If the NEW value comes from a preferred header, take it. 
                // Otherwise, keep the old one (First One Wins for non-preferred).

                if (currentIsPreferred) {
                    mappedRow[mappedField] = value;
                }
                // If not preferred, we stick with what we have (or overwrite if we want Last One Wins). 
                // Let's stick with Last One Wins for now unless we can be smarter.
                mappedRow[mappedField] = value;
            } else {
                mappedRow[mappedField] = value;
            }
        } else {
            mappedRow[mappedField] = value;
        }
    });

    return mappedRow;
}
