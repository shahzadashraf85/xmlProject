import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InventoryItem {
    id: string;
    brand: string;
    model: string;
    serial_number: string;
    device_type: string;
    grade: string;
    status: string;
    location: string;
    processor: string;
    processor_cores: number;
    ram_gb: number;
    ram_type: string;
    storage_gb: number;
    storage_type: string;
    graphics_card: string;
    screen_size: string;
    screen_resolution: string;
    os_name: string;
    os_version: string;
    mac_address: string;
    has_battery: boolean;
    battery_status: string;
    product_condition: string;
    offer_price: number;
    scanned_at: string;
    scanned_by: string;
    created_at: string;
    specs: any;
}

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    useEffect(() => {
        loadInventory();
    }, []);

    async function loadInventory() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Error loading inventory:', err);
        } finally {
            setLoading(false);
        }
    }

    async function updateItem(id: string, updates: Partial<InventoryItem>) {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            loadInventory();
            if (selectedItem?.id === id) {
                setSelectedItem({ ...selectedItem, ...updates });
            }
        } catch (err) {
            alert('Error updating item');
        }
    }

    async function deleteItem(id: string) {
        if (!confirm('Delete this device permanently?')) return;
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadInventory();
            setSelectedItem(null);
        } catch (err) {
            alert('Error deleting item');
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.processor?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesGrade = filterGrade === 'all' || item.grade === filterGrade;

        return matchesSearch && matchesStatus && matchesGrade;
    });

    const stats = {
        total: items.length,
        gradeA: items.filter(i => i.grade === 'A').length,
        gradeB: items.filter(i => i.grade === 'B').length,
        gradeC: items.filter(i => i.grade === 'C').length,
        pending: items.filter(i => i.status === 'pending_triage').length,
        ready: items.filter(i => i.status === 'ready_to_ship').length,
    };

    const gradeColors: Record<string, string> = {
        'A': 'bg-green-100 text-green-800 border-green-200',
        'B': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'C': 'bg-red-100 text-red-800 border-red-200',
    };

    const statusColors: Record<string, string> = {
        'pending_triage': 'bg-orange-100 text-orange-800',
        'in_repair': 'bg-blue-100 text-blue-800',
        'ready_to_ship': 'bg-green-100 text-green-800',
        'shipped': 'bg-purple-100 text-purple-800',
        'scrapped': 'bg-gray-100 text-gray-800',
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            {/* LEFT: Device List */}
            <div className="w-[400px] bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h1 className="text-xl font-bold text-white">Inventory Manager</h1>
                    <p className="text-blue-100 text-sm mt-1">{stats.total} devices</p>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-gray-50 border-b">
                    <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                        <div className="text-[10px] text-gray-500">Total</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-lg font-bold text-green-700">{stats.gradeA}</div>
                        <div className="text-[10px] text-green-600">Grade A</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                        <div className="text-lg font-bold text-yellow-700">{stats.gradeB}</div>
                        <div className="text-[10px] text-yellow-600">Grade B</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-lg font-bold text-red-700">{stats.gradeC}</div>
                        <div className="text-[10px] text-red-600">Grade C</div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="p-3 border-b space-y-2">
                    <input
                        type="text"
                        placeholder="Search by brand, model, serial..."
                        className="w-full p-2 border rounded-lg text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <select
                            className="flex-1 p-2 border rounded text-xs"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending_triage">Pending</option>
                            <option value="in_repair">In Repair</option>
                            <option value="ready_to_ship">Ready</option>
                            <option value="shipped">Shipped</option>
                        </select>
                        <select
                            className="flex-1 p-2 border rounded text-xs"
                            value={filterGrade}
                            onChange={e => setFilterGrade(e.target.value)}
                        >
                            <option value="all">All Grades</option>
                            <option value="A">Grade A</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                        </select>
                        <button onClick={loadInventory} className="p-2 bg-blue-600 text-white rounded text-xs">
                            🔄
                        </button>
                    </div>
                </div>

                {/* Device List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <span className="text-4xl block mb-2">📦</span>
                            No devices found
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedItem?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-sm text-gray-900">
                                            {item.brand} {item.model}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${gradeColors[item.grade] || 'bg-gray-100'}`}>
                                            {item.grade}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mb-1">{item.serial_number}</p>
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-gray-600">{item.ram_gb}GB • {item.storage_gb}GB</span>
                                        <span className={`px-1.5 py-0.5 rounded ${statusColors[item.status] || 'bg-gray-100'}`}>
                                            {item.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Device Details */}
            <div className="flex-1 overflow-y-auto">
                {selectedItem ? (
                    <div className="p-6">
                        {/* Header */}
                        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${gradeColors[selectedItem.grade]}`}>
                                            Grade {selectedItem.grade}
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg text-sm ${statusColors[selectedItem.status]}`}>
                                            {selectedItem.status?.replace('_', ' ')}
                                        </span>
                                        <span className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700">
                                            {selectedItem.device_type}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">{selectedItem.brand} {selectedItem.model}</h2>
                                    <p className="text-gray-500 font-mono text-lg mt-1">SN: {selectedItem.serial_number}</p>
                                </div>
                                <button
                                    onClick={() => deleteItem(selectedItem.id)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded"
                                >
                                    🗑️
                                </button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <select
                                    value={selectedItem.grade}
                                    onChange={e => updateItem(selectedItem.id, { grade: e.target.value })}
                                    className="px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="A">Grade A</option>
                                    <option value="B">Grade B</option>
                                    <option value="C">Grade C</option>
                                </select>
                                <select
                                    value={selectedItem.status}
                                    onChange={e => updateItem(selectedItem.id, { status: e.target.value })}
                                    className="px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="pending_triage">Pending Triage</option>
                                    <option value="in_repair">In Repair</option>
                                    <option value="ready_to_ship">Ready to Ship</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="scrapped">Scrapped</option>
                                </select>
                                <input
                                    type="text"
                                    value={selectedItem.location || ''}
                                    onChange={e => updateItem(selectedItem.id, { location: e.target.value })}
                                    placeholder="Location"
                                    className="px-3 py-2 border rounded-lg text-sm flex-1"
                                />
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Processor */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>⚡</span> Processor
                                </h3>
                                <p className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.processor || 'Unknown'}</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">Cores:</span>
                                        <span className="ml-2 font-medium">{selectedItem.processor_cores || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Arch:</span>
                                        <span className="ml-2 font-medium">{selectedItem.specs?.processor_architecture || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Memory */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🧠</span> Memory
                                </h3>
                                <p className="text-3xl font-bold text-blue-600 mb-2">{selectedItem.ram_gb || 0} GB</p>
                                <div className="text-sm text-gray-500">
                                    {selectedItem.ram_type} @ {selectedItem.specs?.ram_speed_mhz || '-'} MHz
                                </div>
                            </div>

                            {/* Storage */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>💾</span> Storage
                                </h3>
                                <p className="text-3xl font-bold text-purple-600 mb-2">{selectedItem.storage_gb || 0} GB</p>
                                <div className="text-sm">
                                    <span className={`px-2 py-1 rounded ${selectedItem.storage_type === 'SSD' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                        {selectedItem.storage_type || 'Unknown'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{selectedItem.specs?.storage_model}</p>
                            </div>

                            {/* Graphics */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🎮</span> Graphics
                                </h3>
                                <p className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.graphics_card || 'Unknown'}</p>
                                <div className="text-sm text-gray-500">
                                    VRAM: {selectedItem.specs?.graphics_vram_mb || '-'} MB
                                </div>
                            </div>

                            {/* Display */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🖥️</span> Display
                                </h3>
                                <p className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.screen_size || 'Unknown'}</p>
                                <div className="text-sm text-gray-500">
                                    Resolution: {selectedItem.screen_resolution || '-'}
                                </div>
                            </div>

                            {/* Operating System */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>💿</span> Operating System
                                </h3>
                                <p className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.os_name || 'Unknown'}</p>
                                <div className="text-sm text-gray-500">
                                    Version: {selectedItem.os_version || '-'}
                                </div>
                            </div>

                            {/* Network */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🌐</span> Network
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">MAC:</span>
                                        <span className="ml-2 font-mono">{selectedItem.mac_address || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">WiFi:</span>
                                        <span className="ml-2">{selectedItem.specs?.wifi_adapter || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Battery */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🔋</span> Battery
                                </h3>
                                <p className="text-lg font-semibold text-gray-900 mb-2">
                                    {selectedItem.has_battery ? 'Present' : 'No Battery'}
                                </p>
                                <div className="text-sm text-gray-500">
                                    Status: {selectedItem.battery_status || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Scan Info */}
                        <div className="bg-gray-100 rounded-xl p-4 mt-6 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Scanned by: {selectedItem.scanned_by || 'Unknown'}</span>
                                <span>Date: {selectedItem.scanned_at ? new Date(selectedItem.scanned_at).toLocaleString() : selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : '-'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <span className="text-6xl block mb-4">📦</span>
                            <p className="text-xl">Select a device to view details</p>
                            <p className="text-sm mt-2">Or use the PowerShell script to add new devices</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
