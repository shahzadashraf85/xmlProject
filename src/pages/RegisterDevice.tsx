import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterDevice() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    // Detected Specs State
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

    useEffect(() => {
        // Auto-Run Detection on Load
        detectSystem();
    }, []);

    function detectSystem() {
        const ua = navigator.userAgent;
        let os = 'Unknown OS';
        if (ua.indexOf('Win') !== -1) os = 'Windows';
        if (ua.indexOf('Mac') !== -1) os = 'macOS';
        if (ua.indexOf('Linux') !== -1) os = 'Linux';
        if (ua.indexOf('Android') !== -1) os = 'Android';
        if (ua.indexOf('like Mac') !== -1) os = 'iOS';

        // Attempt Version Detection for Windows/Mac
        if (os === 'Windows') {
            if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
            if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
        }
        if (os === 'macOS') {
            // simplified check
            const macCheck = /Mac OS X ([\d_]+)/.exec(ua);
            if (macCheck) os = `macOS ${macCheck[1].replace(/_/g, '.')}`;
        }

        // WebGL Renderer (GPU)
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

        setSpecs({
            os: os,
            cpu_cores: navigator.hardwareConcurrency || 0,
            ram_gb: (navigator as any).deviceMemory || 0, // Chrome Only
            gpu: gpu,
            resolution: `${window.screen.width}x${window.screen.height}`,
            browser: getBrowserName(ua)
        });
        setScanned(true);
    }

    function getBrowserName(ua: string) {
        if (ua.indexOf('Chrome') > -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        return 'Unknown';
    }

    async function handleRegister() {
        if (!formData.serial_number || !formData.model) {
            alert('Please enter Serial Number and Model');
            return;
        }

        setLoading(true);
        try {
            // Construct full specs object merging auto-detected + manual
            const fullSpecs = {
                ...specs,
                processor: `${specs.cpu_cores} Cores (Auto-Detected)`,
                ram: specs.ram_gb ? `${specs.ram_gb} GB` : 'Unknown',
                storage: 'Check Manually', // Browser cannot see HDD size
                condition: formData.notes
            };

            const { error } = await supabase
                .from('inventory_items')
                .insert({
                    brand: formData.brand || 'Unknown',
                    model: formData.model,
                    serial_number: formData.serial_number,
                    grade: formData.grade,
                    device_type: 'LAPTOP', // Default to Laptop for now
                    specs: fullSpecs,
                    status: 'pending_triage',
                    location: 'Receiving'
                });

            if (error) throw error;
            alert('Device Registered Successfully!');
            // Reset form but keep specs
            setFormData({ ...formData, serial_number: '', notes: '' });
        } catch (err: any) {
            alert('Error registering device: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Register New Device</h1>
            <p className="text-gray-500 mb-8">Auto-detecting hardware of the CURRENT device.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Auto-Detected Specs */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-blue-900">🔍 Detected Hardware</h2>
                        <button onClick={detectSystem} className="text-xs text-blue-600 underline">Re-Scan</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-blue-500 uppercase">Operating System</label>
                            <p className="font-mono text-lg">{specs.os}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-blue-500 uppercase">CPU Cores</label>
                                <p className="font-mono text-lg">{specs.cpu_cores || '?'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-blue-500 uppercase">RAM (Approx)</label>
                                <p className="font-mono text-lg">{specs.ram_gb ? `~${specs.ram_gb} GB` : 'Unknown'}</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-500 uppercase">GPU / Graphics</label>
                            <p className="font-mono text-sm break-words bg-white p-2 rounded border border-blue-100">
                                {specs.gpu}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-500 uppercase">Screen Resolution</label>
                            <p className="font-mono text-lg">{specs.resolution}</p>
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
                            <p className="text-xs text-yellow-800">
                                <strong>Note:</strong> Browsers restrict access to exact CPU Model (e.g. i7-1165G7) and Storage Size for security. You must enter these manually.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Manual Entry Form */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Device Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            >
                                <option value="">Select Brand...</option>
                                <option value="Dell">Dell</option>
                                <option value="HP">HP</option>
                                <option value="Lenovo">Lenovo</option>
                                <option value="Apple">Apple</option>
                                <option value="Microsoft">Microsoft</option>
                                <option value="Asus">Asus</option>
                                <option value="Acer">Acer</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name/Number</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg"
                                placeholder="e.g. Latitude 5420"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg font-mono"
                                placeholder="Scan Barcode..."
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Grade</label>
                            <div className="flex gap-2">
                                {(['A', 'B', 'C'] as const).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, grade: g })}
                                        className={`flex-1 py-2 rounded border ${formData.grade === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                className="w-full p-2 border rounded-lg"
                                rows={3}
                                placeholder="Scratches, dents, missing keys..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Registering...' : 'Register Device'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
