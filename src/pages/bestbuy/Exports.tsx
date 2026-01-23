import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { SimpleSelect } from '../../components/ui/simple-select';
import type { BestBuyExport, BestBuyTemplate } from '../../types/bestbuy';
import { generateBestBuyExport } from '../../lib/bestbuy-export';
import { toast } from 'sonner';
import { Download, Loader2, Plus } from 'lucide-react';

export default function BestBuyExports() {
    const [exports, setExports] = useState<BestBuyExport[]>([]);
    const [templates, setTemplates] = useState<BestBuyTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: expData } = await supabase.from('bb_exports').select('*').order('created_at', { ascending: false });
        const { data: tempData } = await supabase.from('bb_templates').select('*');
        if (expData) setExports(expData as BestBuyExport[]);
        if (tempData) setTemplates(tempData as BestBuyTemplate[]);
        setLoading(false);
    };

    const handleCreateExport = async () => {
        if (!selectedTemplateId) {
            toast.error('Select a template first');
            return;
        }
        setGenerating(true);
        try {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (!template) throw new Error('Template not found');

            // 1. Fetch Listings & Fields
            // Ideally we filter by status='approved'
            const { data: listings, error: listError } = await supabase
                .from('bb_listings')
                .select('*, fields:bb_listing_fields(field_code, field_value)')
                .eq('template_id', template.id)
                .eq('status', 'approved');

            if (listError) throw listError;
            if (!listings || listings.length === 0) {
                toast.warning('No approved listings found for this template');
                setGenerating(false);
                return;
            }

            // 2. Prepare Data for Export Engine
            // Transform { fields: [{field_code, field_value}] } -> { [code]: value }
            const processedListings = listings.map((l: any) => {
                const map: Record<string, string> = {};
                l.fields.forEach((f: any) => {
                    map[f.field_code] = f.field_value;
                });
                return { ...l, fields_map: map };
            });

            // 3. Generate Blob
            const blob = await generateBestBuyExport(template, processedListings);

            // 4. Upload to Storage
            const filename = `exports/${Date.now()}_${template.template_name}_${listings.length}.xlsx`;
            const { error: uploadError } = await supabase.storage
                .from('bestbuy_exports')
                .upload(filename, blob);

            if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

            // 5. Record in DB
            const { data: user } = await supabase.auth.getUser();
            const { error: dbError } = await supabase
                .from('bb_exports')
                .insert({
                    template_id: template.id,
                    export_type: 'xlsx',
                    file_path: filename,
                    row_count: listings.length,
                    created_by: user.user?.id
                });

            if (dbError) throw dbError;

            toast.success('Export generated successfully!');
            fetchData();

        } catch (error: any) {
            console.error(error);
            toast.error('Export failed: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (filePath: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('bestbuy_exports')
                .createSignedUrl(filePath, 60);

            if (error || !data) throw new Error('Failed to get download URL');

            window.open(data.signedUrl, '_blank');
        } catch (error: any) {
            toast.error('Download failed: ' + error.message);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Best Buy Exports</h1>
                    <p className="text-gray-500">Generate and download bulk inventory files.</p>
                </div>
            </div>

            {/* Generator Card */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardHeader>
                    <CardTitle>Generate New Export</CardTitle>
                    <CardDescription>Select a template to export all APPROVED listings.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Template Source</label>
                        <SimpleSelect
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            placeholder="Select Template..."
                            className="bg-white"
                            options={templates.map(t => ({ label: `${t.template_name} (${t.category_code})`, value: t.id }))}
                        />
                    </div>
                    <Button
                        onClick={handleCreateExport}
                        disabled={generating || !selectedTemplateId}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Generate File
                    </Button>
                </CardContent>
            </Card>

            {/* Exports History */}
            <Card>
                <CardHeader>
                    <CardTitle>Export History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Rows</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : exports.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No exports found.</TableCell></TableRow>
                            ) : (
                                exports.map(exp => {
                                    const tmpl = templates.find(t => t.id === exp.template_id);
                                    return (
                                        <TableRow key={exp.id}>
                                            <TableCell>{new Date(exp.created_at).toLocaleString()}</TableCell>
                                            <TableCell>{tmpl?.template_name || 'Unknown'}</TableCell>
                                            <TableCell>{exp.row_count} items</TableCell>
                                            <TableCell className="uppercase text-xs font-bold text-gray-500">{exp.export_type}</TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm" onClick={() => handleDownload(exp.file_path)}>
                                                    <Download className="mr-2 h-3 w-3" />
                                                    Download
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
