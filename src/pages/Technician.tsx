import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryItem, RepairSession } from '../types';

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

            // 2. Check for ACTIVE session (started but not ended) for this device? 
            // Or for this technician? Assuming one tech works on one task.
            // Let's check session for THIS device specifically.
            const { data: session, error: sessError } = await supabase
                .from('repair_sessions')
                .select('*')
                .eq('inventory_id', dev.id)
                .is('ended_at', null) // Still open
                .maybeSingle(); // might be null

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
            // Create Session
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

            // Update Device Status
            await supabase
                .from('inventory_items')
                .update({ status: 'in_repair' })
                .eq('id', device.id);

            setDevice({ ...device, status: 'in_repair' });

        } catch (err: any) {
            alert('Failed to start work: ' + err.message);
        }
    }

    async function stopWork() {
        if (!activeSession || !device) return;
        try {
            // End Session
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

            // Refetch to see updated state?
            // Maybe ask if status changed?
        } catch (err: any) {
            alert('Failed to stop work: ' + err.message);
        }
    }

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
                        {loading ? 'Searching...' : 'Lookup Device'}
                    </button>
                </div>
            </form>

            {/* Device Details */}
            {device && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                    <div className="p-6 bg-gray-50 border-b flex justify-between items-start">
                        <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${device.grade === 'A' ? 'bg-green-100 text-green-800' :
                                    device.grade === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                Grade {device.grade}
                            </span>
                            <h2 className="text-3xl font-bold text-gray-900">{device.brand} {device.model}</h2>
                            <p className="text-gray-500 font-mono mt-1">SN: {device.serial_number}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Current Status</div>
                            <div className="font-bold text-lg capitalize text-blue-600">{device.status.replace('_', ' ')}</div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Device Specs</h3>
                            <p className="p-3 bg-gray-50 rounded-lg text-sm">{device.specifications || 'No specs listed.'}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-700 mb-2">Issues to Fix</h3>
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
                            <div className="w-full max-w-md animate-pulse">
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center mb-4">
                                    <p className="text-yellow-800 font-bold text-lg">Work in Progress...</p>
                                    <p className="text-xs text-yellow-600">Started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
                                </div>

                                <textarea
                                    className="w-full p-3 border rounded-lg mb-4 text-sm"
                                    rows={3}
                                    placeholder="Enter work notes before finishing..."
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
