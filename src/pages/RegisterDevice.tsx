import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { parseSystemSpecsWithAI } from '../utils/aiSpecParser';

export default function RegisterDevice() {
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteContent, setPasteContent] = useState('');

    // Detected Specs State (Basic Browser Detection)
    const [specs, setSpecs] = useState({
        os: '',
        cpu_cores: 0,
        ram_gb: 0,
        gpu: '',
        resolution: '',
        browser: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        serial_number: '',
        grade: 'B',
        notes: ''
    });

    // Advanced Specs from AI
    const [aiSpecs, setAiSpecs] = useState<any>(null);

    useEffect(() => {
        detectSystem();
    }, []);

    function detectSystem() {
        const ua = navigator.userAgent;
        let os = 'Unknown OS';
        if (ua.indexOf('Win') !== -1) os = 'Windows';
        if (ua.indexOf('Mac') !== -1) os = 'macOS';

        // ... (Basic detection logic preserved if needed for fallback) ...

        let gpu = 'Unknown GPU';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            }
        } catch (e) { console.warn(e); }

        setSpecs(prev => ({
            ...prev,
            os: os,
            cpu_cores: navigator.hardwareConcurrency || 0,
            gpu: gpu,
            resolution: `${window.screen.width}x${window.screen.height}`
        }));
    }

    async function handleAiParse() {
        if (!pasteContent.trim()) return;
        setParsing(true);
        try {
            const result = await parseSystemSpecsWithAI(pasteContent);
            if (result) {
                setAiSpecs(result);
                setFormData(prev => ({
                    ...prev,
                    brand: result.brand || prev.brand,
                    model: result.model || prev.model,
                    serial_number: result.serial_number || prev.serial_number,
                }));
                setPasteMode(false); // Close modal/section
                alert(`Successfully extracted: ${result.model} (${result.processor})`);
            } else {
                alert('AI could not extract data. Please fill manually.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to parse data.');
        } finally {
            setParsing(false);
        }
    }

    async function handleRegister() {
        if (!formData.serial_number || !formData.model) {
            alert('Please enter Serial Number and Model');
            return;
        }

        setLoading(true);
        try {
            // MERGE SPECS: AI Specs > Browser Specs
            const fullSpecs = {
                processor: aiSpecs?.processor || `${specs.cpu_cores} Cores (Browser Detected)`,
                ram: aiSpecs?.ram || 'Unknown',
                storage: aiSpecs?.storage || 'Unknown',
                gpu: specs.gpu,
                os: aiSpecs?.os || specs.os,
                resolution: specs.resolution,
                condition: formData.notes
            };

            const { error } = await supabase
                .from('inventory_items')
                .insert({
                    brand: formData.brand || 'Unknown',
                    model: formData.model,
                    serial_number: formData.serial_number,
                    grade: formData.grade,
                    device_type: 'LAPTOP',
                    specs: fullSpecs,
                    status: 'pending_triage',
                    location: 'Receiving'
                });

            if (error) throw error;
            alert('Device Registered Successfully!');
            setFormData({ ...formData, serial_number: '', notes: '' });
            setAiSpecs(null);
        } catch (err: any) {
            alert('Error registering device: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    const copyCommand = (type: 'win' | 'mac') => {
        const cmd = type === 'win'
            ? 'Get-ComputerInfo -Property CsManufacturer,CsModel,WindowsProductName,OsTotalVisibleMemorySize,CsProcessors,BiosSeralNumber | Format-List'
            : 'system_profiler SPHardwareDataType SPStorageDataType';
        navigator.clipboard.writeText(cmd);
        alert('Command copied! Paste it in your Terminal/PowerShell.');
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Register New Device</h1>
            <p className="text-gray-500 mb-6">Auto-detecting hardware via Browser + Deep Scan for exacting details.</p>

            {/* DEEP SCAN TOGGLE */}
            {!pasteMode ? (
                <div onClick={() => setPasteMode(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition mb-8 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold">🚀 Unlock Full Specs (Deep Scan)</h3>
                        <p className="text-blue-100 text-sm mt-1">
                            Browser stuck? Click here to auto-fill Exact CPU, RAM & Storage using a simple command.
                        </p>
                    </div>
                    <span className="text-3xl">👉</span>
                </div>
            ) : (
                <div className="bg-white border border-blue-200 rounded-xl p-6 mb-8 shadow-md">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-800">1. Run Command & Paste Output</h3>
                        <button onClick={() => setPasteMode(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <button onClick={() => copyCommand('win')} className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-blue-800 font-medium transition">
                            <span>🪟</span> Copy Windows Command
                        </button>
                        <button onClick={() => copyCommand('mac')} className="flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 text-gray-800 font-medium transition">
                            <span>🍎</span> Copy macOS Command
                        </button>
                    </div>

                    <textarea
                        className="w-full p-3 border rounded-lg bg-gray-50 font-mono text-xs h-32 mb-4"
                        placeholder="Paste the output from Terminal/PowerShell here..."
                        value={pasteContent}
                        onChange={e => setPasteContent(e.target.value)}
                    ></textarea>

                    <button
                        onClick={handleAiParse}
                        disabled={parsing || !pasteContent}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {parsing ? (
                            <>Processing <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div></>
                        ) : '✨ Magic Auto-Fill'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Detected Specs */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">💻 System Specs</h2>

                    <div className="space-y-4">
                        <div className="bg-white p-3 rounded border">
                            <label className="text-xs font-bold text-gray-400 uppercase">Processor</label>
                            <p className="font-mono text-lg font-medium text-gray-900">
                                {aiSpecs?.processor || (
                                    <span className="text-gray-500 italic">{specs.cpu_cores} Cores (Generic)</span>
                                )}
                            </p>
                            {aiSpecs?.processor && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Verified via AI</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border">
                                <label className="text-xs font-bold text-gray-400 uppercase">RAM</label>
                                <p className="font-mono text-lg font-medium">
                                    {aiSpecs?.ram || 'Unknown'}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded border">
                                <label className="text-xs font-bold text-gray-400 uppercase">Storage</label>
                                <p className="font-mono text-lg font-medium">
                                    {aiSpecs?.storage || 'Unknown'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded border">
                            <label className="text-xs font-bold text-gray-400 uppercase">Serial Number</label>
                            <p className="font-mono text-lg text-blue-600">
                                {aiSpecs?.serial_number || formData.serial_number || 'Waiting for input...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Final Details */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Registration</h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Brand</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    placeholder="e.g. Dell"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Model</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="e.g. XPS 13"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Serial Number (Manual Override)</label>
                            <input
                                className="w-full p-2 border rounded font-mono"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                            <div className="flex gap-2">
                                {(['A', 'B', 'C'] as const).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, grade: g })}
                                        className={`flex-1 py-1 rounded border text-sm ${formData.grade === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                className="w-full p-2 border rounded" rows={2}
                                value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Saving...' : 'Confirm Registration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
