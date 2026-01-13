import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    const { user, userRole, signOut } = useAuth();
    const navigate = useNavigate();
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    async function handleSignOut() {
        await signOut();
        navigate('/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Conversion History</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Back to Dashboard
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
            </main >
        </div >
    );
}
