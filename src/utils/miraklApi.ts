// Mirakl API Integration for Best Buy Seller Messages
// Uses Supabase Edge Function as a proxy to avoid CORS issues

import { supabase } from '../lib/supabase';

export interface MiraklMessage {
    id: number | string;
    subject: string;
    body: string;
    date_created: string;
    order_id?: string;
    commercial_id?: string;
    from_id?: string;
    from_name?: string;
    from_type?: string;
    to_shop_id?: number;
    to_shop_name?: string;
    read?: boolean;
    unread?: boolean;
    archived?: boolean;
    to_shop_archived?: boolean;
    // Legacy fields for backward compatibility
    to?: {
        type: string;
        id: string;
    };
    from?: {
        type: string;
        id: string;
    };
    entities?: Array<{
        type: string;
        id: string;
    }>;
    topic?: {
        type: string;
        value: string;
    };
}

export interface MiraklMessagesResponse {
    messages: MiraklMessage[];
    total_count: number;
}

/**
 * Helper function to invoke Mirakl Edge Function with explicit headers
 */
async function invokeMiraklFunction(body: Record<string, unknown>) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Try to get the current session
    let session = null;

    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Session error:', sessionError);
        }

        session = sessionData?.session;

        // If no session, try getting the user directly
        if (!session) {
            console.log('No session found, trying getUser()...');
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userError) {
                console.error('User error:', userError);
                throw new Error('No active session. Please log out and log in again.');
            }

            if (userData?.user) {
                // User exists but session is missing - try to refresh
                const { data: refreshData } = await supabase.auth.refreshSession();
                session = refreshData?.session;
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }

    if (!session) {
        console.error('No session available after all attempts');
        throw new Error('No active session. Please log out and log in again.');
    }

    console.log('Session found, making request with token');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/mirakl-messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Edge Function error (${response.status}):`, errorText);
        throw new Error(`Edge Function error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Check if response contains an error
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Fetch messages from Mirakl Best Buy seller account via Supabase Edge Function
 * @param params Query parameters for filtering messages
 * @returns Promise with messages response
 */
export async function fetchMiraklMessages(params?: {
    max?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    unread_only?: boolean;
}): Promise<MiraklMessagesResponse> {
    try {
        const requestParams: Record<string, string> = {};

        if (params?.max) requestParams.max = params.max.toString();
        if (params?.offset) requestParams.offset = params.offset.toString();
        if (params?.start_date) requestParams.start_date = params.start_date;
        if (params?.end_date) requestParams.end_date = params.end_date;
        if (params?.unread_only) requestParams.unread_only = 'true';

        const data = await invokeMiraklFunction({
            action: 'list',
            params: requestParams,
        });

        return data;
    } catch (error) {
        console.error('Error fetching Mirakl messages:', error);
        throw error;
    }
}

/**
 * Mark a message as read
 * @param messageId The ID of the message to mark as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
    try {
        await invokeMiraklFunction({
            action: 'mark_read',
            messageId,
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        throw error;
    }
}

/**
 * Send a reply to a message
 * @param messageId The ID of the message to reply to
 * @param body The reply message body
 */
export async function replyToMessage(messageId: string, body: string): Promise<void> {
    try {
        await invokeMiraklFunction({
            action: 'reply',
            messageId,
            replyBody: body,
        });
    } catch (error) {
        console.error('Error sending reply:', error);
        throw error;
    }
}

/**
 * Fetch message thread (conversation history) for an order
 * @param orderId The Order ID to get the thread for
 */
export async function fetchMessageThread(orderId: string): Promise<{ messages: MiraklMessage[] }> {
    try {
        // Only fetch messages by order_id for now as 'received=false' caused 400 error
        const data = await invokeMiraklFunction({
            action: 'list',
            params: {
                order_id: orderId,
                max: '100'
            }
        });

        if (data.messages && Array.isArray(data.messages)) {
            data.messages.sort((a: MiraklMessage, b: MiraklMessage) =>
                new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
            );
        }

        return data;
    } catch (error) {
        console.error('Error fetching message thread:', error);
        throw error;
    }
}

/**
 * Generate AI reply for a conversation
 * @param messages The conversation history
 */
export async function generateAiReply(messages: MiraklMessage[]): Promise<string> {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
        };

        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-reply`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Generation error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('Error generating AI reply:', error);
        throw error;
    }
}
