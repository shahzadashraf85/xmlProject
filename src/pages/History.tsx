import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface HistoryRecord {
    id: string;
    created_at: string;
    source_filename: string;
    row_count: number;
    service_code: string;
    xml_storage_path: string;
    user_id: string;
    parsed_data?: any[]; // For re-printing picking list
}

export default function History() {
    const { user, userRole } = useAuth();
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [user, userRole]);

    async function fetchHistory() {
        if (!user) return;

        try {
            let query = supabase
                .from('orders_imports')
                .select('*')
                .order('created_at', { ascending: false });

            // If not admin, only show own records
            if (userRole !== 'admin') {
                query = query.eq('user_id', user.id);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setRecords(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch history');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const { error } = await supabase
                .from('orders_imports')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            setRecords(records.filter(r => r.id !== id));
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    }

    function handlePrint(rows: any[]) {
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
                    <h1>📦 Picking List (Reprint)</h1>
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
                            ${rows.map((row, i) => `
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
                    <script>window.onload = () => window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }

    async function downloadXML(path: string, filename: string) {
        try {
            const { data, error } = await supabase.storage
                .from('exports')
                .download(path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert('Failed to download: ' + err.message);
        }
    }



    async function handleFetchShipment(row: any, rowIndex: number) {
        if (!selectedRecord || !row.CustomerReference) {
            alert('Cannot fetch without a Customer Reference number.');
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('get-shipment-details', {
                body: { reference: row.CustomerReference }
            });

            if (error) throw new Error(error.message);
            if (!data.success) {
                // If not found, just alert
                alert(data.error || 'Shipment not found.');
                return;
            }

            // Update State
            const updatedRows = [...selectedRecord.parsed_data!];
            updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                tracking_number: data.tracking_pin,
                label_url: data.label_url,
                shipment_id: data.shipment_id
            };

            const updatedRecord = { ...selectedRecord, parsed_data: updatedRows };
            setSelectedRecord(updatedRecord);

            // Persist
            await supabase
                .from('orders_imports')
                .update({ parsed_data: updatedRows })
                .eq('id', selectedRecord.id);

            alert(`Found! Tracking: ${data.tracking_pin}`);

        } catch (err: any) {
            alert('Fetch Failed: ' + err.message);
        }
    }

    async function handleCreateShipment(row: any, rowIndex: number) {
        if (!selectedRecord) return;

        const confirmShip = confirm(`Generate shipping label for ${row.ContactName}? This will charge your Canada Post account.`);
        if (!confirmShip) return;

        try {
            // 1. Map CSV fields to API expected fields
            const payload = {
                id: `${selectedRecord.id.substring(0, 8)}-${rowIndex}`,
                recipient_name: row.ContactName || 'Valued Customer',
                recipient_company: row.Company || '',
                address_line_1: row.AddressLine1,
                city: row.City,
                province: row.Province,
                postal_code: row.PostalCode,
                weight: 1, // Default or parse from row.Weight
                service_code: row.ServiceCode || 'DOM.EP',
                reference_number: row.CustomerReference
            };

            // 2. Call Edge Function
            const { data, error } = await supabase.functions.invoke('create-shipment', {
                body: { order: payload }
            });

            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.error || 'Unknown API error');

            // 3. Update Local State
            const updatedRows = [...selectedRecord.parsed_data!];
            updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                tracking_number: data.tracking_pin,
                label_url: data.label_url
            };

            const updatedRecord = { ...selectedRecord, parsed_data: updatedRows };
            setSelectedRecord(updatedRecord);

            // 4. Persist to DB
            const { error: dbError } = await supabase
                .from('orders_imports')
                .update({ parsed_data: updatedRows })
                .eq('id', selectedRecord.id);

            if (dbError) throw dbError;

            alert(`Success! Tracking: ${data.tracking_pin}`);

        } catch (err: any) {
            alert('Shipment Failed: ' + err.message);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg">
                    {error}
                </div>
            )}

            {userRole === 'admin' && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg">
                    <p className="text-sm font-medium">Admin View: Showing all records</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {records.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No conversion history found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Filename
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rows
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Service
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(record.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.source_filename}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.row_count}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.service_code}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center">
                                            <button
                                                onClick={() => downloadXML(record.xml_storage_path, `${record.source_filename}_export.xml`)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                XML
                                            </button>

                                            <button
                                                onClick={() => setSelectedRecord(record)}
                                                className="ml-4 text-green-600 hover:text-green-800 font-medium"
                                            >
                                                View Details
                                            </button>

                                            {record.parsed_data && (
                                                <button
                                                    onClick={() => handlePrint(record.parsed_data!)}
                                                    className="ml-4 text-purple-600 hover:text-purple-800 font-medium"
                                                >
                                                    🖨️ Pick List
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                className="ml-4 text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedRecord.source_filename} • {new Date(selectedRecord.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-auto">
                            {!selectedRecord.parsed_data || selectedRecord.parsed_data.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No detailed data available for this record.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shipment / Tracking</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedRecord.parsed_data.map((row: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{row.CustomerReference || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-medium">{row.ContactName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                                    <div>{row.AddressLine1}</div>
                                                    <div className="text-xs text-gray-500">{row.City}, {row.Province} {row.PostalCode}</div>
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {row.tracking_number ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                                                {row.tracking_number}
                                                            </span>
                                                            {row.label_url && (
                                                                <a href={row.label_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                                                                    📄 Download Label
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <button
                                                                onClick={() => handleFetchShipment(row, idx)}
                                                                className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded shadow-sm hover:bg-yellow-700 w-full"
                                                                title="Find existing shipment by Reference #"
                                                            >
                                                                🔍 Find Existing
                                                            </button>
                                                            <button
                                                                onClick={() => handleCreateShipment(row, idx)}
                                                                className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 w-full"
                                                            >
                                                                Create Label
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    <div>{row.ServiceCode || 'DOM.EP'}</div>
                                                    <div>{row.Length}x{row.Width}x{row.Height}cm</div>
                                                    <div>{row.Weight}g</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            {selectedRecord.parsed_data && (
                                <button
                                    onClick={() => handlePrint(selectedRecord.parsed_data!)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                                >
                                    🖨️ Reprint Pick List
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
