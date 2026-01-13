# Sample Excel/CSV Template

Use this as a reference for creating your order files.

## Column Headers (First Row)

```
CustomerReference | Company | ContactName | Phone | Email | AddressLine1 | AddressLine2 | City | Province | PostalCode | Country | Weight | Length | Width | Height | ServiceCode | Quantity
```

## Sample Data Rows

```csv
ORD-001,Acme Corp,John Doe,4165551234,john@acme.com,123 Main St,Suite 100,Toronto,ON,M5H2N2,CA,2.5,40,30,10,DOM.EP,1
ORD-002,Tech Solutions,Jane Smith,6135559876,jane@tech.com,456 Oak Ave,,Ottawa,ON,K1P5Z9,Canada,1.2,35,25,8,DOM.XP,2
ORD-003,Global Imports,Bob Johnson,5145554321,bob@global.com,789 Pine Rd,Unit 5,Montreal,QC,H3B1A1,CAN,3000,45,35,12,DOM.RP,1
```

## Field Descriptions

### Required Fields
- **ContactName**: Recipient's name (max 44 chars)
- **AddressLine1**: Primary address (max 44 chars)
- **City**: City name (max 40 chars)
- **Province**: Province/state code (e.g., ON, QC, BC)
- **PostalCode**: Postal code (will be cleaned and formatted)
- **Country**: Country code or name (CA, CAN, Canada all work)

### Optional Fields
- **CustomerReference**: Your order/reference number (max 35 chars)
- **Company**: Company name (max 44 chars)
- **Phone**: Phone number (digits only, will be cleaned)
- **Email**: Email for notifications (max 70 chars)
- **AddressLine2**: Secondary address info (max 44 chars)
- **Weight**: Weight in kg (≤50) or grams (>50)
- **Length**: Length in cm
- **Width**: Width in cm
- **Height**: Height in cm
- **ServiceCode**: DOM.EP, DOM.RP, DOM.XP, or DOM.PC
- **Quantity**: Number of shipments (default 1)

## Weight Format Examples

| Input | Interpretation |
|-------|---------------|
| 2 | 2 kg → 2000 grams |
| 2.5 | 2.5 kg → 2500 grams |
| 500 | 500 grams |
| 2000 | 2000 grams |

## Service Codes

- **DOM.EP**: Expedited Parcel (default)
- **DOM.RP**: Regular Parcel
- **DOM.XP**: Xpresspost
- **DOM.PC**: Priority Courier

## Country Code Conversions

| Input | Output |
|-------|--------|
| CA | CA |
| CAN | CA |
| Canada | CA |
| US | US |
| USA | US |
| United States | US |

## Notes

1. Column headers are case-insensitive
2. Spaces and underscores in headers are ignored
3. Missing optional fields will use default values from settings
4. If Quantity > 1 and "Duplicate by Quantity" is enabled, multiple delivery requests will be created
5. Phone numbers will be cleaned (only digits kept)
6. Postal codes will be uppercase with no spaces
