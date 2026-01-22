export interface OrderRow {
    CustomerReference?: string;
    Company?: string;
    ContactName?: string;
    Phone?: string;
    Email?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    Province?: string;
    PostalCode?: string;
    Country?: string;
    Weight?: number | string;
    Length?: number | string;
    Width?: number | string;
    Height?: number | string;
    ServiceCode?: string;
    Quantity?: number | string;
    Price?: number | string;
    Category?: string;
    [key: string]: any;
}

export interface ValidationError {
    row: number;
    field: string;
    message: string;
}

export interface ParsedData {
    rows: OrderRow[];
    headers: string[];
    errors: ValidationError[];
    aiMapping?: Record<string, string>;
    rawRows?: any[];
    rawHeaders?: string[];
}

export interface GeneratorSettings {
    signatureThreshold: number;
}

export interface InventoryItem {
    id: string;
    brand: string;
    model: string;
    serial_number: string;
    device_type: string;
    grade: string;
    status: string;
    location: string;
    comments?: string;
    created_at: string;
    specs: {
        manufacturer?: string;
        model_number?: string;
        part_number?: string;
        motherboard?: string;
        bios_version?: string;
        processor?: string;
        processor_cores?: number;
        processor_threads?: number;
        processor_speed_mhz?: number;
        processor_architecture?: string;
        ram_gb?: number;
        ram_type?: string;
        ram_speed_mhz?: number;
        ram_slots?: number;
        storage_gb?: number;
        storage_type?: string;
        storage_model?: string;
        all_storage?: Array<{ model: string; size_gb: number; type: string; interface: string }>;
        graphics_card?: string;
        graphics_vram_mb?: number;
        graphics_driver?: string;
        all_gpus?: Array<{ name: string; ram_mb: number; driver: string }>;
        screen_resolution?: string;
        screen_size?: string;
        is_touch_screen?: boolean;
        monitor_count?: number;
        os_name?: string;
        os_version?: string;
        os_build?: string;
        os_architecture?: string;
        mac_address?: string;
        wifi_adapter?: string;
        has_battery?: boolean;
        battery_status?: string;
        battery_health?: string;
        battery_cycles?: string;
        scanned_at?: string;
        scanned_by?: string;
        computer_name?: string;
    };
}

export interface RepairSession {
    id: string;
    inventory_id: string;
    technician_id: string;
    started_at: string;
    ended_at?: string;
    work_notes?: string;
}

export interface PartRequest {
    id: string;
    inventory_id: string;
    part_name: string;
    part_number: string;
    ai_description?: string;
    status: 'requested' | 'ordered' | 'received';
    order_id?: string;
    created_at: string;
    updated_at: string;
    inventory_item?: InventoryItem;
}

export interface Order {
    id: string;
    supplier: string;
    status: 'draft' | 'sent' | 'received';
    created_at: string;
    sent_at?: string;
    received_at?: string;
    notes?: string;
    part_requests?: PartRequest[];
}

export const DEFAULT_SETTINGS: GeneratorSettings = {
    signatureThreshold: 100,
};

export const SERVICE_CODES = [
    { value: 'DOM.EP', label: 'Expedited Parcel (DOM.EP)' },
    { value: 'DOM.RP', label: 'Regular Parcel (DOM.RP)' },
    { value: 'DOM.XP', label: 'Xpresspost (DOM.XP)' },
    { value: 'DOM.PC', label: 'Priority Courier (DOM.PC)' },
];
