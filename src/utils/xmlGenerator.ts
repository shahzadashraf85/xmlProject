import type { OrderRow, GeneratorSettings } from '../types';

function cleanPhone(phone: string | undefined): string {
    if (!phone) return '';
    return phone.toString().replace(/[^\d]/g, '').slice(0, 25);
}

function cleanPostalCode(postal: string | undefined): string {
    if (!postal) return '';
    return postal.toString().replace(/\s/g, '').toUpperCase().slice(0, 14);
}

function normalizeCountryCode(country: string | undefined): string {
    if (!country) return 'CA';

    const normalized = country.toString().toUpperCase().trim();

    if (normalized === 'CAN' || normalized === 'CA' || normalized === 'CANADA') {
        return 'CA';
    }
    if (normalized === 'USA' || normalized === 'US' || normalized === 'UNITED STATES') {
        return 'US';
    }

    // If already 2 letters, keep it
    if (normalized.length === 2) {
        return normalized;
    }

    return 'CA'; // default
}

function convertWeightToGrams(weight: number | string | undefined, defaultWeight: number): number {
    if (!weight) return defaultWeight;

    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;

    if (isNaN(numWeight)) return defaultWeight;

    // If value <= 50, treat as kg and convert to grams
    if (numWeight <= 50) {
        return Math.round(numWeight * 1000);
    }

    // Otherwise treat as grams
    return Math.round(numWeight);
}

function formatDimension(value: number | string | undefined, defaultValue: number): string {
    if (!value) return defaultValue.toString();

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) return defaultValue.toString();

    // Remove trailing .0 if integer
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

function truncate(value: string | undefined, maxLength: number): string {
    if (!value) return '';
    return value.toString().slice(0, maxLength);
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

interface DeliveryRequest {
    customerRef: string;
    company: string;
    contactName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phone: string;
    email: string;
    serviceCode: string;
    length: string;
    width: string;
    height: string;
    weight: number;
    price?: number;
}

// Helper to normalize province to 2-letter code
function normalizeProvince(prov: string | undefined): string {
    if (!prov) return '';
    const p = prov.trim().toUpperCase();

    const mapping: Record<string, string> = {
        'ALBERTA': 'AB',
        'BRITISH COLUMBIA': 'BC',
        'MANITOBA': 'MB',
        'NEW BRUNSWICK': 'NB',
        'NEWFOUNDLAND': 'NL',
        'NEWFOUNDLAND AND LABRADOR': 'NL',
        'NOVA SCOTIA': 'NS',
        'ONTARIO': 'ON',
        'PRINCE EDWARD ISLAND': 'PE',
        'QUEBEC': 'QC',
        'QUÉBEC': 'QC',
        'SASKATCHEWAN': 'SK',
        'NORTHWEST TERRITORIES': 'NT',
        'NUNAVUT': 'NU',
        'YUKON': 'YT',
        'YUKON TERRITORY': 'YT'
    };

    // If it's already 2 chars, return it (e.g. QC, ON)
    if (p.length === 2) return p;

    // Return mapped code or original if not found
    return mapping[p] || p;
}

function generateDeliveryRequest(request: DeliveryRequest, settings: GeneratorSettings, indent: string = '  '): string {
    let xml = `${indent}<delivery-request>\n`;
    xml += `${indent}  <delivery-spec>\n`;

    // Destination
    xml += `${indent}    <destination>\n`;
    xml += `${indent}      <recipient>\n`;
    xml += `${indent}        <client-id>${escapeXml(request.company)}</client-id>\n`;
    xml += `${indent}        <contact-name>${escapeXml(request.contactName)}</contact-name>\n`;
    xml += `${indent}        <company>${escapeXml(request.company)}</company>\n`;
    xml += `${indent}        <additional-addressinfo></additional-addressinfo>\n`;
    xml += `${indent}        <address-line-1>${escapeXml(request.addressLine1)}</address-line-1>\n`;
    xml += `${indent}        <address-line-2>${escapeXml(request.addressLine2)}</address-line-2>\n`;
    xml += `${indent}        <city>${escapeXml(request.city)}</city>\n`;
    xml += `${indent}        <prov-state>${escapeXml(normalizeProvince(request.province))}</prov-state>\n`;
    xml += `${indent}        <postal-zip-code>${escapeXml(request.postalCode)}</postal-zip-code>\n`;
    xml += `${indent}        <country-code>${escapeXml(request.countryCode)}</country-code>\n`;
    xml += `${indent}        <client-voice-number>${escapeXml(request.phone)}</client-voice-number>\n`;
    xml += `${indent}      </recipient>\n`;
    xml += `${indent}    </destination>\n`;

    // Product ID
    xml += `${indent}    <product-id>${escapeXml(request.serviceCode)}</product-id>\n`;

    // Order Options (Signature for > $200)
    if (request.price && request.price > 200) {
        xml += `${indent}    <options>\n`;
        xml += `${indent}      <option code="SO"/>\n`;
        xml += `${indent}    </options>\n`;
    }

    // Item specification
    xml += `${indent}    <item-specification>\n`;
    xml += `${indent}      <physical-characteristics>\n`;
    xml += `${indent}        <length>${request.length}</length>\n`;
    xml += `${indent}        <width>${request.width}</width>\n`;
    xml += `${indent}        <height>${request.height}</height>\n`;
    xml += `${indent}        <weight>${request.weight}</weight>\n`;
    xml += `${indent}      </physical-characteristics>\n`;
    xml += `${indent}    </item-specification>\n`;

    // Notification (if enabled)
    if (settings.notificationsEnabled && request.email) {
        xml += `${indent}    <notification>\n`;
        xml += `${indent}      <client-notif-email>\n`;
        xml += `${indent}        <email>${escapeXml(request.email)}</email>\n`;
        xml += `${indent}        <on-shipment>true</on-shipment>\n`;
        xml += `${indent}        <on-exception>true</on-exception>\n`;
        xml += `${indent}        <on-delivery>true</on-delivery>\n`;
        xml += `${indent}      </client-notif-email>\n`;
        xml += `${indent}    </notification>\n`;
    }

    // Reference
    xml += `${indent}    <reference>\n`;
    xml += `${indent}      <customer-ref1>${escapeXml(request.customerRef)}</customer-ref1>\n`;
    xml += `${indent}    </reference>\n`;

    xml += `${indent}  </delivery-spec>\n`;
    xml += `${indent}</delivery-request>\n`;

    return xml;
}

export function normalizeServiceCode(service: string | undefined, defaultService: string): string {
    if (!service) return defaultService;

    const s = service.toString().toUpperCase().trim();

    // Already valid codes
    if (['DOM.EP', 'DOM.RP', 'DOM.XP', 'DOM.PC', 'USA.EP', 'USA.PW', 'USA.SP', 'INT.XP', 'INT.IP', 'INT.SP'].includes(s)) {
        return s;
    }

    // Common mappings
    if (s.includes('REGULAR') || s.includes('GROUND') || s.includes('STANDARD')) return 'DOM.EP'; // Map Ground/Regular to Expedited (DOM.EP) as requested
    if (s.includes('EXPEDITED')) return 'DOM.EP';
    if (s.includes('XPRESS') || s.includes('EXPRESS')) return 'DOM.XP';
    if (s.includes('PRIORITY')) return 'DOM.PC';

    // USA mappings
    if (s.includes('USA') && s.includes('PACKET')) return 'USA.SP';
    if (s.includes('USA') && s.includes('EXPEDITED')) return 'USA.EP';

    return defaultService;
}

export function generateXML(rows: OrderRow[], settings: GeneratorSettings): string {
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
    xml += '<delivery-requests>\n';

    rows.forEach((row) => {
        const rawServiceCode = row.ServiceCode?.toString().trim();
        const serviceCode = normalizeServiceCode(rawServiceCode, settings.defaultServiceCode);

        // Ensure service code is never empty
        if (!serviceCode) {
            throw new Error('Service code cannot be empty');
        }

        const quantity = parseInt(row.Quantity?.toString() || '1', 10) || 1;

        // Parse price safely
        let price = 0;
        if (row.Price) {
            const priceStr = row.Price.toString().replace(/[^\d.]/g, '');
            price = parseFloat(priceStr);
        }

        const shouldDuplicate = settings.duplicateByQuantity && quantity > 1;
        const iterations = shouldDuplicate ? quantity : 1;

        for (let i = 0; i < iterations; i++) {
            const customerRef = row.CustomerReference?.toString() || '';
            const finalCustomerRef = shouldDuplicate && iterations > 1
                ? truncate(`${customerRef}-${i + 1}`, 35)
                : truncate(customerRef, 35);

            const request: DeliveryRequest = {
                customerRef: finalCustomerRef,
                company: truncate(row.Company?.toString() || '', 44),
                contactName: truncate(row.ContactName?.toString() || '', 44),
                addressLine1: truncate(row.AddressLine1?.toString() || '', 44),
                addressLine2: truncate(row.AddressLine2?.toString() || '', 44),
                city: truncate(row.City?.toString() || '', 40),
                province: row.Province?.toString() || '',
                postalCode: cleanPostalCode(row.PostalCode?.toString()),
                countryCode: normalizeCountryCode(row.Country?.toString()),
                phone: cleanPhone(row.Phone?.toString()),
                email: truncate(row.Email?.toString() || '', 70),
                serviceCode: serviceCode,
                length: formatDimension(row.Length, settings.defaultLength),
                width: formatDimension(row.Width, settings.defaultWidth),
                height: formatDimension(row.Height, settings.defaultHeight),
                weight: convertWeightToGrams(row.Weight, settings.defaultWeight),
                price: price, // Add parsed price
            };

            xml += generateDeliveryRequest(request, settings);
        }
    });

    xml += '</delivery-requests>';

    return xml;
}

export function downloadXML(xmlContent: string, filename: string = 'est_shipping_entry.xml') {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
