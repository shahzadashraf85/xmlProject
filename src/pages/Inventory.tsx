import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryItem } from '../types';

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        serial_number: '',
        brand: '',
        model: '',
        specifications: '',
        grade: 'B', // Default to B (Need Repair) usually
        repair_needed_description: '',
        status: 'pending_triage'
    });

    useEffect(() => {
        fetchInventory();
    }, []);

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

    async function handleAddDevice(e: React.FormEvent) {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('inventory_items')
                .insert([formData]);

            if (error) throw error;

            setShowAddModal(false);
            setFormData({
                serial_number: '',
                brand: '',
                model: '',
                specifications: '',
                grade: 'B',
                repair_needed_description: '',
                status: 'pending_triage'
            });
            fetchInventory();
            alert('Device Registered Successfully!');
        } catch (err: any) {
            alert('Error adding device: ' + err.message);
        }
    }

    // Stats
    const stats = {
        total: items.length,
        ready: items.filter(i => i.grade === 'A').length,
        repair: items.filter(i => i.grade === 'B').length,
        parts: items.filter(i => i.grade === 'C').length,
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                    <p className="text-gray-500">Track and manage laptop stock</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                >
                    <span>+</span> Register Device
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center">Loading inventory...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center">No devices found. Register one to get started.</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.serial_number}</td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{item.brand} {item.model}</div>
                                    <div className="text-xs text-gray-500">{item.specifications}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.grade === 'A' ? 'bg-green-100 text-green-800' :
                                            item.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        Grade {item.grade}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{item.status.replace('_', ' ')}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.repair_needed_description || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Device Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gray-50">
                            <h2 className="text-xl font-bold">Register New Device</h2>
                        </div>
                        <form onSubmit={handleAddDevice} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                                <input required type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Brand</label>
                                    <input required type="text" placeholder="e.g. Dell" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                        value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Model</label>
                                    <input required type="text" placeholder="e.g. Latitude 5420" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                        value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Grade</label>
                                <div className="mt-2 flex gap-4">
                                    {[
                                        { g: 'A', label: 'Ready (A)' },
                                        { g: 'B', label: 'Repair (B)' },
                                        { g: 'C', label: 'Parts (C)' }
                                    ].map((opt) => (
                                        <label key={opt.g} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="grade" value={opt.g}
                                                checked={formData.grade === opt.g}
                                                onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                            />
                                            <span className="text-sm">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Other Specifications</label>
                                <textarea rows={2} placeholder="CPU, RAM, SSD..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.specifications} onChange={e => setFormData({ ...formData, specifications: e.target.value })} />
                            </div>

                            {formData.grade === 'B' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-red-600">What needs fixing?</label>
                                    <textarea rows={2} required className="mt-1 block w-full rounded-md border-red-300 shadow-sm p-2 border focus:ring-red-500 focus:border-red-500"
                                        value={formData.repair_needed_description} onChange={e => setFormData({ ...formData, repair_needed_description: e.target.value })} />
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Register Device</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
