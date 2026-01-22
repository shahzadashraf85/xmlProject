import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

import type { InventoryItem } from '../types';

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

            // Update local state immediately
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

    // Export Handler
    const handleExport = (data: InventoryItem[]) => {
        const exportData = data.map(item => ({
            "Serial Number": item.serial_number,
            "Brand": item.brand,
            "Model": item.model,
            "Grade": item.grade,
            "Status": item.status,
            "Location": item.location,
            "Processor": item.specs?.processor || '-',
            "RAM (GB)": item.specs?.ram_gb || 0,
            "Storage (GB)": item.specs?.storage_gb || 0,
            "OS": item.specs?.os_name || '-',
            "Battery Health": item.specs?.battery_health || '-',
            "Battery Cycles": item.specs?.battery_cycles || '-',
            "Created At": new Date(item.created_at).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                            <option value="C">C Grade</option>
                        </select>
                    </div>
                    {/* Export Button */}
                    <button
                        onClick={() => handleExport(filteredItems)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <span>📊</span> Export Filtered ({filteredItems.length})
                    </button>
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

            {/* RIGHT MAIN: Device Layout (COMPACT) */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                {selectedItem ? (
                    <div className="max-w-full mx-auto space-y-3">

                        {/* 1. TOP CARD: Compact Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 rounded">
                                            {selectedItem.device_type}
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-xs font-mono text-gray-400">
                                            SN: {selectedItem.serial_number}
                                        </span>
                                    </div>

                                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                                        {selectedItem.brand} <span className="text-gray-600 font-medium">{selectedItem.model}</span>
                                    </h1>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs border border-blue-100 font-medium px-3 flex items-center gap-1">
                                        ✏️ Edit
                                    </button>
                                    <button onClick={() => deleteItem(selectedItem.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded border border-transparent hover:border-red-100">
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* Ultra Compact Controls (Quick Actions) */}
                            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Grade</span>
                                    <div className="flex bg-gray-50 rounded p-0.5 border border-gray-200">
                                        {['A', 'B', 'C'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => updateField(selectedItem.id, { grade: g })}
                                                className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-all ${selectedItem.grade === g
                                                    ? g === 'A' ? 'bg-green-500 text-white' : g === 'B' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-4 w-px bg-gray-200"></div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                                    <select
                                        value={selectedItem.status}
                                        onChange={e => updateField(selectedItem.id, { status: e.target.value })}
                                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 cursor-pointer hover:text-blue-600 p-0"
                                    >
                                        <option value="pending_triage">🟠 Pending Triage</option>
                                        <option value="in_repair">🔵 In Repair</option>
                                        <option value="ready_to_ship">🟢 Ready to Ship</option>
                                        <option value="shipped">🟣 Shipped</option>
                                        <option value="scrapped">⚫ Scrapped</option>
                                    </select>
                                </div>

                                <div className="h-4 w-px bg-gray-200"></div>

                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Loc</span>
                                    <input
                                        type="text"
                                        defaultValue={selectedItem.location || ''}
                                        onBlur={e => updateField(selectedItem.id, { location: e.target.value })}
                                        placeholder="Shelf ID..."
                                        className="text-xs border-none bg-transparent font-medium text-gray-700 focus:ring-0 p-0 w-full placeholder-gray-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. COMPACT SPECS GRID (4 Columns) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* Card Component Helper */}
                            {[
                                {
                                    title: "CPU",
                                    icon: "⚡",
                                    main: getSpec(selectedItem, 'processor'),
                                    sub: `${getSpec(selectedItem, 'processor_cores')}C / ${getSpec(selectedItem, 'processor_threads')}T @ ${getSpec(selectedItem, 'processor_speed_mhz')}MHz`
                                },
                                {
                                    title: "RAM",
                                    icon: "🧠",
                                    main: `${getSpec(selectedItem, 'ram_gb')} GB`,
                                    sub: `${getSpec(selectedItem, 'ram_type')} • ${getSpec(selectedItem, 'ram_slots')} Slots`,
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
                                    sub: `${selectedItem.specs?.graphics_vram_mb || 0} MB`
                                },
                                {
                                    title: "Display",
                                    icon: "🖥️",
                                    custom: (
                                        <div className="flex flex-col h-full justify-center">
                                            <span className="font-semibold text-gray-900 text-sm leading-tight">{getSpec(selectedItem, 'screen_size')}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[11px] text-gray-500">{getSpec(selectedItem, 'screen_resolution')}</span>
                                                {selectedItem.specs?.is_touch_screen && (
                                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded font-bold uppercase tracking-wide">Touch</span>
                                                )}
                                            </div>
                                        </div>
                                    ),
                                    main: "", sub: ""
                                },
                                {
                                    title: "OS",
                                    icon: "💿",
                                    main: getSpec(selectedItem, 'os_name'),
                                    sub: getSpec(selectedItem, 'os_version')
                                },
                                {
                                    title: "Network",
                                    icon: "🌐",
                                    main: "MAC / WiFi",
                                    custom: (
                                        <div className="space-y-1 mt-1 text-[10px]">
                                            <div className="flex justify-between"><span className="text-gray-400">MAC</span> <span className="font-mono">{getSpec(selectedItem, 'mac_address')}</span></div>
                                            <div className="flex justify-between gap-2 ml-0"><span className="text-gray-400">WiFi</span> <span className="truncate">{getSpec(selectedItem, 'wifi_adapter')}</span></div>
                                        </div>
                                    )
                                },
                                {
                                    title: "Power",
                                    icon: "🔋",
                                    main: selectedItem.specs?.has_battery ? "Battery Present" : "No Battery",
                                    custom: selectedItem.specs?.has_battery ? (
                                        <div className="space-y-1 mt-1 text-[10px]">
                                            <div className="flex justify-between"><span className="text-gray-400">Health</span> <span className="font-bold text-green-600">{getSpec(selectedItem, 'battery_health')}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">Cycles</span> <span className="font-mono">{getSpec(selectedItem, 'battery_cycles')}</span></div>
                                        </div>
                                    ) : null
                                }
                            ].map((card, idx) => (
                                <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:border-gray-300 transition-colors flex flex-col justify-center min-h-[90px]">
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                        <span className="text-sm">{card.icon}</span>
                                        <h3 className="text-[10px] font-bold uppercase tracking-wider">{card.title}</h3>
                                    </div>

                                    {card.custom ? card.custom : (
                                        <>
                                            {card.highlight ? (
                                                <p className={`text-xl font-bold text-${card.color || 'gray'}-600 leading-tight`}>{card.main}</p>
                                            ) : (
                                                <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2" title={String(card.main)}>{card.main}</p>
                                            )}

                                            {/* Itemized Lists (Storage/GPUs) */}
                                            {card.itemized && Array.isArray(card.itemized) && card.itemized.length > 0 ? (
                                                <div className="space-y-1 mt-1.5">
                                                    {card.itemized.slice(0, 2).map((subItem: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                            <span className="font-semibold truncate max-w-[80px]">
                                                                {subItem.size_gb ? `${subItem.size_gb}GB` : subItem.name}
                                                            </span>
                                                            {subItem.type && <span className="opacity-60">{subItem.type}</span>}
                                                        </div>
                                                    ))}
                                                    {card.itemized.length > 2 && <div className="text-[9px] text-gray-400 pl-1">+{card.itemized.length - 2} more...</div>}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-gray-500 mt-0.5">{card.sub}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Audit Log Footer */}
                        <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-2 text-[10px] text-gray-400 flex justify-between items-center">
                            <span>Scanned by <strong className="text-gray-600">{selectedItem.specs?.scanned_by || '-'}</strong> on <strong className="text-gray-600">{selectedItem.specs?.computer_name || '-'}</strong></span>
                            <span>{new Date(selectedItem.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                        <span className="text-6xl mb-4 grayscale">💻</span>
                        <p className="text-sm font-medium">Select device</p>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {isEditing && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Edit Device Details</h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 text-sm font-medium text-gray-500">
                            {['Basic Info', 'Hardware Specs', 'System & Network'].map((tab, i) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        const tabs = document.querySelectorAll('[data-tab-content]');
                                        tabs.forEach(t => t.classList.add('hidden'));
                                        tabs[i].classList.remove('hidden');

                                        const btns = document.querySelectorAll('[data-tab-btn]');
                                        btns.forEach(b => b.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-blue-50/50'));
                                        btns[i].classList.add('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-blue-50/50');
                                    }}
                                    data-tab-btn
                                    className={`flex-1 py-3 px-4 transition-colors ${i === 0 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {/* TAB 1: BASIC INFO */}
                            <div data-tab-content className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.brand || ''}
                                            onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.model || ''}
                                            onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number</label>
                                    <input
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        value={editForm.serial_number || ''}
                                        onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade</label>
                                        <div className="flex gap-2">
                                            {['A', 'B', 'C'].map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => setEditForm({ ...editForm, grade: g })}
                                                    className={`flex-1 py-2 rounded-lg font-bold border ${editForm.grade === g
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            value={editForm.status || ''}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        >
                                            <option value="pending_triage">Pending Triage</option>
                                            <option value="in_repair">In Repair</option>
                                            <option value="ready_to_ship">Ready to Ship</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="scrapped">Scrapped</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                                    <input
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Shelf A-12, Bin 3..."
                                        value={editForm.location || ''}
                                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* TAB 2: HARDWARE SPECS */}
                            <div data-tab-content className="space-y-4 hidden">
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h3 className="text-xs font-bold text-blue-600 uppercase mb-3">Processor (CPU)</h3>
                                        <div className="space-y-3">
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="Processor Name"
                                                value={editForm.specs?.processor || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, processor: e.target.value } })}
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                    placeholder="Cores"
                                                    value={editForm.specs?.processor_cores || ''}
                                                    onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, processor_cores: parseInt(e.target.value) || 0 } })}
                                                />
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                    placeholder="Speed (MHz)"
                                                    value={editForm.specs?.processor_speed_mhz || ''}
                                                    onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, processor_speed_mhz: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h3 className="text-xs font-bold text-purple-600 uppercase mb-3">Memory (RAM)</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="Size (GB)"
                                                value={editForm.specs?.ram_gb || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, ram_gb: parseInt(e.target.value) || 0 } })}
                                            />
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="Type (DDR4...)"
                                                value={editForm.specs?.ram_type || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, ram_type: e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h3 className="text-xs font-bold text-green-600 uppercase mb-3">Storage</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="Total Storage (GB)"
                                                value={editForm.specs?.storage_gb || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, storage_gb: parseInt(e.target.value) || 0 } })}
                                            />
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="Primary Type (SSD/HDD)"
                                                value={editForm.specs?.storage_type || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, storage_type: e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h3 className="text-xs font-bold text-orange-600 uppercase mb-3">Graphics (GPU)</h3>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm mb-3"
                                            placeholder="Graphics Card Name"
                                            value={editForm.specs?.graphics_card || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, graphics_card: e.target.value } })}
                                        />
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                            placeholder="VRAM (MB)"
                                            value={editForm.specs?.graphics_vram_mb || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, graphics_vram_mb: parseInt(e.target.value) || 0 } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* TAB 3: SYSTEM & NETWORK */}
                            <div data-tab-content className="space-y-4 hidden">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operating System</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="OS Name (Windows 10...)"
                                            value={editForm.specs?.os_name || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, os_name: e.target.value } })}
                                        />
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Version / Build"
                                            value={editForm.specs?.os_version || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, os_version: e.target.value } })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Screen Size (15.6 inch...)"
                                            value={editForm.specs?.screen_size || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, screen_size: e.target.value } })}
                                        />
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Resolution (1920x1080)"
                                            value={editForm.specs?.screen_resolution || ''}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, screen_resolution: e.target.value } })}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="is_touch_screen"
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            checked={editForm.specs?.is_touch_screen || false}
                                            onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, is_touch_screen: e.target.checked } })}
                                        />
                                        <label htmlFor="is_touch_screen" className="text-sm text-gray-700 font-medium select-none cursor-pointer">
                                            Touch Screen
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Network Identifiers</label>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase">MAC Address</span>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={editForm.specs?.mac_address || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, mac_address: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase">WiFi Adapter</span>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                value={editForm.specs?.wifi_adapter || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, wifi_adapter: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-4">
                                    <h3 className="text-xs font-bold text-teal-600 uppercase mb-3">Power & Battery</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Status</label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                value={editForm.specs?.battery_status || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, battery_status: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Health</label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="e.g. 95%"
                                                value={editForm.specs?.battery_health || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, battery_health: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Cycle Count</label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                                                placeholder="e.g. 45"
                                                value={editForm.specs?.battery_cycles || ''}
                                                onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, battery_cycles: e.target.value } })}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.specs?.has_battery || false}
                                                    onChange={e => setEditForm({ ...editForm, specs: { ...editForm.specs, has_battery: e.target.checked } })}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                Battery Present
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveChanges}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
