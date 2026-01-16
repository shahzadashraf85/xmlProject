import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryItem, DeviceSpecs } from '../types';

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Filters
    const [filterBrand, setFilterBrand] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCondition, setFilterCondition] = useState('all');

    // Form State
    const emptySpecs: DeviceSpecs = {
        processor: '', ram: '', storage: '', graphics: '', os: '', condition: '',
        display: '', ports: '', connectivity: '', keyboard: '', battery: '', // Laptop
        form_factor: '', network: '', warranty: '' // Desktop
    };

    const [formData, setFormData] = useState<Partial<InventoryItem> & { specs: DeviceSpecs }>({
        serial_number: '',
        brand: '',
        model: '',
        device_type: 'laptop',
        grade: 'B',
        repair_needed_description: '',
        status: 'pending_triage',
        specs: { ...emptySpecs }
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [items, filterBrand, filterType, filterCondition]);

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
        let res = items;
        if (filterBrand) {
            res = res.filter(i => i.brand.toLowerCase().includes(filterBrand.toLowerCase()));
        }
        if (filterType !== 'all') {
            res = res.filter(i => i.device_type === filterType);
        }
        if (filterCondition !== 'all') {
            res = res.filter(i => i.grade === filterCondition);
        }
        setFilteredItems(res);
    }

    function handlePrint() {
        window.print();
    }

    async function handleAddDevice(e: React.FormEvent) {
        e.preventDefault();
        try {
            // Auto-map Grade to Condition text if empty
            const gradeMap: Record<string, string> = { 'A': 'Excellent', 'B': 'Good', 'C': 'Fair' };
            if (!formData.specs.condition && formData.grade) {
                formData.specs.condition = gradeMap[formData.grade] || '';
            }

            const { error } = await supabase
                .from('inventory_items')
                .insert([formData]);

            if (error) throw error;

            setShowAddModal(false);
            setFormData({
                serial_number: '',
                brand: '',
                model: '',
                device_type: 'laptop',
                grade: 'B',
                repair_needed_description: '',
                status: 'pending_triage',
                specs: { ...emptySpecs }
            });
            fetchInventory();
            alert('Device Registered Successfully!');
        } catch (err: any) {
            alert('Error adding device: ' + err.message);
        }
    }

    const updateSpec = (field: keyof DeviceSpecs, value: string) => {
        setFormData(prev => ({
            ...prev,
            specs: { ...prev.specs, [field]: value }
        }));
    };

    // Stats
    const stats = {
        total: items.length,
        ready: items.filter(i => i.grade === 'A').length,
        repair: items.filter(i => i.grade === 'B').length,
        parts: items.filter(i => i.grade === 'C').length,
    };

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                    <p className="text-gray-500">Track laptops and desktops</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm flex items-center gap-2"
                    >
                        🖨️ Print
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                    >
                        <span>+</span> Register Device
                    </button>
                </div>
            </div>

            {/* Stats Cards (No Print) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Stock</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl shadow-sm border border-green-100">
                    <p className="text-xs text-green-600 uppercase font-semibold">Ready (Grade A)</p>
                    <p className="text-2xl font-bold text-green-900">{stats.ready}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl shadow-sm border border-yellow-100">
                    <p className="text-xs text-yellow-600 uppercase font-semibold">Needs Repair (Grade B)</p>
                    <p className="text-2xl font-bold text-yellow-900">{stats.repair}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl shadow-sm border border-red-100">
                    <p className="text-xs text-red-600 uppercase font-semibold">Parts (Grade C)</p>
                    <p className="text-2xl font-bold text-red-900">{stats.parts}</p>
                </div>
            </div>

            {/* Filters (No Print) */}
            <div className="mb-6 flex flex-wrap gap-4 no-print bg-white p-4 rounded-xl shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Brand</label>
                    <input
                        type="text"
                        placeholder="Search Brand/Model..."
                        className="w-full rounded-md border-gray-300 border p-2 text-sm"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                    />
                </div>
                <div className="w-40">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Device Type</label>
                    <select
                        className="w-full rounded-md border-gray-300 border p-2 text-sm"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="laptop">Laptops</option>
                        <option value="desktop">Desktops</option>
                    </select>
                </div>
                <div className="w-40">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Condition/Grade</label>
                    <select
                        className="w-full rounded-md border-gray-300 border p-2 text-sm"
                        value={filterCondition}
                        onChange={e => setFilterCondition(e.target.value)}
                    >
                        <option value="all">All Grades</option>
                        <option value="A">Grade A (Ready)</option>
                        <option value="B">Grade B (Repair)</option>
                        <option value="C">Grade C (Parts)</option>
                    </select>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Serial #</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Device</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Specs Summary</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Grade / Cond</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Issues</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center">Loading inventory...</td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center">No devices found.</td></tr>
                        ) : filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3 font-mono text-gray-900 align-top">{item.serial_number}</td>
                                <td className="px-4 py-3 align-top">
                                    <div className="font-bold text-gray-900">{item.brand} {item.model}</div>
                                    <div className="text-xs text-gray-500 capitalize">{item.device_type}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    {item.specs ? (
                                        <div className="space-y-1">
                                            <div className="font-medium">{item.specs.processor} / {item.specs.ram} / {item.specs.storage}</div>
                                            <div className="text-xs text-gray-600">{item.specs.graphics} • {item.specs.os}</div>
                                            {item.device_type === 'laptop' && item.specs.display && (
                                                <div className="text-xs text-gray-500">Display: {item.specs.display}</div>
                                            )}
                                        </div>
                                    ) : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${item.grade === 'A' ? 'bg-green-100 text-green-800' :
                                            item.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        Grade {item.grade}
                                    </div>
                                    <div className="text-xs text-gray-500">{item.specs?.condition}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs align-top">
                                    {item.repair_needed_description || <span className="text-green-600 text-xs">No Issues</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Device Modal (No Print) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Register New Device</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="add-form" onSubmit={handleAddDevice} className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Device Type</label>
                                        <select className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                            value={formData.device_type}
                                            onChange={e => setFormData({ ...formData, device_type: e.target.value as any })}
                                        >
                                            <option value="laptop">Laptop</option>
                                            <option value="desktop">Desktop</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                                        <input required type="text" className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                            value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                                        <input required type="text" className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                            value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Model</label>
                                        <input required type="text" className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                            value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                                    </div>
                                </div>

                                <hr />

                                {/* Specifications */}
                                <h3 className="font-semibold text-gray-800">Specifications</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600">Processor (CPU)</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="e.g. i5-1135G7"
                                            value={formData.specs.processor} onChange={e => updateSpec('processor', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600">RAM (GB/Type)</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="e.g. 16GB DDR4"
                                            value={formData.specs.ram} onChange={e => updateSpec('ram', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600">Storage (Type/Size)</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="e.g. 512GB NVMe"
                                            value={formData.specs.storage} onChange={e => updateSpec('storage', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600">Graphics</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="e.g. Iris Xe / RTX 3050"
                                            value={formData.specs.graphics} onChange={e => updateSpec('graphics', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600">OS</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="e.g. Win 10 Pro"
                                            value={formData.specs.os} onChange={e => updateSpec('os', e.target.value)} />
                                    </div>

                                    {/* Laptop Specific */}
                                    {formData.device_type === 'laptop' && (
                                        <>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-600">Display</label>
                                                <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="14 inch FHD"
                                                    value={formData.specs.display} onChange={e => updateSpec('display', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-600">Battery Health</label>
                                                <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="Example: Excellent / 85%"
                                                    value={formData.specs.battery} onChange={e => updateSpec('battery', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-600">Keyboard</label>
                                                <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="Backlit?"
                                                    value={formData.specs.keyboard} onChange={e => updateSpec('keyboard', e.target.value)} />
                                            </div>
                                        </>
                                    )}

                                    {/* Desktop Specific */}
                                    {formData.device_type === 'desktop' && (
                                        <>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-medium text-gray-600">Form Factor</label>
                                                <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="Tower / SFF / Mini"
                                                    value={formData.specs.form_factor} onChange={e => updateSpec('form_factor', e.target.value)} />
                                            </div>
                                        </>
                                    )}

                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-600">Ports / Connectivity</label>
                                        <input type="text" className="mt-1 w-full rounded border border-gray-300 p-1.5 text-sm" placeholder="USB-C, HDMI, Wifi 6..."
                                            value={formData.specs.ports} onChange={e => updateSpec('ports', e.target.value)} />
                                    </div>
                                </div>

                                <hr />

                                {/* Grading & Condition */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Grade & Condition</label>
                                    <div className="mt-2 flex gap-4 mb-3">
                                        {[
                                            { g: 'A', label: 'Grade A (Ready)' },
                                            { g: 'B', label: 'Grade B (Repair)' },
                                            { g: 'C', label: 'Grade C (Parts)' }
                                        ].map((opt) => (
                                            <label key={opt.g} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border hover:bg-gray-100">
                                                <input type="radio" name="grade" value={opt.g}
                                                    checked={formData.grade === opt.g}
                                                    onChange={e => setFormData({ ...formData, grade: e.target.value as any })}
                                                />
                                                <span className="text-sm font-bold">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <label className="block text-xs font-medium text-gray-600">Detailed Condition</label>
                                    <input type="text" className="mt-1 w-full rounded border border-gray-300 p-2 text-sm" placeholder="e.g. Light scratch on lid, Screen perfect"
                                        value={formData.specs.condition} onChange={e => updateSpec('condition', e.target.value)} />
                                </div>

                                {formData.grade === 'B' && (
                                    <div className="bg-red-50 p-4 rounded-md border border-red-100">
                                        <label className="block text-sm font-medium text-red-700">Repair Required (Issues)</label>
                                        <textarea rows={2} className="mt-1 block w-full rounded-md border-red-300 border p-2 focus:ring-red-500"
                                            placeholder="Describe what technically needs to be fixed..."
                                            value={formData.repair_needed_description} onChange={e => setFormData({ ...formData, repair_needed_description: e.target.value })} />
                                    </div>
                                )}

                            </form>
                        </div>

                        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                            <button type="submit" form="add-form" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Register Device</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { font-size: 10pt; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 4px; }
                }
            `}</style>
        </div>
    );
}
