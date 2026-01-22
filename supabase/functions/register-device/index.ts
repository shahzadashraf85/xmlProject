import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        let deviceData
        try {
            deviceData = await req.json()
        } catch (parseError) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON', details: String(parseError) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (!deviceData.serial_number || !deviceData.model) {
            return new Response(
                JSON.stringify({ error: 'Missing serial_number or model' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check for duplicate
        const { data: existing } = await supabaseClient
            .from('inventory_items')
            .select('id, serial_number, model, brand')
            .eq('serial_number', deviceData.serial_number)
            .maybeSingle()

        if (existing) {
            return new Response(
                JSON.stringify({ error: 'Device already registered', existing_device: existing }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            )
        }

        // Extract specs from nested object
        const specs = deviceData.specs || {}

        // Insert with all individual columns
        const { data, error } = await supabaseClient
            .from('inventory_items')
            .insert({
                // Basic Info
                brand: deviceData.brand || specs.manufacturer || 'Unknown',
                model: deviceData.model,
                serial_number: deviceData.serial_number,
                device_type: deviceData.device_type || 'Computer',
                grade: deviceData.grade || 'B',
                status: deviceData.status || 'pending_triage',
                location: deviceData.location || 'Receiving',
                comments: deviceData.comments,

                // System Info
                manufacturer: specs.manufacturer || deviceData.brand,
                model_number: specs.model_number || deviceData.model,
                part_number: specs.part_number,
                motherboard: specs.motherboard,
                bios_version: specs.bios_version,

                // Processor
                processor: specs.processor,
                processor_cores: specs.processor_cores,
                processor_threads: specs.processor_threads,
                processor_speed_mhz: specs.processor_speed_mhz,
                processor_architecture: specs.processor_architecture,

                // Memory
                ram_gb: specs.ram_gb,
                ram_type: specs.ram_type,
                ram_speed_mhz: specs.ram_speed_mhz,
                ram_slots: specs.ram_slots,

                // Storage
                storage_gb: specs.storage_gb,
                storage_type: specs.storage_type,
                storage_model: specs.storage_model,

                // Graphics
                graphics_card: specs.graphics_card,
                graphics_vram_mb: specs.graphics_vram_mb,
                graphics_driver: specs.graphics_driver,

                // Display
                screen_resolution: specs.screen_resolution,
                screen_size: specs.screen_size,
                monitor_count: specs.monitor_count,

                // OS
                os_name: specs.os_name,
                os_version: specs.os_version,
                os_build: specs.os_build,
                os_architecture: specs.os_architecture,

                // Network
                mac_address: specs.mac_address,
                wifi_adapter: specs.wifi_adapter,

                // Battery
                has_battery: specs.has_battery || false,
                battery_status: specs.battery_status,

                // Audit
                scanned_at: specs.scanned_at ? new Date(specs.scanned_at) : new Date(),
                scanned_by: specs.scanned_by,
                computer_name: specs.computer_name,

                // Keep original specs as JSON for additional data
                specs: specs
            })
            .select()
            .single()

        if (error) {
            return new Response(
                JSON.stringify({ error: 'Database error', details: error.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        return new Response(
            JSON.stringify({ success: true, device: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Server error', details: String(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
