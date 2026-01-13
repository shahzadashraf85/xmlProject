import * as XLSX from 'xlsx';
import type { OrderRow, ParsedData, ValidationError } from '../types';
import { mapColumnsWithAI, applyMapping } from './aiMapper';

const COLUMN_MAPPINGS: Record<string, string[]> = {
    CustomerReference: ['customerreference', 'order number', 'orderid', 'order id', 'ref', 'ordernumber', 'order#', 'order no', 'reference'],
    Company: ['company', 'business', 'organization', 'companyname', 'business name'],
    ContactName: ['contactname', 'contact name', 'name', 'recipient', 'recipient name', 'customer name', 'full name', 'ship to name', 'shipto'],
    Phone: ['phone', 'telephone', 'tel', 'phonenumber', 'phone number', 'contact phone', 'mobile'],
    Email: ['email', 'e-mail', 'emailaddress', 'email address', 'contact email'],
    AddressLine1: ['addressline1', 'address line 1', 'address1', 'address', 'street', 'street address', 'ship to address', 'shipping address', 'addr1', 'line1'],
    AddressLine2: ['addressline2', 'address line 2', 'address2', 'suite', 'unit', 'apt', 'apartment', 'addr2', 'line2'],
    City: ['city', 'town', 'municipality'],
    Province: ['province', 'prov', 'state', 'prov-state', 'provstate', 'prov/state', 'region'],
    PostalCode: ['postalcode', 'postal code', 'zipcode', 'zip', 'postal', 'zip code', 'postcode', 'postal/zip'],
    Country: ['country', 'countrycode', 'country code', 'destination country'],
    Weight: ['weight', 'wt', 'mass', 'package weight', 'parcel weight'],
    Length: ['length', 'len', 'l', 'package length'],
    Width: ['width', 'w', 'package width'],
    Height: ['height', 'h', 'ht', 'package height'],
    ServiceCode: ['servicecode', 'service code', 'service', 'productid', 'product id', 'shipping method', 'delivery method'],
    Quantity: ['quantity', 'qty', 'count', 'amount', 'number of items'],
    Price: ['price', 'value', 'total', 'amount', 'order total', 'unit price', 'declared value'],
};

function normalizeHeader(header: string): string {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]+/g, '');

    for (const [standardName, variants] of Object.entries(COLUMN_MAPPINGS)) {
        if (variants.includes(normalized)) {
            return standardName;
        }
    }

    return header;
}


export function parseExcelFile(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

                if (rawData.length === 0) {
                    resolve({ rows: [], headers: [], errors: [{ row: 0, field: 'file', message: 'File is empty' }] });
                    return;
                }

                // Get headers and normalize them
                const rawHeaders = Object.keys(rawData[0]);
                const headerMap = new Map<string, string>();

                rawHeaders.forEach(header => {
                    const normalized = normalizeHeader(header);
                    headerMap.set(header, normalized);
                });

                // Transform rows with normalized headers
                const rows: OrderRow[] = rawData.map(row => {
                    const transformedRow: OrderRow = {};
                    Object.entries(row).forEach(([key, value]) => {
                        const normalizedKey = headerMap.get(key) || key;
                        transformedRow[normalizedKey] = value;
                    });
                    return transformedRow;
                });

                const headers = Array.from(new Set(headerMap.values()));

                resolve({ rows, headers, errors: [], rawRows: rawData, rawHeaders });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsBinaryString(file);
    });
}

export async function parseExcelFileWithAI(file: File, geminiApiKey: string): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

                if (rawData.length === 0) {
                    resolve({ rows: [], headers: [], errors: [{ row: 0, field: 'file', message: 'File is empty' }] });
                    return;
                }

                // Get raw headers
                const rawHeaders = Object.keys(rawData[0]);

                // Use AI to map columns
                const aiMapping = await mapColumnsWithAI(rawHeaders, geminiApiKey);

                // Transform rows using AI mapping
                const rows: OrderRow[] = rawData.map(row => {
                    return applyMapping(row, aiMapping);
                });

                // Get mapped headers
                const mappedHeaders = Object.values(aiMapping).filter(v => v && v !== 'null');
                const headers = Array.from(new Set(mappedHeaders)) as string[];

                resolve({ rows, headers, errors: [], aiMapping, rawRows: rawData, rawHeaders });
            } catch (error: any) {
                reject(new Error(`AI mapping failed: ${error.message}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsBinaryString(file);
    });
}


export function validateRow(row: OrderRow, rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!row.ContactName || row.ContactName.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'ContactName', message: 'Contact Name is required' });
    }

    if (!row.AddressLine1 || row.AddressLine1.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'AddressLine1', message: 'Address Line 1 is required' });
    }

    if (!row.City || row.City.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'City', message: 'City is required' });
    }

    if (!row.Province || row.Province.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'Province', message: 'Province is required' });
    }

    if (!row.PostalCode || row.PostalCode.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'PostalCode', message: 'Postal Code is required' });
    }

    if (!row.Country || row.Country.toString().trim() === '') {
        errors.push({ row: rowIndex, field: 'Country', message: 'Country is required' });
    }

    return errors;
}

export function validateAllRows(rows: OrderRow[]): ValidationError[] {
    const allErrors: ValidationError[] = [];

    rows.forEach((row, index) => {
        const rowErrors = validateRow(row, index + 1);
        allErrors.push(...rowErrors);
    });

    return allErrors;
}
