import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        // Use service role key for database operations (bypasses RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        let deviceData
        try {
            deviceData = await req.json()
        } catch (parseError) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in request body', details: String(parseError) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate required fields
        if (!deviceData.serial_number || !deviceData.model) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields',
                    received: {
                        serial_number: deviceData.serial_number || 'MISSING',
                        model: deviceData.model || 'MISSING'
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check for duplicate serial number
        const { data: existing, error: checkError } = await supabaseClient
            .from('inventory_items')
            .select('id, serial_number, model, brand')
            .eq('serial_number', deviceData.serial_number)
            .maybeSingle()

        if (checkError) {
            return new Response(
                JSON.stringify({
                    error: 'Database check failed',
                    details: checkError.message,
                    hint: 'Make sure inventory_items table exists. Run the SQL migration first.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        if (existing) {
            return new Response(
                JSON.stringify({
                    error: 'Device already registered',
                    message: `This device (${existing.brand} ${existing.model}) is already in the system.`,
                    existing_device: existing
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            )
        }

        // Merge specs
        const specs = deviceData.specs || {}
        if (deviceData.audit) {
            specs.audit = deviceData.audit
        }

        // Insert into inventory_items table
        const { data, error } = await supabaseClient
            .from('inventory_items')
            .insert({
                brand: deviceData.brand || 'Unknown',
                model: deviceData.model,
                serial_number: deviceData.serial_number,
                device_type: deviceData.device_type || 'LAPTOP',
                grade: deviceData.grade || 'B',
                specs: specs,
                status: deviceData.status || 'pending_triage',
                location: deviceData.location || 'Receiving',
                repair_needed_description: deviceData.notes || null
            })
            .select()
            .single()

        if (error) {
            return new Response(
                JSON.stringify({
                    error: 'Database insert failed',
                    details: error.message,
                    code: error.code,
                    hint: error.hint || 'Check if all required columns exist in inventory_items table'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Device registered successfully',
                device: data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'Unexpected server error',
                details: String(error),
                stack: error.stack || 'No stack trace'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
