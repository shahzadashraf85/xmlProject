import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { parseExcelFile, parseExcelFileWithAI, validateAllRows } from '../utils/excelParser';
import { applyMapping, REQUIRED_FIELDS } from '../utils/aiMapper';
import { generateXML, downloadXML, normalizeServiceCode } from '../utils/xmlGenerator';
import { supabase } from '../lib/supabase';
import type { OrderRow, ValidationError, GeneratorSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp, Sparkles, AlertCircle, CheckCircle, Download, Save, Printer } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    // const navigate = useNavigate();

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
    const [addressWarnings, setAddressWarnings] = useState<OrderRow[] | null>(null);

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

    function executeGeneration() {
        try {
            const xml = generateXML(parsedRows, settings);
            setGeneratedXML(xml);
            setMessage({ type: 'success', text: 'XML generated successfully!' });
            setAddressWarnings(null);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to generate XML' });
            setAddressWarnings(null);
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

        // Check for Address Warnings (Missing House Number)
        const suspiciousRows = parsedRows.filter(row => {
            const addr = row.AddressLine1 ? row.AddressLine1.toString().trim() : '';
            // Check if it starts with a digit. If empty, it's already a validation error, but safe to check.
            return addr.length > 0 && !/^\d/.test(addr);
        });

        if (suspiciousRows.length > 0) {
            setAddressWarnings(suspiciousRows);
            return;
        }

        executeGeneration();
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



    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipping Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Upload orders and generate Canada Post XMLs.</p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 border ${message.type === 'success'
                    ? 'bg-green-50 text-green-900 border-green-200'
                    : 'bg-red-50 text-red-900 border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileUp className="h-5 w-5 text-blue-500" />
                            Upload File
                        </CardTitle>
                        <CardDescription>
                            Supported formats: .xlsx, .xls, .csv
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/60 transition-colors">
                            <input
                                type="file"
                                id="file-upload"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                disabled={loading}
                                className="hidden"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full">
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm font-medium text-primary">Click to select file</span>
                                <span className="text-xs text-muted-foreground">or drag and drop here</span>
                            </label>
                        </div>

                        {file && (
                            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                                <FileUp size={16} />
                                <span className="truncate">{file.name}</span>
                            </div>
                        )}

                        <div className="border rounded-lg p-3 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-100">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useAI}
                                    onChange={(e) => setUseAI(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <div>
                                    <div className="flex items-center gap-1.5 font-semibold text-sm text-purple-900">
                                        <Sparkles size={14} className="text-purple-600" />
                                        Smart Map
                                    </div>
                                    <p className="text-xs text-purple-700 mt-0.5 leading-snug">
                                        AI auto-detects column mapping.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Status / Log Section (if parsed) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Import Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!parsedRows.length && !aiMapping ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                                Ready to import data
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {aiMapping && (
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                        <h3 className="font-semibold text-xs text-purple-900 mb-2 flex items-center gap-1">
                                            <Sparkles size={12} /> AI Mapping Results:
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                            {Object.entries(aiMapping).map(([original, mapped]) => (
                                                mapped && mapped !== 'null' && (
                                                    <div key={original} className="flex flex-col bg-white p-1.5 rounded border border-purple-100">
                                                        <span className="text-gray-500 line-through decoration-purple-300">{original}</span>
                                                        <span className="font-medium text-purple-700">→ {mapped}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {headers.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium mb-2">Recognized Columns:</h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {headers.map(h => (
                                                <Badge key={h} variant="secondary">{h}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Manual Mapping Section */}
            {showMapping && rawHeaders.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">Column Mapping</CardTitle>
                            <CardDescription>Review and adjust how your Excel columns map to the required shipping fields.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowMapping(false)}>Hide</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(REQUIRED_FIELDS).map(([fieldKey, fieldDesc]) => {
                                const isRequired = fieldDesc.toLowerCase().includes('(required)');
                                return (
                                    <div key={fieldKey} className="p-3 rounded-lg border bg-muted/20">
                                        <label className="block text-sm font-medium mb-1.5 flex justify-between">
                                            <span>{fieldKey}</span>
                                            {isRequired && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">REQUIRED</span>}
                                        </label>
                                        <select
                                            value={manualMapping[fieldKey] || ''}
                                            onChange={(e) => handleMappingChange(fieldKey, e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                    </CardContent>
                </Card>
            )}

            {/* Settings Panel */}
            {parsedRows.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Signature Threshold ($)</label>
                                <Input
                                    type="number"
                                    value={settings.signatureThreshold}
                                    onChange={(e) => setSettings({ ...settings, signatureThreshold: parseFloat(e.target.value) })}
                                />
                                <p className="text-xs text-muted-foreground mt-1 text-orange-600 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    Orders above this amount will require a signature.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Data Preview */}
            {parsedRows.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Data Preview (Mapped Fields)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Ref</TableHead>
                                        <TableHead>Contact Name</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>City/Prov/PC</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedRows.slice(0, 20).map((row, idx) => {
                                        const rowErrors = validationErrors.filter((e) => e.row === idx + 1);
                                        const hasError = rowErrors.length > 0;

                                        return (
                                            <TableRow key={idx} className={hasError ? 'bg-red-50/50 hover:bg-red-100/50' : ''}>
                                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                                <TableCell>{row.CustomerReference || '-'}</TableCell>
                                                <TableCell className="font-medium">{row.ContactName || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{row.AddressLine1}</div>
                                                    {row.AddressLine2 && <div className="text-xs text-muted-foreground">{row.AddressLine2}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    {row.City}, {row.Province} {row.PostalCode}
                                                </TableCell>
                                                <TableCell>{row.Country || 'CA'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {normalizeServiceCode(row.ServiceCode, 'DOM.EP')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold text-green-700">
                                                    {row.Price ? `$${row.Price}` : '-'}
                                                    {row.Price && Number(row.Price) > (settings.signatureThreshold || 100) && (
                                                        <span className="ml-1 text-xs" title={`Signature Required (> $${settings.signatureThreshold || 100})`}>✍️</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Warning Modal */}
            {addressWarnings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
                        <CardHeader className="border-b bg-orange-50/50">
                            <CardTitle className="text-orange-700 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Address Format Warnings
                            </CardTitle>
                            <CardDescription>
                                The following addresses do not seem to start with a house number.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0">
                            <div className="p-6 space-y-4">
                                {addressWarnings.map((row, i) => (
                                    <div key={i} className="p-3 bg-muted rounded-lg border">
                                        <div className="font-bold">{row.ContactName || 'Unknown Contact'}</div>
                                        <div className="text-red-600 font-mono text-sm mt-1">{row.AddressLine1}</div>
                                        <div className="text-xs text-muted-foreground">{row.City}, {row.Province}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t p-4 flex justify-end gap-3 bg-gray-50/50">
                            <Button variant="outline" onClick={() => setAddressWarnings(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={executeGeneration}>Proceed Anyway</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <Card className="border-red-200 shadow-sm">
                    <CardHeader className="bg-red-50/50 pb-2">
                        <CardTitle className="text-red-700 text-base flex items-center gap-2">
                            <AlertCircle size={16} />
                            Validation Errors ({validationErrors.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 max-h-48 overflow-y-auto mt-2 pr-2">
                            {validationErrors.map((error, idx) => (
                                <div key={idx} className="text-sm text-red-600 bg-red-50/30 px-2 py-1 rounded">
                                    <span className="font-semibold">Row {error.row}:</span> Field "{error.field}" - {error.message}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {parsedRows.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 md:flex-row shadow-2xl p-4 bg-white/90 backdrop-blur border rounded-xl">
                    <Button
                        onClick={handleValidate}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white border-none"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Validate
                    </Button>

                    <Button
                        onClick={handleGenerateXML}
                        disabled={validationErrors.length > 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <FileUp className="mr-2 h-4 w-4" />
                        Generate XML
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;

                            const printHtml = `
                                <html>
                                    <head>
                                        <title>Picking List</title>
                                        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
                                        <style>
                                            body { font-family: sans-serif; padding: 20px; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                            .barcode { font-family: 'Libre Barcode 39 Text', cursive; font-size: 32px; }
                                        </style>
                                    </head>
                                    <body>
                                        <h1>📦 Picking List</h1>
                                        <table>
                                            <thead>
                                                <tr><th>#</th><th>Ref</th><th>Barcode</th><th>Details</th></tr>
                                            </thead>
                                            <tbody>
                                                ${parsedRows.map((r, i) => `
                                                    <tr>
                                                        <td>${i + 1}</td>
                                                        <td>${r.CustomerReference}</td>
                                                        <td class="barcode">*${r.CustomerReference}*</td>
                                                        <td>${r.Description}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                        <script>window.onload = () => window.print();</script>
                                    </body>
                                </html>`;
                            printWindow.document.write(printHtml);
                            printWindow.document.close();
                        }}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Print List
                    </Button>

                    {generatedXML && (
                        <>
                            <Button onClick={handleDownloadXML} className="bg-green-600 hover:bg-green-700">
                                <Download className="mr-2 h-4 w-4" />
                                Download XML
                            </Button>

                            <Button
                                onClick={handleSaveToSupabase}
                                disabled={loading}
                                variant="outline"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? 'Saving...' : 'Save to Cloud'}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
