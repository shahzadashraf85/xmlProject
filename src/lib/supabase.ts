import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    role: 'admin' | 'employee';
                };
                Insert: {
                    id: string;
                    role?: 'admin' | 'employee';
                };
                Update: {
                    id?: string;
                    role?: 'admin' | 'employee';
                };
            };
            orders_imports: {
                Row: {
                    id: string;
                    user_id: string;
                    created_at: string;
                    source_filename: string;
                    row_count: number;
                    service_code: string;
                    xml_storage_path: string;
                    source_storage_path: string;
                    settings: Record<string, any>;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    created_at?: string;
                    source_filename: string;
                    row_count: number;
                    service_code: string;
                    xml_storage_path: string;
                    source_storage_path: string;
                    settings: Record<string, any>;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    created_at?: string;
                    source_filename?: string;
                    row_count?: number;
                    service_code?: string;
                    xml_storage_path?: string;
                    source_storage_path?: string;
                    settings?: Record<string, any>;
                };
            };
        };
    };
};
