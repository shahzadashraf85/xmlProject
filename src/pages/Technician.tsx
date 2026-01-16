import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryItem, RepairSession, DeviceSpecs } from '../types';

export default function Technician() {
    const { user } = useAuth();
    const [serialSearch, setSerialSearch] = useState('');
    const [device, setDevice] = useState<InventoryItem | null>(null);
    const [activeSession, setActiveSession] = useState<RepairSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!serialSearch.trim()) return;

        setLoading(true);
        setDevice(null);
        setActiveSession(null);

        try {
            // 1. Find Device
            const { data: dev, error: devError } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('serial_number', serialSearch.trim())
                .single();

            if (devError) throw new Error('Device not found');
            setDevice(dev);

            // 2. Check for ACTIVE session
            const { data: session, error: sessError } = await supabase
                .from('repair_sessions')
                .select('*')
                .eq('inventory_id', dev.id)
                .is('ended_at', null)
                .maybeSingle();

            if (!sessError && session) {
                setActiveSession(session);
            }

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function startWork() {
        if (!device || !user) return;
        try {
            const { data, error } = await supabase
                .from('repair_sessions')
                .insert({
                    inventory_id: device.id,
                    technician_id: user.id,
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            setActiveSession(data);

            // Update Status
            await updateDeviceStatus('in_repair');
        } catch (err: any) {
            alert('Failed to start work: ' + err.message);
        }
    }

    async function stopWork() {
        if (!activeSession || !device) return;
        try {
            const { error } = await supabase
                .from('repair_sessions')
                .update({
                    ended_at: new Date().toISOString(),
                    work_notes: notes
                })
                .eq('id', activeSession.id);

            if (error) throw error;

            setActiveSession(null);
            setNotes('');
            alert('Session recorded successfully!');

            // Ask if ready?
            if (device.grade === 'A') {
                await updateDeviceStatus('ready_to_ship');
            } else if (device.grade === 'C') {
                await updateDeviceStatus('scrapped');
            } else {
                await updateDeviceStatus('pending_triage');
            }

        } catch (err: any) {
            alert('Failed to stop work: ' + err.message);
        }
    }

    async function updateDeviceStatus(status: InventoryItem['status']) {
        if (!device) return;
        await supabase.from('inventory_items').update({ status }).eq('id', device.id);
        setDevice(prev => prev ? ({ ...prev, status }) : null);
    }

    async function saveSpecs() {
        if (!device) return;
        try {
            const { error } = await supabase
                .from('inventory_items')
                .update({
                    grade: device.grade,
                    specs: device.specs
                })
                .eq('id', device.id);

            if (error) throw error;
            alert('Specs & Grade updated successfully!');
        } catch (err: any) {
            alert('Error updating specs: ' + err.message);
        }
    }

    const updateSpecField = (field: keyof DeviceSpecs, value: string) => {
        if (!device) return;
        setDevice({
            ...device,
            specs: { ...device.specs, [field]: value }
        });
    };

    const updateGrade = (grade: 'A' | 'B' | 'C') => {
        if (!device) return;
        setDevice({ ...device, grade });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Technician Workstation</h1>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
                <label className="block text-sm font-medium text-gray-700 mb-2">Scan or Enter Serial Number</label>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Scan Serial..."
                        className="flex-1 rounded-lg border-gray-300 border p-3 text-lg font-mono focus:ring-blue-500 focus:border-blue-500"
                        value={serialSearch}
                        onChange={e => setSerialSearch(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Lookup'}
                    </button>
                </div>
            </form>

            {/* Device Details */}
            {device && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                    <div className="p-6 bg-gray-50 border-b flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${device.grade === 'A' ? 'bg-green-100 text-green-800' :
                                        device.grade === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    Grade {device.grade}
                                </span>
                                <span className="text-xs uppercase font-bold text-gray-500 tracking-wider border px-2 py-1 rounded bg-white">
                                    {device.device_type}
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">{device.brand} {device.model}</h2>
                            <p className="text-gray-500 font-mono mt-1">SN: {device.serial_number}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Current Status</div>
                            <div className="font-bold text-lg capitalize text-blue-600">{device.status.replace('_', ' ')}</div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Interactive Specs Section */}
                        <div className={`p-4 rounded-xl border ${activeSession ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-800">
                                    {activeSession ? '📝 Edit Specifications' : '🔒 Device Specs'}
                                </h3>
                                {activeSession && (
                                    <button onClick={saveSpecs} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                                        Save Changes
                                    </button>
                                )}
                            </div>

                            {activeSession ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Grade</label>
                                        <div className="flex gap-2 mt-1">
                                            {(['A', 'B', 'C'] as const).map(g => (
                                                <button key={g} onClick={() => updateGrade(g)}
                                                    className={`px-3 py-1 text-sm rounded border ${device.grade === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">CPU</label>
                                        <input className="block w-full text-sm p-1 rounded border border-blue-200"
                                            value={device.specs?.processor || ''} onChange={e => updateSpecField('processor', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">RAM</label>
                                            <input className="block w-full text-sm p-1 rounded border border-blue-200"
                                                value={device.specs?.ram || ''} onChange={e => updateSpecField('ram', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Storage</label>
                                            <input className="block w-full text-sm p-1 rounded border border-blue-200"
                                                value={device.specs?.storage || ''} onChange={e => updateSpecField('storage', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Condition Notes</label>
                                        <input className="block w-full text-sm p-1 rounded border border-blue-200"
                                            value={device.specs?.condition || ''} onChange={e => updateSpecField('condition', e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm text-gray-700">
                                    {device.specs ? (
                                        <>
                                            <p><strong>CPU:</strong> {device.specs.processor}</p>
                                            <p><strong>RAM:</strong> {device.specs.ram}</p>
                                            <p><strong>Storage:</strong> {device.specs.storage}</p>
                                            <p><strong>Condition:</strong> {device.specs.condition}</p>
                                            <p className="text-xs text-gray-500 mt-2">Start work to edit details.</p>
                                        </>
                                    ) : <p className="text-gray-400 italic">No specs found.</p>}
                                </div>
                            )}
                        </div>

                        {/* Issues Section */}
                        <div>
                            <h3 className="font-semibold text-red-700 mb-2">Reported Issues</h3>
                            <p className="p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100">
                                {device.repair_needed_description || 'No reported issues.'}
                            </p>
                        </div>
                    </div>

                    {/* Timer Interaction */}
                    <div className="p-6 bg-gray-50 border-t flex flex-col items-center justify-center">
                        {!activeSession ? (
                            <button
                                onClick={startWork}
                                className="w-full max-w-md py-4 bg-green-600 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-green-700 transform transition active:scale-95 flex items-center justify-center gap-3"
                            >
                                <span>⏱️</span> Start Repair Work
                            </button>
                        ) : (
                            <div className="w-full max-w-md">
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center mb-4 animate-pulse">
                                    <p className="text-yellow-800 font-bold text-lg">Work in Progress...</p>
                                    <p className="text-xs text-yellow-600">Started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
                                </div>

                                <textarea
                                    className="w-full p-3 border rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Enter final work notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                ></textarea>

                                <button
                                    onClick={stopWork}
                                    className="w-full py-4 bg-red-600 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-red-700 transform transition active:scale-95"
                                >
                                    ⏹️ Stop / Finish Work
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
