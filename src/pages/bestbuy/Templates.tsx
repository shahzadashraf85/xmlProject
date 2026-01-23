import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
// import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { parseBestBuyTemplate } from '../../lib/bestbuy-template-parser';
import type { BestBuyTemplate } from '../../types/bestbuy';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet } from 'lucide-react';

export default function BestBuyTemplates() {
    const [templates, setTemplates] = useState<BestBuyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('bb_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to load templates');
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // 1. Parse File
            const { template_name, columns } = await parseBestBuyTemplate(file);
            const category_code = 'Computers/Laptops'; // auto-detect or prompt user in real app

            // 2. Upload Raw File to Storage
            const filePath = `templates/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('bestbuy_templates')
                .upload(filePath, file);

            if (uploadError) throw new Error('Storage upload failed: ' + uploadError.message);

            // 3. Save Metadata to DB
            const { error: dbError } = await supabase
                .from('bb_templates')
                .insert({
                    template_name,
                    category_code,
                    column_count: columns.length,
                    columns_json: columns,
                    raw_template_file_path: filePath
                });

            if (dbError) throw new Error('Database insert failed: ' + dbError.message);

            toast.success('Template uploaded successfully!');
            fetchTemplates();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to upload template');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Best Buy Templates</h1>
                    <p className="text-muted-foreground">Manage Excel templates for product data.</p>
                </div>
                <div>
                    <input
                        type="file"
                        id="template-upload"
                        className="hidden"
                        accept=".xlsx"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <label htmlFor="template-upload">
                        <Button disabled={uploading} className="cursor-pointer" asChild>
                            <span>
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Template
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Templates</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Columns</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : templates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No templates found. Upload one to start.</TableCell>
                                </TableRow>
                            ) : (
                                templates.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                            {t.template_name}
                                        </TableCell>
                                        <TableCell>{t.category_code}</TableCell>
                                        <TableCell>{t.column_count}</TableCell>
                                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">View</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
