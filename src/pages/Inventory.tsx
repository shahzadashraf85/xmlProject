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
    created_at: string;
    specs: {
        manufacturer?: string;
        model_number?: string;
        part_number?: string;
        motherboard?: string;
        bios_version?: string;
        processor?: string;
        processor_cores?: number;
        processor_threads?: number;
        processor_speed_mhz?: number;
        processor_architecture?: string;
        ram_gb?: number;
        ram_type?: string;
        ram_speed_mhz?: number;
        ram_slots?: number;
        storage_gb?: number;
        storage_type?: string;
        storage_model?: string;
        all_storage?: Array<{ model: string; size_gb: number; type: string; interface: string }>;
        graphics_card?: string;
        graphics_vram_mb?: number;
        graphics_driver?: string;
        all_gpus?: Array<{ name: string; ram_mb: number; driver: string }>;
        screen_resolution?: string;
        screen_size?: string;
        monitor_count?: number;
        os_name?: string;
        os_version?: string;
        os_build?: string;
        os_architecture?: string;
        mac_address?: string;
        wifi_adapter?: string;
        has_battery?: boolean;
        battery_status?: string;
        scanned_at?: string;
        scanned_by?: string;
        computer_name?: string;
    };
}

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');

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
        const specs = item.specs || {};
        const matchesSearch =
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            specs.processor?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesGrade = filterGrade === 'all' || item.grade === filterGrade;

        return matchesSearch && matchesStatus && matchesGrade;
    });

    const stats = {
        total: items.length,
        gradeA: items.filter(i => i.grade === 'A').length,
        gradeB: items.filter(i => i.grade === 'B').length,
        gradeC: items.filter(i => i.grade === 'C').length,
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

    // Helper to get spec value (only primitive types)
    const getSpec = (item: InventoryItem, key: keyof InventoryItem['specs']): string | number => {
        const value = item.specs?.[key];
        if (value === undefined || value === null) return '-';
        if (typeof value === 'string' || typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return '-';
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            {/* LEFT: Device List */}
            <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h1 className="text-xl font-bold text-white">Inventory Manager</h1>
                    <p className="text-blue-100 text-sm mt-1">{stats.total} devices</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-gray-50 border-b text-center">
                    <div className="p-2 bg-white rounded">
                        <div className="text-lg font-bold">{stats.total}</div>
                        <div className="text-[10px] text-gray-500">Total</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                        <div className="text-lg font-bold text-green-700">{stats.gradeA}</div>
                        <div className="text-[10px] text-green-600">A</div>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                        <div className="text-lg font-bold text-yellow-700">{stats.gradeB}</div>
                        <div className="text-[10px] text-yellow-600">B</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                        <div className="text-lg font-bold text-red-700">{stats.gradeC}</div>
                        <div className="text-[10px] text-red-600">C</div>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b space-y-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full p-2 border rounded-lg text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <select className="flex-1 p-2 border rounded text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="pending_triage">Pending</option>
                            <option value="in_repair">In Repair</option>
                            <option value="ready_to_ship">Ready</option>
                        </select>
                        <select className="flex-1 p-2 border rounded text-xs" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                            <option value="all">All Grades</option>
                            <option value="A">Grade A</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                        </select>
                        <button onClick={loadInventory} className="px-3 bg-blue-600 text-white rounded text-xs">🔄</button>
                    </div>
                </div>

                {/* List */}
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
                                    className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedItem?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-sm">{item.brand} {item.model}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${gradeColors[item.grade] || 'bg-gray-100'}`}>{item.grade}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mb-1">{item.serial_number}</p>
                                    <div className="flex gap-2 text-xs text-gray-600">
                                        <span>{item.specs?.ram_gb || 0}GB</span>
                                        <span>•</span>
                                        <span>{item.specs?.storage_gb || 0}GB</span>
                                        <span>•</span>
                                        <span className={`px-1 py-0.5 rounded ${statusColors[item.status] || ''}`}>{item.status?.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Details */}
            <div className="flex-1 overflow-y-auto p-6">
                {selectedItem ? (
                    <>
                        {/* Header Card */}
                        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded text-sm font-bold border ${gradeColors[selectedItem.grade]}`}>Grade {selectedItem.grade}</span>
                                        <span className={`px-3 py-1 rounded text-sm ${statusColors[selectedItem.status]}`}>{selectedItem.status?.replace('_', ' ')}</span>
                                        <span className="px-3 py-1 rounded text-sm bg-gray-100">{selectedItem.device_type}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedItem.specs?.manufacturer || selectedItem.brand} {selectedItem.specs?.model_number || selectedItem.model}</h2>
                                    <p className="text-gray-500 font-mono mt-1">SN: {selectedItem.serial_number}</p>
                                    {selectedItem.specs?.part_number && <p className="text-gray-400 text-sm">Part#: {selectedItem.specs.part_number}</p>}
                                </div>
                                <button onClick={() => deleteItem(selectedItem.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">🗑️</button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <select value={selectedItem.grade} onChange={e => updateItem(selectedItem.id, { grade: e.target.value })} className="px-3 py-2 border rounded text-sm">
                                    <option value="A">Grade A</option>
                                    <option value="B">Grade B</option>
                                    <option value="C">Grade C</option>
                                </select>
                                <select value={selectedItem.status} onChange={e => updateItem(selectedItem.id, { status: e.target.value })} className="px-3 py-2 border rounded text-sm">
                                    <option value="pending_triage">Pending</option>
                                    <option value="in_repair">In Repair</option>
                                    <option value="ready_to_ship">Ready</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="scrapped">Scrapped</option>
                                </select>
                                <input type="text" defaultValue={selectedItem.location || ''} onBlur={e => updateItem(selectedItem.id, { location: e.target.value })} placeholder="Location" className="px-3 py-2 border rounded text-sm flex-1" />
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Processor */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">⚡ Processor</h3>
                                <p className="font-semibold text-gray-900 mb-2">{getSpec(selectedItem, 'processor')}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    <div>Cores: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'processor_cores')}</span></div>
                                    <div>Threads: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'processor_threads')}</span></div>
                                    <div>Speed: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'processor_speed_mhz')} MHz</span></div>
                                    <div>Arch: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'processor_architecture')}</span></div>
                                </div>
                            </div>

                            {/* RAM */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🧠 Memory (RAM)</h3>
                                <p className="text-3xl font-bold text-blue-600 mb-2">{getSpec(selectedItem, 'ram_gb')} GB</p>
                                <div className="text-xs text-gray-600">
                                    <div>Type: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'ram_type')}</span></div>
                                    <div>Speed: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'ram_speed_mhz')} MHz</span></div>
                                    <div>Slots: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'ram_slots')}</span></div>
                                </div>
                            </div>

                            {/* Storage */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">💾 Storage</h3>
                                {selectedItem.specs?.all_storage && selectedItem.specs.all_storage.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedItem.specs.all_storage.map((disk, i) => (
                                            <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className={`px-1.5 py-0.5 rounded ${disk.type === 'SSD' ? 'bg-green-100 text-green-800' : 'bg-gray-200'}`}>{disk.type}</span>
                                                    <span className="font-bold">{disk.size_gb} GB</span>
                                                </div>
                                                <p className="text-gray-600 mt-1 truncate" title={disk.model}>{disk.model}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-2xl font-bold text-purple-600">{getSpec(selectedItem, 'storage_gb')} GB</p>
                                )}
                            </div>

                            {/* Graphics */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🎮 Graphics</h3>
                                {selectedItem.specs?.all_gpus && selectedItem.specs.all_gpus.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedItem.specs.all_gpus.map((gpu, i) => (
                                            <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                                                <p className="font-semibold text-gray-900">{gpu.name}</p>
                                                <div className="flex justify-between text-gray-600 mt-1">
                                                    <span>VRAM: {gpu.ram_mb} MB</span>
                                                    <span className="text-[10px]">{gpu.driver}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-semibold">{getSpec(selectedItem, 'graphics_card')}</p>
                                )}
                            </div>

                            {/* Display */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🖥️ Display</h3>
                                <p className="text-xl font-bold text-gray-900 mb-2">{getSpec(selectedItem, 'screen_size')}</p>
                                <div className="text-xs text-gray-600">
                                    <div>Resolution: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'screen_resolution')}</span></div>
                                    <div>Monitors: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'monitor_count')}</span></div>
                                </div>
                            </div>

                            {/* OS */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">💿 Operating System</h3>
                                <p className="font-semibold text-gray-900 mb-2">{getSpec(selectedItem, 'os_name')}</p>
                                <div className="text-xs text-gray-600">
                                    <div>Version: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'os_version')}</span></div>
                                    <div>Build: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'os_build')}</span></div>
                                    <div>Arch: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'os_architecture')}</span></div>
                                </div>
                            </div>

                            {/* Network */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🌐 Network</h3>
                                <div className="text-xs space-y-2">
                                    <div>
                                        <span className="text-gray-500">MAC Address:</span>
                                        <p className="font-mono font-medium text-gray-900">{getSpec(selectedItem, 'mac_address')}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">WiFi:</span>
                                        <p className="font-medium text-gray-900">{getSpec(selectedItem, 'wifi_adapter')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Battery */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🔋 Battery</h3>
                                <p className="text-xl font-bold text-gray-900 mb-2">
                                    {selectedItem.specs?.has_battery ? '✅ Present' : '❌ No Battery'}
                                </p>
                                <div className="text-xs text-gray-600">
                                    Status: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'battery_status')}</span>
                                </div>
                            </div>

                            {/* Motherboard */}
                            <div className="bg-white rounded-xl shadow-sm border p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">🔧 Motherboard</h3>
                                <p className="font-semibold text-gray-900 mb-2">{getSpec(selectedItem, 'motherboard')}</p>
                                <div className="text-xs text-gray-600">
                                    BIOS: <span className="font-medium text-gray-900">{getSpec(selectedItem, 'bios_version')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scan Info */}
                        <div className="bg-gray-100 rounded-xl p-4 mt-6 text-sm text-gray-600 flex justify-between">
                            <span>Scanned by: <strong>{selectedItem.specs?.scanned_by || 'Unknown'}</strong> on <strong>{selectedItem.specs?.computer_name || '-'}</strong></span>
                            <span>{selectedItem.specs?.scanned_at || new Date(selectedItem.created_at).toLocaleString()}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <span className="text-6xl block mb-4">📦</span>
                            <p className="text-xl">Select a device to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
