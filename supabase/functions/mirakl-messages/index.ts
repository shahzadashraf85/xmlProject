import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIRAKL_API_URL = Deno.env.get('MIRAKL_API_URL') || ''
const MIRAKL_API_KEY = Deno.env.get('MIRAKL_API_KEY') || ''

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
        console.log('Mirakl Edge Function called');

        // Parse request body
        const requestBody = await req.json()
        const action = requestBody.action || 'list'
        const messageId = requestBody.messageId
        const params = requestBody.params || {}

        // List messages
        if (action === 'list') {
            const queryParams = new URLSearchParams()

            if (params.max) queryParams.append('max', params.max)
            if (params.offset) queryParams.append('offset', params.offset)
            if (params.start_date) queryParams.append('start_date', params.start_date)
            if (params.end_date) queryParams.append('end_date', params.end_date)
            if (params.unread_only === 'true') queryParams.append('unread_only', 'true')
            if (params.order_id) queryParams.append('order_id', params.order_id)
            if (params.received !== undefined) queryParams.append('received', params.received.toString())

            const miraklUrl = `${MIRAKL_API_URL}/api/messages?${queryParams.toString()}`

            const response = await fetch(miraklUrl, {
                method: 'GET',
                headers: {
                    'Authorization': MIRAKL_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Mirakl API error (${response.status}): ${errorText}`)
            }

            const data = await response.json()

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Get message thread
        if (action === 'get_thread') {
            if (!messageId) {
                return new Response(
                    JSON.stringify({ error: 'Message ID is required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const miraklUrl = `${MIRAKL_API_URL}/api/messages/${messageId}/thread`

            const response = await fetch(miraklUrl, {
                method: 'GET',
                headers: {
                    'Authorization': MIRAKL_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Mirakl API error (${response.status}): ${errorText}`)
            }

            const data = await response.json()
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Mark message as read
        if (action === 'mark_read' && messageId) {
            const miraklUrl = `${MIRAKL_API_URL}/api/messages/${messageId}/read`

            const response = await fetch(miraklUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': MIRAKL_API_KEY,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to mark message as read (${response.status}): ${errorText}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Reply to message
        if (action === 'reply' && messageId) {
            const replyBody = requestBody.replyBody

            const miraklUrl = `${MIRAKL_API_URL}/api/messages/${messageId}/reply`

            const response = await fetch(miraklUrl, {
                method: 'POST',
                headers: {
                    'Authorization': MIRAKL_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ body: replyBody }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to send reply (${response.status}): ${errorText}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error('Invalid action')

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
