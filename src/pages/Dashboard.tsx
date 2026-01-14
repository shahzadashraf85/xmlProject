import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { parseExcelFile, parseExcelFileWithAI, validateAllRows } from '../utils/excelParser';
import { applyMapping, REQUIRED_FIELDS } from '../utils/aiMapper';
import { generateXML, downloadXML, normalizeServiceCode } from '../utils/xmlGenerator';
import { supabase } from '../lib/supabase';
import type { OrderRow, ValidationError, GeneratorSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<OrderRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [settings, setSettings] = useState<GeneratorSettings>(DEFAULT_SETTINGS);
    const [generatedXML, setGeneratedXML] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [useAI, setUseAI] = useState(false);
    const [aiMapping, setAiMapping] = useState<Record<string, string> | null>(null);

    // Manual Mapping State
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [manualMapping, setManualMapping] = useState<Record<string, string>>({});
    const [showMapping, setShowMapping] = useState(false);

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setMessage(null);
        setLoading(true);

        try {
            let result;

            if (useAI) {
                const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
                    setMessage({ type: 'error', text: 'Please set VITE_GEMINI_API_KEY in your .env file' });
                    setLoading(false);
                    return;
                }

                setMessage({ type: 'success', text: 'Using AI to map columns...' });
                result = await parseExcelFileWithAI(selectedFile, geminiApiKey);
                setAiMapping(result.aiMapping || null);
            } else {
                result = await parseExcelFile(selectedFile);
            }


            const { rows, headers: parsedHeaders, errors, rawRows: rRows, rawHeaders: rHeaders, aiMapping: aiMap } = result;
            setParsedRows(rows);
            setHeaders(parsedHeaders);

            // Save raw data for manual re-mapping
            setRawRows(rRows || []);
            setRawHeaders(rHeaders || []);

            // Initialize Manual Mapping state (Target -> Source)
            const initialMapping: Record<string, string> = {};
            if (aiMap) {
                Object.entries(aiMap).forEach(([source, target]) => {
                    if (target && target !== 'null') {
                        initialMapping[target] = source;
                    }
                });
            }
            setManualMapping(initialMapping);
            setShowMapping(true);

            if (errors.length > 0) {
                setValidationErrors(errors);
                setMessage({ type: 'error', text: 'File parsing errors detected' });
            } else {
                const successMsg = useAI
                    ? `AI mapped ${rows.length} rows successfully!`
                    : `Parsed ${rows.length} rows successfully`;
                setMessage({ type: 'success', text: successMsg });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to parse file' });
        } finally {
            setLoading(false);
        }
    }

    function handleMappingChange(targetField: string, sourceHeader: string) {
        const newMapping = { ...manualMapping };

        if (sourceHeader === '') {
            delete newMapping[targetField];
        } else {
            newMapping[targetField] = sourceHeader;
        }

        setManualMapping(newMapping);
        reapplyMapping(newMapping);
    }

    function reapplyMapping(currentMap: Record<string, string>) {
        if (rawRows.length === 0) return;

        // Invert mapping for applyMapping utility (Source -> Target)
        const forwardMapping: Record<string, string> = {};
        Object.entries(currentMap).forEach(([target, source]) => {
            forwardMapping[source] = target;
        });

        // Re-map all rows
        const newParsedRows = rawRows.map(row => applyMapping(row, forwardMapping));

        setParsedRows(newParsedRows);

        // Re-validate immediately
        const errors = validateAllRows(newParsedRows);
        if (errors.length > 0) {
            setValidationErrors(errors);
            // Don't show error message toast here, can be annoying while editing
        } else {
            setValidationErrors([]);
        }
    }

    function handleValidate() {
        setMessage(null);
        const errors = validateAllRows(parsedRows);
        setValidationErrors(errors);

        if (errors.length === 0) {
            setMessage({ type: 'success', text: 'All rows are valid!' });
        } else {
            setMessage({ type: 'error', text: `Found ${errors.length} validation error(s)` });
        }
    }

    function handleGenerateXML() {
        setMessage(null);

        // Validate first
        const errors = validateAllRows(parsedRows);
        if (errors.length > 0) {
            setValidationErrors(errors);
            setMessage({ type: 'error', text: 'Please fix validation errors before generating XML' });
            return;
        }

        try {
            const xml = generateXML(parsedRows, settings);
            setGeneratedXML(xml);
            setMessage({ type: 'success', text: 'XML generated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to generate XML' });
        }
    }

    function handleDownloadXML() {
        if (!generatedXML) {
            setMessage({ type: 'error', text: 'No XML to download. Generate XML first.' });
            return;
        }
        downloadXML(generatedXML);

        // Auto-save to history
        handleSaveToSupabase().then(() => {
            console.log('Auto-saved to history');
        }).catch(err => {
            console.error('Failed to auto-save history', err);
        });

        setMessage({ type: 'success', text: 'XML downloaded and saved to history!' });
    }

    async function handleSaveToSupabase() {
        if (!generatedXML || !file || !user) {
            setMessage({ type: 'error', text: 'Missing required data to save' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            // Upload source file
            const sourceFileName = `${user.id}/${Date.now()}_${file.name}`;
            const { error: sourceUploadError } = await supabase.storage
                .from('imports')
                .upload(sourceFileName, file);

            if (sourceUploadError) throw sourceUploadError;

            // Upload XML file
            const xmlFileName = `${user.id}/${Date.now()}_est_shipping_entry.xml`;
            const xmlBlob = new Blob([generatedXML], { type: 'application/xml' });
            const { error: xmlUploadError } = await supabase.storage
                .from('exports')
                .upload(xmlFileName, xmlBlob);

            if (xmlUploadError) throw xmlUploadError;

            // Insert record
            const { error: insertError } = await supabase
                .from('orders_imports')
                .insert({
                    user_id: user.id,
                    source_filename: file.name,
                    row_count: parsedRows.length,
                    service_code: 'DOM.EP',
                    xml_storage_path: xmlFileName,
                    source_storage_path: sourceFileName,
                    settings: settings,
                    parsed_data: parsedRows, // Save the rows for history re-printing
                });

            if (insertError) throw insertError;

            setMessage({ type: 'success', text: 'Saved to Supabase successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to save to Supabase' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        await signOut();
        navigate('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">EST XML Generator</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/history')}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View History
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Upload File</h2>

                    {/* AI Toggle */}
                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useAI}
                                onChange={(e) => setUseAI(e.target.checked)}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div>
                                <span className="text-sm font-semibold text-purple-900">✨ Enable Smart Auto-Mapping</span>
                                <p className="text-xs text-purple-700 mt-1">
                                    Automatically detect and map your Excel columns to the required fields.
                                </p>
                            </div>
                        </label>
                    </div>

                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                    {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}

                    {/* Show AI mapping results */}
                    {aiMapping && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h3 className="font-semibold text-sm text-purple-900 mb-2">✨ Smart Column Map:</h3>
                            <div className="space-y-1 text-xs">
                                {Object.entries(aiMapping).map(([original, mapped]) => (
                                    mapped && mapped !== 'null' && (
                                        <div key={original} className="flex items-center gap-2">
                                            <span className="text-gray-600">"{original}"</span>
                                            <span className="text-purple-600">→</span>
                                            <span className="font-semibold text-purple-900">{mapped}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Show detected columns */}
                    {headers.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-sm text-blue-900 mb-2">Detected Columns ({headers.length}):</h3>
                            <div className="flex flex-wrap gap-2">
                                {headers.map((header) => (
                                    <span key={header} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        {header}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-blue-700">
                                ✓ Required: ContactName, AddressLine1, City, Province, PostalCode, Country
                            </p>
                        </div>
                    )}
                </div>

                {/* Manual Mapping Section */}
                {showMapping && rawHeaders.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Column Mapping</h2>
                            <button
                                onClick={() => setShowMapping(false)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Hide
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Review and adjust how your Excel columns map to the required shipping fields.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(REQUIRED_FIELDS).map(([fieldKey, fieldDesc]) => {
                                const isRequired = fieldDesc.toLowerCase().includes('(required)');
                                return (
                                    <div key={fieldKey} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {fieldKey} {isRequired && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={manualMapping[fieldKey] || ''}
                                            onChange={(e) => handleMappingChange(fieldKey, e.target.value)}
                                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">-- Unmapped --</option>
                                            {rawHeaders.map((header) => (
                                                <option key={header} value={header}>
                                                    {header}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Settings Panel */}
                {parsedRows.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Settings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Signature Threshold ($)</label>
                                <input
                                    type="number"
                                    value={settings.signatureThreshold}
                                    onChange={(e) => setSettings({ ...settings, signatureThreshold: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Orders above this amount will require a signature.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Preview */}
                {parsedRows.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Data Preview (Mapped Fields)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Name</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">City/Prov/PC</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {parsedRows.slice(0, 20).map((row, idx) => {
                                        const rowErrors = validationErrors.filter((e) => e.row === idx + 1);
                                        const hasError = rowErrors.length > 0;

                                        return (
                                            <tr key={idx} className={hasError ? 'bg-red-50' : ''}>
                                                <td className="px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{row.CustomerReference || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-medium">{row.ContactName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                                    {row.AddressLine1}<br />
                                                    <span className="text-xs text-gray-500">{row.AddressLine2}</span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    {row.City}, {row.Province} {row.PostalCode}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{row.Country || 'CA'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                        {normalizeServiceCode(row.ServiceCode, 'DOM.EP')}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-bold text-green-700">
                                                    {row.Price ? `$${row.Price}` : '-'}
                                                    {row.Price && Number(row.Price) > (settings.signatureThreshold || 200) && (
                                                        <span className="ml-1 text-xs text-orange-600" title={`Signature Required (> $${settings.signatureThreshold || 200})`}>✍️</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-red-600">Validation Errors</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {validationErrors.map((error, idx) => (
                                <div key={idx} className="text-sm text-red-700">
                                    Row {error.row}, Field "{error.field}": {error.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {parsedRows.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={handleValidate}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition"
                            >
                                Validate
                            </button>

                            <button
                                onClick={handleGenerateXML}
                                disabled={validationErrors.length > 0}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate XML
                            </button>

                            <button
                                onClick={() => {
                                    const printWindow = window.open('', '_blank');
                                    if (!printWindow) return;

                                    const html = `
                                        <html>
                                            <head>
                                                <title>Picking List - ${new Date().toLocaleDateString()}</title>
                                                <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
                                                <style>
                                                    body { font-family: sans-serif; padding: 10px; font-size: 10px; }
                                                    h1 { font-size: 18px; margin-bottom: 5px; }
                                                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                    th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; vertical-align: middle; }
                                                    th { background-color: #f4f4f4; font-size: 11px; }
                                                    .barcode { font-family: 'Libre Barcode 39 Text', cursive; font-size: 32px; white-space: nowrap; line-height: 1; }
                                                    .date { font-size: 10px; color: #666; margin-bottom: 10px; }
                                                    .checkbox { width: 15px; height: 15px; border: 1px solid #333; display: inline-block; }
                                                    @media print {
                                                        .no-print { display: none; }
                                                        @page { margin: 0.5cm; }
                                                    }
                                                </style>
                                            </head>
                                            <body>
                                                <h1>📦 Picking List</h1>
                                                <div class="date">Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                                                
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Order Number</th>
                                                            <th>Barcode</th>
                                                            <th>Details</th>
                                                            <th>Done</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${parsedRows.map((row, i) => `
                                                            <tr>
                                                                <td>${i + 1}</td>
                                                                <td><strong>${row.CustomerReference || '-'}</strong></td>
                                                                <td class="barcode">*${row.CustomerReference || ''}*</td>
                                                                <td>
                                                                    <div style="font-weight: bold; font-size: 12px;">${row.Description || ''}</div>
                                                                    <div style="font-size: 10px; margin-top: 2px;">${row.ContactName || ''}</div>
                                                                    <div style="font-size: 9px; color: #666;">${row.City}, ${row.Province}</div>
                                                                </td>
                                                                <td style="text-align: center;"><div class="checkbox"></div></td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                                <script>
                                                    window.onload = () => window.print();
                                                </script>
                                            </body>
                                        </html>
                                    `;

                                    printWindow.document.write(html);
                                    printWindow.document.close();
                                }}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition border border-purple-800"
                            >
                                🖨️ Print Picking List
                            </button>

                            {generatedXML && (
                                <>
                                    <button
                                        onClick={handleDownloadXML}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                                    >
                                        Download XML
                                    </button>

                                    <button
                                        onClick={handleSaveToSupabase}
                                        disabled={loading}
                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save to Supabase'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
