import { supabase } from './supabase';

export interface LogEntry {
    id: string;
    inventory_id: string;
    action: string;
    details: any;
    created_at: string;
    created_by?: string;
}

export async function logInventoryAction(
    inventoryId: string,
    action: string,
    details: any = {}
) {
    try {
        const { error } = await supabase
            .from('inventory_logs')
            .insert({
                inventory_id: inventoryId,
                action,
                details
            });

        if (error) throw error;
    } catch (err) {
        console.error('Failed to create log entry:', err);
    }
}

export async function getInventoryLogs(inventoryId: string): Promise<LogEntry[]> {
    try {
        const { data, error } = await supabase
            .from('inventory_logs')
            .select('*')
            .eq('inventory_id', inventoryId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch logs:', err);
        return [];
    }
}
