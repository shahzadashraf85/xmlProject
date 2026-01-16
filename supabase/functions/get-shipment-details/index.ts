import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CP_ENV = Deno.env.get('CP_ENV') || 'DEV';
const CP_API_URL = CP_ENV === 'PROD'
    ? "https://soa-gw.canadapost.ca/rs"
    : "https://ct.soa-gw.canadapost.ca/rs";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { reference, customerNumber } = await req.json()

        // 1. Credentials
        const CP_USER = Deno.env.get('CP_USERNAME')
        const CP_PASS = Deno.env.get('CP_PASSWORD')
        const CP_CUST_NUM = customerNumber || Deno.env.get('CP_CUSTOMER_NUMBER')

        if (!CP_USER || !CP_PASS || !CP_CUST_NUM) throw new Error('Missing Credentials');
        if (!reference) throw new Error('Missing Reference Number');

        console.log(`Searching for Ref: ${reference} in ${CP_ENV}`);

        // 2. Search by Reference
        // Standard Format: GET /rs/{mailed-by}/shipment?customer-ref={ref}
        // MOBO Format: GET /rs/{mailed-by}/{mobo}/shipment... (Only used if acting as agent)

        // We assume direct shipping (Self):
        const searchUrl = `${CP_API_URL}/${CP_CUST_NUM}/shipment?customer-ref=${encodeURIComponent(reference)}`;

        console.log(`Requesting: ${searchUrl.replace(CP_CUST_NUM, 'XXXXX')}`);

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': 'Basic ' + btoa(CP_USER + ':' + CP_PASS),
                'Accept': 'application/vnd.cpc.shipment-v8+xml'
            }
        });

        const xmlText = await response.text();
        console.log(`CP Status: ${response.status} in ${CP_ENV}`);

        if (!response.ok) {
            // Return detailed error for debugging
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `CP Error (${response.status}): Shipment not found or API error.`,
                    details: xmlText.substring(0, 200), // Limit length
                    env: CP_ENV
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Extract Tracking PIN and ID from XML
        // Response is a list of <shipment-id> and <tracking-pin>
        const pinMatch = xmlText.match(/<tracking-pin>(.*?)<\/tracking-pin>/);
        const idMatch = xmlText.match(/<shipment-id>(.*?)<\/shipment-id>/);
        const linkMatch = xmlText.match(/<link rel="label" href="(.*?)"/);

        if (!pinMatch) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Shipment found but no Tracking PIN in response.',
                    debug_xml: xmlText
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                tracking_pin: pinMatch[1],
                shipment_id: idMatch ? idMatch[1] : null,
                label_url: linkMatch ? linkMatch[1] : null // Note: Search might not return Label Link directly, might need 2nd call, but usually does in detail view.
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
