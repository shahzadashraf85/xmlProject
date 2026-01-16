import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CP_ENV = Deno.env.get('CP_ENV') || 'DEV';

const CP_API_URL = CP_ENV === 'PROD'
  ? "https://soa-gw.canadapost.ca/rs"      // Production (Real Money)
  : "https://ct.soa-gw.canadapost.ca/rs";  // Development (Testing, No Charge)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order, customerNumber } = await req.json()

    // 1. Get Secrets
    const CP_USER = Deno.env.get('CP_USERNAME')
    const CP_PASS = Deno.env.get('CP_PASSWORD')
    const CP_CUST_NUM = customerNumber || Deno.env.get('CP_CUSTOMER_NUMBER')

    if (!CP_USER || !CP_PASS || !CP_CUST_NUM) {
      throw new Error('Missing Canada Post Credentials')
    }

    // 2. Construct XML Payload (Contract Shipping Example)
    // IMPORTANT: precise spacing/structure is required by Canada Post
    // Truncate fields to meet Max Length requirements (Ref: 30 chars max usually)
    const validGroupId = order.id.replace(/-/g, '').substring(0, 30);
    const validRef = (order.reference_number || order.id).substring(0, 30);
    const validPostal = order.postal_code.replace(/\s/g, '').toUpperCase();

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
  <group-id>${validGroupId}</group-id>
  <requested-shipping-point>N0B2J0</requested-shipping-point> 
  <delivery-spec>
    <service-code>${order.service_code || 'DOM.EP'}</service-code>
    <sender>
      <name>Laptek Exports</name>
      <company>Laptek Exports</company>
      <contact-phone>5195555555</contact-phone>
      <address-details>
        <address-line-1>123 Sender St</address-line-1>
        <city>Puslinch</city>
        <prov-state>ON</prov-state>
        <postal-zip-code>N0B2J0</postal-zip-code>
      </address-details>
    </sender>
    <destination>
      <name>${order.recipient_name}</name>
      <company>${order.recipient_company || ''}</company>
      <address-details>
        <address-line-1>${order.address_line_1}</address-line-1>
        <city>${order.city}</city>
        <prov-state>${order.province}</prov-state>
        <country-code>CA</country-code>
        <postal-zip-code>${validPostal}</postal-zip-code>
      </address-details>
    </destination>
    <parcel-characteristics>
      <weight>${order.weight || 1}</weight>
      <dimensions>
        <length>${order.length || 30}</length>
        <width>${order.width || 20}</width>
        <height>${order.height || 10}</height>
      </dimensions>
    </parcel-characteristics>
    <preferences>
      <show-packing-instructions>false</show-packing-instructions>
      <show-postage-rate>true</show-postage-rate>
      <show-insured-value>true</show-insured-value>
    </preferences>
    <references>
      <cost-centre>WEB-APP</cost-centre>
      <customer-ref-1>${validRef}</customer-ref-1>
    </references>
  </delivery-spec>
</shipment>`

    // 3. Call Canada Post API
    // Standard Format: POST /rs/{mailed-by}/shipment
    const response = await fetch(`${CP_API_URL}/${CP_CUST_NUM}/shipment`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(CP_USER + ':' + CP_PASS),
        'Content-Type': 'application/vnd.cpc.shipment-v8+xml',
        'Accept': 'application/vnd.cpc.shipment-v8+xml'
      },
      body: xmlBody
    })

    const responseText = await response.text()
    console.log("CP Create Response Status:", response.status);

    if (!response.ok) {
      console.error("CP Error Body:", responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `CP Error (${response.status}): Failed to create shipment.`,
          details: responseText.substring(0, 500) // Show XML error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 } // Keep bad request status
      )
    }

    // 4. Extract Tracking PIN & Label Link using Regex (simple & fast)
    const pinMatch = responseText.match(/<pin>(.*?)<\/pin>/);
    const linkMatch = responseText.match(/<link rel="label" href="(.*?)"/);

    const trackingPin = pinMatch ? pinMatch[1] : null;
    const labelUrl = linkMatch ? linkMatch[1] : null;

    return new Response(
      JSON.stringify({
        success: true,
        tracking_pin: trackingPin,
        label_url: labelUrl
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
