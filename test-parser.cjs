const XLSX = require('xlsx');

// Simulate the parser logic
async function testParser() {
    const file = '/Users/sh/Documents/Laptekexport/supabase/products-and-offers-en_CA-20260123071106.xlsx';
    const workbook = XLSX.readFile(file);

    const columnsSheet = workbook.Sheets['Columns'];
    if (!columnsSheet) {
        console.log('❌ No Columns sheet found!');
        return;
    }

    const colRows = XLSX.utils.sheet_to_json(columnsSheet);

    if (colRows.length === 0) {
        console.log('❌ Columns sheet is empty!');
        return;
    }

    const allKeys = Object.keys(colRows[0]);

    console.log('=== PARSER TEST ===');
    console.log('All column headers:', allKeys);

    // Find code key
    const codeKey = allKeys.find(k => {
        const ln = k.toLowerCase();
        return (ln.includes('code') || ln.includes('field id') || ln === 'code') && !ln.includes('desc');
    });

    // Find desc key
    const descKey = allKeys.find(k => {
        const ln = k.toLowerCase();
        return ln.includes('desc') || ln.includes('definition');
    });

    // Find example key
    const exampleKey = allKeys.find(k => k.toLowerCase().includes('example'));

    console.log('Code column:', codeKey);
    console.log('Description column:', descKey);
    console.log('Example column:', exampleKey);

    // Find requirement key
    let reqKey = allKeys.find(k => {
        const ln = k.toLowerCase();
        return ln.includes('mandatory') || ln.includes('required') || ln.includes('usage') || ln.includes('requirement');
    });

    if (!reqKey) {
        let bestKey = '';
        let maxScore = 0;

        for (const k of allKeys) {
            if (k === codeKey || k === descKey || k === exampleKey) continue;

            let score = 0;
            for (const row of colRows.slice(0, 50)) {
                const val = String(row[k] || '').trim();
                const valUpper = val.toUpperCase();

                if (valUpper === 'REQUIRED' || valUpper === 'MANDATORY' || valUpper === 'OPTIONAL' || valUpper === 'RECOMMENDED') {
                    score += 2;
                } else if (val.toLowerCase().includes('required')) {
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

    console.log('Requirement column:', reqKey);
    console.log('\n=== SAMPLE FIELD PROCESSING ===');

    // Test first 10 fields
    for (let i = 0; i < Math.min(10, colRows.length); i++) {
        const row = colRows[i];
        const code = row[codeKey];
        const reqValue = row[reqKey];

        if (reqValue) {
            const val = String(reqValue).toLowerCase().trim();
            let isRequired = false;

            if (val === 'required' || val === 'mandatory' || val === 'r' || val === 'yes' || val === 'y') {
                isRequired = true;
            }

            console.log(`${code}: "${reqValue}" → ${isRequired ? '✓ REQUIRED' : '✗ Optional'}`);
        }
    }
}

testParser().catch(console.error);
