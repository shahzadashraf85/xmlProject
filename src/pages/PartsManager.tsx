import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryItem, PartRequest, Order } from '../types';
import * as XLSX from 'xlsx';

export default function PartsManager() {
    // Tab state
    const [activeTab, setActiveTab] = useState<'request' | 'orders'>('request');

    // REQUEST TAB STATE
    const [serialSearch, setSerialSearch] = useState('');
    const [foundDevice, setFoundDevice] = useState<InventoryItem | null>(null);
    const [aiText, setAiText] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [detectedParts, setDetectedParts] = useState<Array<{ name: string, number: string }>>([]);

    // ORDERS TAB STATE
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [reqRes, ordRes] = await Promise.all([
                supabase
                    .from('part_requests')
                    .select('*, inventory_item:inventory_items(*)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })
            ]);

            if (reqRes.error) throw reqRes.error;
            if (ordRes.error) throw ordRes.error;

            setRequests(reqRes.data || []);
            setOrders(ordRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
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
                if (error.code !== 'PGRST116') console.error(error);
                setMessage({ type: 'error', text: 'Device not found.' });
            } else {
                setFoundDevice(data);
                setMessage(null);
            }
        } finally {
            setIsSearching(false);
        }
    }

    // Enhanced AI parsing - detects MULTIPLE parts from one input
    function parseAIText() {
        if (!aiText.trim()) {
            setMessage({ type: 'error', text: 'Please enter a description first.' });
            return;
        }

        const text = aiText.toLowerCase();
        const detectedParts: Array<{ name: string, number: string }> = [];

        // Fuzzy part name patterns (handles typos/variations)
        const partPatterns = [
            { fuzzy: ['battery', 'battry', 'battary', 'batry', 'batt', 'batteries'], canonical: 'Battery' },
            { fuzzy: ['screen', 'scren', 'scrn', 'display', 'lcd', 'panel', 'monitor'], canonical: 'Screen' },
            { fuzzy: ['keyboard', 'keybaord', 'keybord', 'keys', 'kb'], canonical: 'Keyboard' },
            { fuzzy: ['charger', 'chargr', 'adapter', 'adaptr', 'power supply'], canonical: 'Charger' },
            { fuzzy: ['ram', 'memory', 'dimm', 'memry'], canonical: 'RAM' },
            { fuzzy: ['ssd', 'hard drive', 'hdd', 'storage', 'disk'], canonical: 'Storage Drive' },
            { fuzzy: ['motherboard', 'mobo', 'mainboard'], canonical: 'Motherboard' },
            { fuzzy: ['fan', 'cooling', 'cooler'], canonical: 'Cooling Fan' },
            { fuzzy: ['hinge', 'hinges', 'hing'], canonical: 'Hinge' },
            { fuzzy: ['touchpad', 'trackpad', 'mousepad', 'pad'], canonical: 'Touchpad' },
            { fuzzy: ['webcam', 'camera', 'cam'], canonical: 'Webcam' },
            { fuzzy: ['wifi', 'wireless', 'network card'], canonical: 'WiFi Card' },
            { fuzzy: ['speaker', 'speakers', 'spkr'], canonical: 'Speaker' },
            { fuzzy: ['cable', 'flex cable', 'wire'], canonical: 'Cable' },
            { fuzzy: ['bezel', 'cover', 'case'], canonical: 'Cover/Bezel' }
        ];

        // Split input by common delimiters (comma, newline, semicolon)
        const lines = text.split(/[,\n;]+/).map(l => l.trim()).filter(l => l);

        for (const line of lines) {
            let partName = '';
            let partNumber = '';

            // Find part name using fuzzy matching
            for (const pattern of partPatterns) {
                if (pattern.fuzzy.some(keyword => line.includes(keyword))) {
                    partName = pattern.canonical;
                    break;
                }
            }

            // Extract part number from this line
            let partNumMatch = line.match(/\b[A-Z0-9]{2,}[-_]?[A-Z0-9]{2,}[-_]?[A-Z0-9]*\b/i);
            if (!partNumMatch) partNumMatch = line.match(/\b[0-9]{4,}\b/);
            if (partNumMatch) partNumber = partNumMatch[0].toUpperCase();

            // Add to detected parts if we found something
            if (partName || partNumber) {
                detectedParts.push({ name: partName || 'Unknown Part', number: partNumber });
            }
        }

        // Show what was detected and update state
        if (detectedParts.length > 0) {
            setDetectedParts(detectedParts);
            setMessage({ type: 'success', text: `✨ Detected ${detectedParts.length} part(s)` });
        } else {
            setDetectedParts([]);
            setMessage({ type: 'error', text: 'Could not detect any parts. Please check format.' });
        }
    }

    async function handleSubmitRequest() {
        if (!foundDevice) {
            setMessage({ type: 'error', text: 'Please select a device first.' });
            return;
        }
        if (detectedParts.length === 0) {
            setMessage({ type: 'error', text: 'Please parse the AI text first.' });
            return;
        }

        try {
            const requests = detectedParts.map((part: any) => ({
                inventory_id: foundDevice.id,
                part_name: part.name,
                part_number: part.number,
                ai_description: aiText,
                status: 'requested'
            }));

            const { error } = await supabase.from('part_requests').insert(requests);
            if (error) throw error;

            setMessage({ type: 'success', text: `✅ ${detectedParts.length} part request(s) submitted!` });
            setAiText('');
            setFoundDevice(null);
            setSerialSearch('');
            setDetectedParts([]);
            fetchData();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to submit requests.' });
        }
    }

    function toggleSelection(id: string) {
        const newSet = new Set(selectedRequestIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRequestIds(newSet);
    }

    async function handleCreateOrder() {
        if (selectedRequestIds.size === 0 || !selectedSupplier) {
            alert('Please select parts and enter supplier name.');
            return;
        }

        try {
            // Create order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{ supplier: selectedSupplier, status: 'draft' }])
                .select()
                .single();

            if (orderError) throw orderError;

            // Update part requests with order_id and status
            const { error: updateError } = await supabase
                .from('part_requests')
                .update({ order_id: orderData.id, status: 'ordered' })
                .in('id', Array.from(selectedRequestIds));

            if (updateError) throw updateError;

            // Export to Excel
            const selected = requests.filter(r => selectedRequestIds.has(r.id));
            const exportData = selected.map(r => ({
                "Part Name": r.part_name,
                "Part Number": r.part_number,
                "Device Model": r.inventory_item?.model || 'Unknown',
                "Device Serial": r.inventory_item?.serial_number || 'Unknown',
                "Description": r.ai_description || ''
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Order");
            XLSX.writeFile(wb, `Order_${selectedSupplier}_${new Date().toISOString().split('T')[0]}.xlsx`);

            setSelectedRequestIds(new Set());
            setSelectedSupplier('');
            fetchData();
            alert('✅ Order created and Excel file downloaded!');
        } catch (err) {
            console.error(err);
            alert('Failed to create order.');
        }
    }

    async function handleMarkOrderReceived(orderId: string) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'received', received_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error marking order received:', err);
        }
    }

    const requestedParts = requests.filter(r => r.status === 'requested');
    const orderedParts = requests.filter(r => r.status === 'ordered');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">🛠️ Parts Management</h1>

                {/* Tab Switcher */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'request'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Request Parts
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'orders'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Manage Orders
                    </button>
                </div>
            </div>

            {/* TAB 1: REQUEST PARTS */}
            {activeTab === 'request' && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-700 mb-6">Request New Part</h2>

                    <div className="space-y-6">
                        {/* Step 1: Select Device */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">1️⃣ Select Device</label>
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
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                                >
                                    {isSearching ? '...' : 'Find'}
                                </button>
                            </div>

                            {foundDevice && (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-3">
                                    <div className="text-green-800 font-bold">✅ Device Found</div>
                                    <div className="text-sm text-green-700 mt-1">
                                        <p><strong>Model:</strong> {foundDevice.brand} {foundDevice.model}</p>
                                        <p><strong>Serial:</strong> {foundDevice.serial_number}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step 2: AI Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">2️⃣ Describe the Part Needed (AI will help fill the form)</label>
                            <textarea
                                placeholder="Example: 'Need replacement battery for this laptop, part number L15L4PC0'"
                                className="w-full px-4 py-3 border rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                value={aiText}
                                onChange={e => setAiText(e.target.value)}
                            />
                            <button
                                onClick={parseAIText}
                                disabled={!aiText}
                                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                            >
                                🤖 Parse with AI
                            </button>
                        </div>

                        {/* Detected Parts List */}
                        {detectedParts.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="font-bold text-blue-900 mb-2">📋 Parts to Submit ({detectedParts.length})</div>
                                <div className="space-y-2">
                                    {detectedParts.map((part, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">✓</span>
                                                <div>
                                                    <div className="font-bold text-gray-900">{part.name}</div>
                                                    <div className="text-xs text-gray-500">P/N: {part.number || 'Not specified'}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setDetectedParts(detectedParts.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSubmitRequest}
                            disabled={!foundDevice || detectedParts.length === 0}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Submit {detectedParts.length > 0 ? `${detectedParts.length} Part Request(s)` : 'Part Request'}
                        </button>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: MANAGE ORDERS */}
            {activeTab === 'orders' && (
                <div className="space-y-6">
                    {/* Requested Parts (Create Order) */}
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700">📋 Requested Parts ({requestedParts.length})</h2>
                            <div className="flex gap-2 items-center">
                                <input
                                    placeholder="Supplier Name..."
                                    className="px-3 py-2 border rounded-lg text-sm"
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                />
                                <button
                                    onClick={handleCreateOrder}
                                    disabled={selectedRequestIds.size === 0 || !selectedSupplier}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    📦 Create Order ({selectedRequestIds.size})
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto border rounded-lg">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading...</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-center w-10">☑️</th>
                                            <th className="p-3 text-left">Part</th>
                                            <th className="p-3 text-left">Device</th>
                                            <th className="p-3 text-left">Description</th>
                                            <th className="p-3 text-left">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {requestedParts.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequestIds.has(req.id)}
                                                        onChange={() => toggleSelection(req.id)}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-900">{req.part_name}</div>
                                                    <div className="text-xs text-gray-400">{req.part_number}</div>
                                                </td>
                                                <td className="p-3 text-xs">
                                                    <div>{req.inventory_item?.model}</div>
                                                    <div className="font-mono text-gray-400">{req.inventory_item?.serial_number}</div>
                                                </td>
                                                <td className="p-3 text-xs text-gray-500">{req.ai_description?.substring(0, 50)}...</td>
                                                <td className="p-3 text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {requestedParts.length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">No pending requests</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Active Orders */}
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">📦 Active Orders ({orders.filter(o => o.status !== 'received').length})</h2>

                        <div className="space-y-3">
                            {orders.filter(o => o.status !== 'received').map(order => (
                                <div key={order.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">Supplier: {order.supplier}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Created: {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Parts: {orderedParts.filter(p => p.order_id === order.id).length} items
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${order.status === 'sent' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {order.status}
                                            </span>
                                            <button
                                                onClick={() => handleMarkOrderReceived(order.id)}
                                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                            >
                                                Mark Received
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {orders.filter(o => o.status !== 'received').length === 0 && (
                                <div className="p-8 text-center text-gray-400">No active orders</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
