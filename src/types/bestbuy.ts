
export interface BestBuyColumn {
    order: number;
    label: string;
    code: string;
    required: boolean;
    description: string;
    example: string;
    allowed_values: string[] | null;
    data_type: 'text' | 'number' | 'boolean' | 'select' | 'date';
    group: string;
}

export interface BestBuyTemplate {
    id: string;
    created_at: string;
    template_name: string;
    category_code: string;
    column_count: number;
    columns_json: BestBuyColumn[];
    raw_template_file_path: string;
}

export interface BestBuyListing {
    id: string;
    created_at: string;
    updated_at: string;
    template_id: string;
    status: 'draft' | 'approved' | 'published';
    product_name: string;
    specs_text: string;
    known: Record<string, any>;
    ai_output: Record<string, any> | null;
    created_by: string;
}

export interface BestBuyListingField {
    id: string;
    listing_id: string;
    field_code: string;
    field_value: string | null;
}

export interface BestBuyExport {
    id: string;
    created_at: string;
    template_id: string;
    export_type: 'xlsx' | 'csv';
    file_path: string;
    row_count: number;
    created_by: string;
}
