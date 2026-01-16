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
    serial_number: string;
    brand: string;
    model: string;
    specifications?: string;
    grade: 'A' | 'B' | 'C';
    repair_needed_description?: string;
    status: 'pending_triage' | 'in_repair' | 'ready_to_ship' | 'scrapped';
    created_at: string;
}

export interface RepairSession {
    id: string;
    inventory_id: string;
    technician_id: string;
    started_at: string;
    ended_at?: string;
    work_notes?: string;
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
