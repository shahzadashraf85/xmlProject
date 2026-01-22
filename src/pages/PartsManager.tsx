import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryItem, PartRequest } from '../types';
import * as XLSX from 'xlsx';

export default function PartsManager() {
    // State for Request Form
    const [serialSearch, setSerialSearch] = useState('');
    const [foundDevice, setFoundDevice] = useState<InventoryItem | null>(null);
    const [partDetails, setPartDetails] = useState({ part_name: '', part_number: '', supplier: '', notes: '' });
    const [isSearching, setIsSearching] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State for Order Management
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        try {
            const { data, error } = await supabase
                .from('part_requests')
                .select('*, inventory_item:inventory_items(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSearchDevice() {
        if (!serialSearch.trim()) return;
        setIsSearching(true);
        setFoundDevice(null);
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .ilike('serial_number', serialSearch.trim())
                .single();

            if (error) {
                if (error.code !== 'PGRST116') console.error(error); // ignore not found
                setMessage({ type: 'error', text: 'Device not found.' });
            } else {
                setFoundDevice(data);
                setMessage(null);
            }
        } finally {
            setIsSearching(false);
        }
    }

    async function handleSubmitRequest() {
        if (!foundDevice || !partDetails.part_name) {
            setMessage({ type: 'error', text: 'Please select a device and enter part name.' });
            return;
        }

        try {
            const { error } = await supabase
                .from('part_requests')
                .insert([{
                    inventory_id: foundDevice.id,
                    part_name: partDetails.part_name,
                    part_number: partDetails.part_number,
                    supplier: partDetails.supplier,
                    notes: partDetails.notes,
                    status: 'requested',
                    created_by: 'Technician' // Placeholder for auth user
                }]);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Part request submitted successfully!' });
            setPartDetails({ part_name: '', part_number: '', supplier: '', notes: '' });
            setFoundDevice(null);
            setSerialSearch('');
            fetchRequests(); // Refresh list
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to submit request.' });
        }
    }

    async function handleMarkReceived(id: string) {
        try {
            const { error } = await supabase
                .from('part_requests')
                .update({ status: 'received', received_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchRequests();
        } catch (err) {
            console.error('Error marking received:', err);
        }
    }

    function toggleSelection(id: string) {
        const newSet = new Set(selectedRequestIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRequestIds(newSet);
    }

    function handleExportOrders() {
        const selected = requests.filter(r => selectedRequestIds.has(r.id));
        if (selected.length === 0) return;

        const exportData = selected.map(r => ({
            "Request Date": new Date(r.created_at).toLocaleDateString(),
            "Part Name": r.part_name,
            "Part Number": r.part_number,
            "Supplier": r.supplier,
            "Device Model": r.inventory_item?.model || 'Unknown',
            "Device Serial": r.inventory_item?.serial_number || 'Unknown',
            "Notes": r.notes
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Part Orders");
        XLSX.writeFile(wb, `Part_Order_${new Date().toISOString().split('T')[0]}.xlsx`);

        // Optionally update status to 'ordered' here
        updateStatusToOrdered(Array.from(selectedRequestIds));
    }

    async function updateStatusToOrdered(ids: string[]) {
        await supabase
            .from('part_requests')
            .update({ status: 'ordered', ordered_at: new Date().toISOString() })
            .in('id', ids);
        fetchRequests();
        setSelectedRequestIds(new Set());
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">🛠️ Parts Management</h1>

            {/* SECTION 1: REQUEST PART */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Request New Part</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Device Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-600">1. Select Device</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="Scan/Enter Serial Number..."
                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={serialSearch}
                                onChange={e => setSerialSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchDevice()}
                            />
                            <button
                                onClick={handleSearchDevice}
                                disabled={isSearching}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSearching ? '...' : 'Find'}
                            </button>
                        </div>

                        {foundDevice && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-2">
                                <div className="text-green-800 font-bold">✅ Device Found</div>
                                <div className="text-sm text-green-700 mt-1">
                                    <p><strong>Model:</strong> {foundDevice.model}</p>
                                    <p><strong>Serial:</strong> {foundDevice.serial_number}</p>
                                </div>
                            </div>
                        )}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* Right: Part Details */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-600">2. Part Details</label>

                        <div className="grid grid-cols-2 gap-4">
                            <input
                                placeholder="Part Name (e.g. Battery)"
                                className="px-3 py-2 border rounded-lg w-full"
                                value={partDetails.part_name}
                                onChange={e => setPartDetails({ ...partDetails, part_name: e.target.value })}
                            />
                            <input
                                placeholder="Part Number (optional)"
                                className="px-3 py-2 border rounded-lg w-full"
                                value={partDetails.part_number}
                                onChange={e => setPartDetails({ ...partDetails, part_number: e.target.value })}
                            />
                        </div>

                        <input
                            placeholder="Preferred Supplier (optional)"
                            className="px-3 py-2 border rounded-lg w-full"
                            value={partDetails.supplier}
                            onChange={e => setPartDetails({ ...partDetails, supplier: e.target.value })}
                        />

                        <textarea
                            placeholder="Tech Notes / AI Description (e.g. 'Customer says battery drains fast, replace with OEM')"
                            className="px-3 py-2 border rounded-lg w-full h-24 resize-none"
                            value={partDetails.notes}
                            onChange={e => setPartDetails({ ...partDetails, notes: e.target.value })}
                        />

                        <button
                            onClick={handleSubmitRequest}
                            disabled={!foundDevice || !partDetails.part_name}
                            className="w-full py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Submit Request
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION 2: ORDER MANAGEMENT */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex-1 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-700">Pending Orders</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportOrders}
                            disabled={selectedRequestIds.size === 0}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            📦 Create Order Sheet ({selectedRequestIds.size})
                        </button>
                    </div>
                </div>

                <div className="overflow-auto border rounded-lg">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 font-medium">Loading requests...</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-3 w-10 text-center">Select</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Part</th>
                                    <th className="p-3">Supplier</th>
                                    <th className="p-3">Device Info</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(req.id)}
                                                onChange={() => toggleSelection(req.id)}
                                                disabled={req.status === 'received'}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status === 'received' ? 'bg-green-100 text-green-700' :
                                                req.status === 'ordered' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <div className="font-medium text-gray-900">{req.part_name}</div>
                                            <div className="text-xs text-gray-400">{req.part_number}</div>
                                        </td>
                                        <td className="p-3 text-gray-600">{req.supplier || '-'}</td>
                                        <td className="p-3 text-gray-600 text-xs">
                                            <div>{req.inventory_item?.model}</div>
                                            <div className="font-mono">{req.inventory_item?.serial_number}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            {req.status !== 'received' && (
                                                <button
                                                    onClick={() => handleMarkReceived(req.id)}
                                                    className="px-3 py-1 bg-green-50 text-green-700 text-xs border border-green-200 rounded hover:bg-green-100"
                                                >
                                                    Mark Received
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400">No part requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
