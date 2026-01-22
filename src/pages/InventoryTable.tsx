import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types';
import * as XLSX from 'xlsx';

export default function InventoryTable() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

    // Universal Filter State
    const [filters, setFilters] = useState({
        global: '',
        serial: '',
        brand: '',
        model: '',
        cpu: '',
        ram: '',
        storage: '',
        grade: '',
        status: '',
        health: ''
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [items, filters]);

    async function fetchInventory() {
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let result = items;

        // Global Search
        if (filters.global) {
            const q = filters.global.toLowerCase();
            result = result.filter(i =>
                JSON.stringify(i).toLowerCase().includes(q)
            );
        }

        // Column Search
        if (filters.serial) result = result.filter(i => i.serial_number?.toLowerCase().includes(filters.serial.toLowerCase()));
        if (filters.brand) result = result.filter(i => i.brand?.toLowerCase().includes(filters.brand.toLowerCase()));
        if (filters.model) result = result.filter(i => i.model?.toLowerCase().includes(filters.model.toLowerCase()));
        if (filters.cpu) result = result.filter(i => i.specs?.processor?.toLowerCase().includes(filters.cpu.toLowerCase()));
        if (filters.ram) result = result.filter(i => i.specs?.ram_gb?.toString().includes(filters.ram));
        if (filters.storage) result = result.filter(i => i.specs?.storage_gb?.toString().includes(filters.storage));
        if (filters.grade) result = result.filter(i => i.grade?.toLowerCase().includes(filters.grade.toLowerCase()));
        if (filters.status) result = result.filter(i => i.status?.toLowerCase().includes(filters.status.toLowerCase()));
        if (filters.health) result = result.filter(i => i.specs?.battery_health?.toLowerCase().includes(filters.health.toLowerCase()));

        setFilteredItems(result);
    }

    function handleFilterChange(key: string, value: string) {
        setFilters(prev => ({ ...prev, [key]: value }));
    }

    // Export Function
    const handleExport = () => {
        const exportData = filteredItems.map(item => ({
            "Serial": item.serial_number,
            "Brand": item.brand,
            "Model": item.model,
            "Grade": item.grade,
            "Status": item.status,
            "CPU": item.specs?.processor,
            "RAM": item.specs?.ram_gb + 'GB',
            "Storage": item.specs?.storage_gb + 'GB',
            "GPU": item.specs?.graphics_card,
            "Screen": item.specs?.screen_size,
            "Resolution": item.specs?.screen_resolution,
            "OS": item.specs?.os_name,
            "Battery Health": item.specs?.battery_health,
            "Cycles": item.specs?.battery_cycles,
            "Location": item.location,
            "Scanned By": item.specs?.scanned_by
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory_Master");
        XLSX.writeFile(wb, `LapTek_Master_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading master inventory...</div>;

    return (
        <div className="bg-white min-h-screen flex flex-col h-screen">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 print:hidden">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">📊 Master Inventory Table</h1>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{filteredItems.length} Devices</span>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            placeholder="Unified Search..."
                            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filters.global}
                            onChange={e => handleFilterChange('global', e.target.value)}
                        />
                        <span className="absolute left-2.5 top-2.5 text-gray-400">🔍</span>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                    >
                        🖨️ Print
                    </button>

                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 shadow-sm"
                    >
                        📤 Export to Excel
                    </button>

                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                        Back
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-4">
                <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm print:bg-white">
                            <tr>
                                <th className="p-3 border-b border-gray-200 w-32">
                                    <div className="mb-1">Serial</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('serial', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-32">
                                    <div className="mb-1">Brand</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('brand', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-40">
                                    <div className="mb-1">Model</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('model', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-48">
                                    <div className="mb-1">CPU</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('cpu', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-20">
                                    <div className="mb-1">RAM</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('ram', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-24">
                                    <div className="mb-1">Storage</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('storage', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-24">
                                    <div className="mb-1">Health</div>
                                    <input placeholder="Filter..." className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('health', e.target.value)} />
                                </th>
                                <th className="p-3 border-b border-gray-200 w-24">
                                    <div className="mb-1">Grade</div>
                                    <select className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('grade', e.target.value)}>
                                        <option value="">All</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                    </select>
                                </th>
                                <th className="p-3 border-b border-gray-200 w-32">
                                    <div className="mb-1">Status</div>
                                    <select className="w-full p-1 text-xs border rounded font-normal print:hidden" onChange={e => handleFilterChange('status', e.target.value)}>
                                        <option value="">All</option>
                                        <option value="pending_triage">Pending</option>
                                        <option value="ready_to_ship">Ready</option>
                                        <option value="shipped">Shipped</option>
                                    </select>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50 transition-colors print:break-inside-avoid">
                                    <td className="p-3 font-mono text-xs">{item.serial_number}</td>
                                    <td className="p-3">{item.brand}</td>
                                    <td className="p-3 font-medium text-gray-900">{item.model}</td>
                                    <td className="p-3 text-xs text-gray-500">{item.specs?.processor?.replace('Intel(R) Core(TM) ', '')}</td>
                                    <td className="p-3">{item.specs?.ram_gb} GB</td>
                                    <td className="p-3">{item.specs?.storage_gb} GB</td>
                                    <td className="p-3">
                                        {item.specs?.battery_health ? (
                                            <span className={`font-bold ${item.specs.battery_health.includes('Unknown') ? 'text-gray-400' : parseInt(item.specs.battery_health) > 80 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {item.specs.battery_health}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${item.grade === 'A' ? 'bg-green-100 text-green-800 border-green-200' :
                                                item.grade === 'B' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    'bg-red-100 text-red-800 border-red-200'
                                            }`}>
                                            {item.grade}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className="text-xs uppercase font-bold text-gray-500">{item.status?.replace('_', ' ')}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredItems.length === 0 && (
                        <div className="p-8 text-center text-gray-500 bg-gray-50">
                            No devices found matching your filters.
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print\\:break-inside-avoid { break-inside: avoid; }
                    table { font-size: 10px; width: 100%; }
                    th, td { padding: 4px; border-bottom: 1px solid #ddd; }
                }
            `}</style>
        </div>
    );
}
