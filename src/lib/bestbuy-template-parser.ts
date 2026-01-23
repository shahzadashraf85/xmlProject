import * as XLSX from 'xlsx';
import type { BestBuyColumn } from '../types/bestbuy';

export async function parseBestBuyTemplate(file: File): Promise<{
    template_name: string;
    columns: BestBuyColumn[];
}> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // 1. Parse "Data" sheet for Codes and Labels
    const dataSheet = workbook.Sheets['Data'];
    if (!dataSheet) throw new Error('Template missing "Data" sheet');

    // Row 1: Labels (A1, B1, ...)
    // Row 2: Codes (A2, B2, ...)
    const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1:A1');
    const cols: BestBuyColumn[] = [];

    // Helper to get groups - rough heuristic or from specific row if available
    // Best Buy templates usually don't have a "Group" row standard, but sometimes they do.
    // The prompt says "Assign logical group". I will have to map based on keywords or if the template structure implies it.
    // For now, I'll default to 'General' or infer from code prefix (e.g. 'img_' -> Images).

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const labelCell = dataSheet[XLSX.utils.encode_cell({ r: 0, c: C })]; // Row 1
        const codeCell = dataSheet[XLSX.utils.encode_cell({ r: 1, c: C })];  // Row 2

        if (!codeCell || !codeCell.v) continue; // Skip if no code

        const code = String(codeCell.v).trim();
        const label = labelCell ? String(labelCell.v).trim() : code;

        cols.push({
            order: C,
            label,
            code,
            required: false, // Default, will update from "Columns" sheet
            description: '',
            example: '',
            allowed_values: null,
            data_type: 'text',
            group: inferGroup(code, label)
        });
    }

    // 2. Parse "Columns" sheet for Logic
    const columnsSheet = workbook.Sheets['Columns'];
    if (columnsSheet) {
        const colRows = XLSX.utils.sheet_to_json<any>(columnsSheet);
        if (colRows.length > 0) {
            const allKeys = Object.keys(colRows[0]);

            // Identify standard keys
            const codeKey = allKeys.find(k => {
                const ln = k.toLowerCase();
                return (ln.includes('code') || ln.includes('field id') || ln === 'code') && !ln.includes('desc');
            });

            const descKey = allKeys.find(k => {
                const ln = k.toLowerCase();
                return ln.includes('desc') || ln.includes('definition');
            });

            const exampleKey = allKeys.find(k => k.toLowerCase().includes('example'));

            // Identify Requirement Key
            // Priority 1: Semantic Name
            let reqKey = allKeys.find(k => {
                const ln = k.toLowerCase();
                return ln.includes('mandatory') || ln.includes('required') || ln.includes('usage') || ln.includes('requirement');
            });

            // Priority 2: Heuristic Analysis of Values
            if (!reqKey) {
                let bestKey = '';
                let maxScore = 0;

                for (const k of allKeys) {
                    if (k === codeKey || k === descKey || k === exampleKey) continue;

                    let score = 0;
                    // Check sample rows for requirement-like values
                    for (const row of colRows.slice(0, 50)) {
                        const val = String(row[k] || '').trim();
                        const valUpper = val.toUpperCase();
                        const valLower = val.toLowerCase();

                        // Look for explicit requirement indicators (case-insensitive)
                        if (valUpper === 'REQUIRED' || valUpper === 'MANDATORY' || valUpper === 'OPTIONAL' || valUpper === 'RECOMMENDED') {
                            score += 2; // Higher weight for exact matches
                        } else if (valLower.includes('required') || valLower.includes('mandatory') || valLower === 'yes' || valLower === 'y' || valLower === 'r') {
                            score++;
                        }
                    }
                    if (score > maxScore) {
                        maxScore = score;
                        bestKey = k;
                    }
                }
                if (maxScore > 0) {
                    reqKey = bestKey;
                    console.log(`✓ Found requirement column by value analysis: "${reqKey}" (score: ${maxScore})`);
                }
            }

            // Priority 3: Last column fallback
            if (!reqKey && allKeys.length > 0) reqKey = allKeys[allKeys.length - 1];

            // Debug: Log detected columns
            console.log('=== Template Parser Debug ===');
            console.log('All column headers:', allKeys);
            console.log('Code column:', codeKey);
            console.log('Description column:', descKey);
            console.log('Example column:', exampleKey);
            console.log('Requirement column:', reqKey);
            console.log('============================');

            // Build Map
            const metaMap = new Map();
            if (codeKey) {
                colRows.forEach(row => {
                    if (row[codeKey]) {
                        metaMap.set(String(row[codeKey]).trim(), row);
                    }
                });
            } else {
                // Try to fallback to finding any column that looks like code?
                colRows.forEach(row => {
                    // Try to find a row value that matches a known code from Data sheet
                    const matchCol = cols.find(c => Object.values(row).some(v => String(v).trim() === c.code));
                    if (matchCol) {
                        metaMap.set(matchCol.code, row);
                    }
                });
            }

            // Apply Metadata
            cols.forEach(col => {
                const meta = metaMap.get(col.code);
                if (meta) {
                    if (descKey && meta[descKey]) col.description = meta[descKey];
                    if (exampleKey && meta[exampleKey]) col.example = meta[exampleKey];

                    if (reqKey && meta[reqKey]) {
                        const rawVal = String(meta[reqKey]).trim();
                        const val = rawVal.toLowerCase();

                        // Debug logging
                        console.log(`Field: ${col.code}, Requirement Column: "${reqKey}", Value: "${rawVal}"`);

                        // Explicit matching for common values
                        if (val === 'required' || val === 'mandatory' || val === 'r' || val === 'yes' || val === 'y') {
                            col.required = true;
                            console.log(`  ✓ Marked as REQUIRED`);
                        } else if (val === 'optional' || val === 'o' || val === 'no' || val === 'n') {
                            col.required = false;
                            console.log(`  ✗ Marked as optional`);
                        } else if (val === 'recommended' || val === 'rec') {
                            col.required = false; // Recommended is not required
                            console.log(`  ~ Marked as recommended (optional)`);
                        } else {
                            // Fallback: check if it contains the word
                            if (val.includes('required') || val.includes('mandatory')) {
                                col.required = true;
                                console.log(`  ✓ Marked as REQUIRED (contains keyword)`);
                            } else {
                                col.required = false;
                                console.log(`  ? Unknown value, defaulting to optional`);
                            }
                        }
                    } else {
                        console.log(`Field: ${col.code} - No requirement data found`);
                    }
                }
            });
        }
    }

    // 3. Parse "ReferenceData" for Enums
    const refSheet = workbook.Sheets['ReferenceData']; // or "Valid Values"
    if (refSheet) {
        // const refData = XLSX.utils.sheet_to_json<any>(refSheet);
        // Best Buy ReferenceData is usually: Code | List Of Values...
        // Or sometimes: Header=Code, Rows=Values.
        // Let's assume Column-based: Each column header is the field code, values below.

        // We need to re-read carefully. Usually Ref Data sheet has headers equal to valid codes.

        // Convert sheet to array of arrays to iterate columns
        const refRange = XLSX.utils.decode_range(refSheet['!ref'] || 'A1:A1');

        // Headers are row 0
        for (let C = refRange.s.c; C <= refRange.e.c; ++C) {
            const headerCell = refSheet[XLSX.utils.encode_cell({ r: 0, c: C })];
            if (!headerCell) continue;
            const headerCode = String(headerCell.v).trim();

            // Find matching column
            const col = cols.find(c => c.code === headerCode);
            if (col) {
                const allowed: string[] = [];
                for (let R = 1; R <= refRange.e.r; ++R) {
                    const valCell = refSheet[XLSX.utils.encode_cell({ r: R, c: C })];
                    if (valCell && valCell.v) {
                        allowed.push(String(valCell.v).trim());
                    }
                }
                if (allowed.length > 0) {
                    col.allowed_values = allowed;
                    col.data_type = 'select';
                }
            }
        }
    }

    return {
        template_name: file.name.replace(/\.[^/.]+$/, ""),
        columns: cols
    };
}

function inferGroup(code: string, label: string): string {
    const c = code.toLowerCase();
    const l = label.toLowerCase();

    if (c.includes('img') || c.includes('image') || l.includes('image')) return 'Images';
    if (c.includes('price') || c.includes('offer') || c.includes('sku') || c.includes('quantity')) return 'Offer';
    if (c.includes('vix') || c.includes('warranty') || c.includes('tax')) return 'Compliance';
    if (l.includes('processor') || l.includes('memory') || l.includes('storage') || l.includes('cpu') || l.includes('ram')) return 'Specs';
    if (l.includes('display') || l.includes('screen')) return 'Display';
    if (l.includes('battery') || l.includes('power')) return 'Power';
    if (l.includes('dimension') || l.includes('weight')) return 'Dimensions';

    return 'General Information';
}
