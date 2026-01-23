import * as XLSX from 'xlsx';
import { supabase } from './supabase'; // Assuming central export
import type { BestBuyTemplate } from '../types/bestbuy';

export async function generateBestBuyExport(
    template: BestBuyTemplate,
    listings: any[] // Complex content with fields
): Promise<Blob> {
    // 1. Download Original Template
    const { data, error } = await supabase.storage
        .from('bestbuy_templates')
        .download(template.raw_template_file_path);

    if (error || !data) throw new Error('Failed to load original template file');

    const buffer = await data.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = 'Data';
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error('Invalid template: missing Data sheet');

    // 2. Prepare Data Rows
    // Map each listing to a row object keyed by Field Code
    const rows = listings.map(listing => {
        return listing.fields_map || {};
    });

    // 3. Write Data starting at Row 3 (A3)
    // We need to ensure the keys in 'rows' match the codes in Row 2.
    // However, sheet_add_json usually expects headers.
    // Since we are appending to existing sheet, we can use `origin: -1` to append, 
    // BUT we need to match the columns order of the existing sheet.

    // Better strategy:
    // Create an array of arrays (AOAs) following the `template.columns_json` order.

    const dataMatrix: any[][] = rows.map(rowMap => {
        return template.columns_json.map(col => {
            return rowMap[col.code] || '';
        });
    });

    // Insert at A3 (Index 2)
    XLSX.utils.sheet_add_aoa(worksheet, dataMatrix, { origin: "A3" });

    // 4. Generate Output
    const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
