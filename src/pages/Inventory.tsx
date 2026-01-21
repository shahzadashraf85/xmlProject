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
    const [isEditing, setIsEditing] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});

    useEffect(() => {
        loadInventory();

        // Read search param from URL
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        if (search) {
            setSearchTerm(search);
        }

        const subscription = supabase
            .channel('inventory_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
                loadInventory();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (selectedItem) {
            setEditForm(selectedItem);
            setIsEditing(false);
        } else {
            setEditForm({});
        }
    }, [selectedItem]);

    async function loadInventory() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);

            // Update selected item if it exists in new data
            if (selectedItem) {
                const updated = data?.find(i => i.id === selectedItem.id);
                if (updated) setSelectedItem(updated);
            }
        } catch (err) {
            console.error('Error loading inventory:', err);
        } finally {
            setLoading(false);
        }
    }

    async function saveChanges() {
        if (!selectedItem || !editForm) return;

        try {
            const { error } = await supabase
                .from('inventory_items')
                .update(editForm)
                .eq('id', selectedItem.id);

            if (error) throw error;

            // Optimistic update
            setSelectedItem({ ...selectedItem, ...editForm } as InventoryItem);
            setItems(items.map(i => i.id === selectedItem.id ? { ...i, ...editForm } as InventoryItem : i));
            setIsEditing(false);

            // Show success toast or animation? For now alert is fine or just silent success
            // alert('Saved!');
        } catch (err) {
            alert('Error updating item');
        }
    }

    async function updateField(id: string, updates: Partial<InventoryItem>) {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // If we are just clicking buttons (Quick Actions), update local state immediately
            if (selectedItem && selectedItem.id === id) {
                const newItem = { ...selectedItem, ...updates };
                setSelectedItem(newItem);
                setItems(items.map(i => i.id === id ? newItem : i));
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    }

    async function deleteItem(id: string) {
        if (!confirm('Are you sure you want to delete this device? This cannot be undone.')) return;
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setItems(items.filter(i => i.id !== id));
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

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'bg-green-100 text-green-800 border-green-200';
            case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'C': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_triage': return 'bg-orange-100 text-orange-800';
            case 'in_repair': return 'bg-blue-100 text-blue-800';
            case 'ready_to_ship': return 'bg-green-100 text-green-800';
            case 'shipped': return 'bg-purple-100 text-purple-800';
            case 'scrapped': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
            {/* LEFT SIDEBAR: Device List */}
            <div className="w-[360px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-10 shadow-sm">
                {/* Header */}
                <div className="p-4 bg-white border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>📦</span> Inventory
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{stats.total}</span>
                    </h1>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-gray-100 space-y-3 bg-gray-50/50">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Status: All</option>
                            <option value="pending_triage">Pending</option>
                            <option value="in_repair">In Repair</option>
                            <option value="ready_to_ship">Ready</option>
                            <option value="shipped">Shipped</option>
                        </select>
                        <select
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterGrade}
                            onChange={e => setFilterGrade(e.target.value)}
                        >
                            <option value="all">Grade: All</option>
                            <option value="A">Grade A</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                        </select>
                    </div>
                </div>

                {/* Device List Items */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                            <span className="text-xs">Loading items...</span>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <span className="text-3xl block mb-2 opacity-50">📋</span>
                            <p className="text-sm">No match found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`group p-4 cursor-pointer transition-all hover:bg-gray-50 border-l-4 ${selectedItem?.id === item.id
                                        ? 'bg-blue-50/50 border-blue-600'
                                        : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <h3 className={`font-semibold text-sm ${selectedItem?.id === item.id ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {item.brand} {item.model}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getGradeColor(item.grade)}`}>
                                            {item.grade}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mb-2 truncate" title={item.serial_number}>
                                        SN: {item.serial_number}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                            {item.specs?.ram_gb || 0}GB
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                            {item.specs?.storage_gb || 0}GB
                                        </span>
                                        <div className="flex-1"></div>
                                        <span className={`px-1.5 py-0.5 rounded-md ${getStatusColor(item.status)}`}>
                                            {item.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="border-t border-gray-100 p-2 bg-gray-50 flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wider px-4">
                    <span>A: {stats.gradeA}</span>
                    <span>B: {stats.gradeB}</span>
                    <span>C: {stats.gradeC}</span>
                </div>
            </div>

            {/* RIGHT MAIN: Device Layout */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                {selectedItem ? (
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* 1. TOP CARD: Quick Actions & Status */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <span className="text-9xl">💻</span>
                            </div>

                            <div className="relative z-10">
                                {/* Header Row */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 rounded-lg">
                                                {selectedItem.device_type}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-sm font-mono text-gray-400">
                                                ID: {selectedItem.id.slice(0, 8)}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <div className="flex gap-2 items-center mt-2">
                                                <input
                                                    className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full"
                                                    value={editForm.brand}
                                                    onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                                                    placeholder="Brand"
                                                />
                                                <input
                                                    className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full"
                                                    value={editForm.model}
                                                    onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                                                    placeholder="Model"
                                                />
                                            </div>
                                        ) : (
                                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                                {selectedItem.brand} <span className="text-gray-600 font-medium">{selectedItem.model}</span>
                                            </h1>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 font-mono text-base">SN: {selectedItem.serial_number}</span>
                                            {selectedItem.specs?.part_number && (
                                                <span className="text-gray-400 text-sm"> / PN: {selectedItem.specs.part_number}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {!isEditing ? (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                                            >
                                                ✏️ Edit Details
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={saveChanges}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-colors"
                                                >
                                                    💾 Save Changes
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => deleteItem(selectedItem.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Delete Device"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Control Panel */}
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-wrap gap-8 items-center">
                                    {/* Grade Buttons */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Grading</label>
                                        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                                            {['A', 'B', 'C'].map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => updateField(selectedItem.id, { grade: g })}
                                                    className={`w-12 h-10 rounded-md font-bold text-lg flex items-center justify-center transition-all ${selectedItem.grade === g
                                                        ? g === 'A' ? 'bg-green-500 text-white shadow-md' : g === 'B' ? 'bg-yellow-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md'
                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status Selector */}
                                    <div className="space-y-2 min-w-[200px]">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</label>
                                        <div className="relative">
                                            <select
                                                value={selectedItem.status}
                                                onChange={e => updateField(selectedItem.id, { status: e.target.value })}
                                                className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-blue-500 font-medium shadow-sm transition-shadow hover:border-gray-300"
                                            >
                                                <option value="pending_triage">🟠 Pending Triage</option>
                                                <option value="in_repair">🔵 In Repair</option>
                                                <option value="ready_to_ship">🟢 Ready to Ship</option>
                                                <option value="shipped">🟣 Shipped</option>
                                                <option value="scrapped">⚫ Scrapped</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Input */}
                                    <div className="space-y-2 flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Location</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">📍</span>
                                            <input
                                                type="text"
                                                defaultValue={selectedItem.location || ''}
                                                onBlur={e => updateField(selectedItem.id, { location: e.target.value })}
                                                placeholder="Shelf / Bin ID"
                                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. SPECS GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Card Component Helper */}
                            {[
                                {
                                    title: "Core Performance",
                                    icon: "⚡",
                                    main: getSpec(selectedItem, 'processor'),
                                    sub: `${getSpec(selectedItem, 'processor_cores')} Cores • ${getSpec(selectedItem, 'processor_speed_mhz')} MHz`
                                },
                                {
                                    title: "Memory (RAM)",
                                    icon: "🧠",
                                    main: `${getSpec(selectedItem, 'ram_gb')} GB`,
                                    sub: `${getSpec(selectedItem, 'ram_type')} • ${getSpec(selectedItem, 'ram_speed_mhz')} MHz`,
                                    highlight: true,
                                    color: "blue"
                                },
                                {
                                    title: "Storage",
                                    icon: "💾",
                                    main: `${getSpec(selectedItem, 'storage_gb')} GB`,
                                    itemized: selectedItem.specs?.all_storage,
                                    highlight: true,
                                    color: "purple"
                                },
                                {
                                    title: "Graphics",
                                    icon: "🎮",
                                    main: getSpec(selectedItem, 'graphics_card'),
                                    itemized: selectedItem.specs?.all_gpus,
                                    sub: `${selectedItem.specs?.graphics_vram_mb || 0} MB VRAM`
                                },
                                {
                                    title: "Display",
                                    icon: "🖥️",
                                    main: getSpec(selectedItem, 'screen_size'),
                                    sub: `${getSpec(selectedItem, 'screen_resolution')}`
                                },
                                {
                                    title: "System",
                                    icon: "💿",
                                    main: getSpec(selectedItem, 'os_name'),
                                    sub: `${getSpec(selectedItem, 'os_version')} (${getSpec(selectedItem, 'os_architecture')})`
                                },
                                {
                                    title: "Network",
                                    icon: "🌐",
                                    // Complex render for network
                                    custom: (
                                        <div className="space-y-2 mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">MAC</span>
                                                <span className="font-mono text-gray-900">{getSpec(selectedItem, 'mac_address')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">WiFi</span>
                                                <span className="text-gray-900 truncate max-w-[150px]" title={String(getSpec(selectedItem, 'wifi_adapter'))}>{getSpec(selectedItem, 'wifi_adapter')}</span>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    title: "Battery & Power",
                                    icon: "🔋",
                                    main: selectedItem.specs?.has_battery ? "Battery Present" : "No Battery",
                                    sub: `Status: ${getSpec(selectedItem, 'battery_status')}`
                                },
                                {
                                    title: "Motherboard",
                                    icon: "🔧",
                                    main: getSpec(selectedItem, 'motherboard'),
                                    sub: `BIOS: ${getSpec(selectedItem, 'bios_version')}`
                                }
                            ].map((card, idx) => (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">{card.icon}</span>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.title}</h3>
                                    </div>

                                    {card.custom ? card.custom : (
                                        <>
                                            {card.highlight ? (
                                                <p className={`text-3xl font-bold text-${card.color || 'gray'}-600 mb-1`}>{card.main}</p>
                                            ) : (
                                                <p className="font-semibold text-gray-900 text-lg leading-tight mb-1">{card.main}</p>
                                            )}

                                            {/* Itemized Lists (Storage/GPUs) */}
                                            {card.itemized && Array.isArray(card.itemized) && card.itemized.length > 0 ? (
                                                <div className="space-y-2 mt-3">
                                                    {card.itemized.map((subItem: any, i: number) => (
                                                        <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-bold text-gray-700">
                                                                    {subItem.size_gb ? `${subItem.size_gb} GB` : subItem.name}
                                                                </span>
                                                                {subItem.type && (
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${subItem.type === 'SSD' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                        {subItem.type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-gray-500 truncate" title={subItem.model || subItem.driver}>
                                                                {subItem.model || subItem.driver}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">{card.sub}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Audit Log Footer */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span>🔍</span>
                                <span>Scanned by <strong className="text-gray-700">{selectedItem.specs?.scanned_by || 'Unknown'}</strong></span>
                                <span>on computer <strong className="text-gray-700">{selectedItem.specs?.computer_name || 'Unknown'}</strong></span>
                            </div>
                            <div>
                                Added: {new Date(selectedItem.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                        <span className="text-8xl mb-4 grayscale">💻</span>
                        <p className="text-xl font-medium">Select a device to view details</p>
                        <p className="text-sm mt-2 max-w-xs text-center">Click on any device in the list to inspect hardware specifications and manage inventory.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
