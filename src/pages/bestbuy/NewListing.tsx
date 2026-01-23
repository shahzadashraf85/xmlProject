import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { SimpleSelect } from '../../components/ui/simple-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { extractBestBuyData } from '../../lib/bestbuy-ai';
import type { BestBuyTemplate } from '../../types/bestbuy';
import { toast } from 'sonner';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function BestBuyNewListing() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<BestBuyTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Inventory State
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

    // Form State
    const [productName, setProductName] = useState('');
    const [specsText, setSpecsText] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [upc, setUpc] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');

    useEffect(() => {
        const loadTemplates = async () => {
            const { data } = await supabase.from('bb_templates').select('*');
            if (data) setTemplates(data);
        };
        loadTemplates();

        const loadInventory = async () => {
            const { data } = await supabase
                .from('inventory_items')
                .select('*')
                .in('status', ['ready_to_ship', 'shipped'])
                .order('created_at', { ascending: false })
                .limit(100);
            if (data) setInventoryItems(data);
        };
        loadInventory();
    }, []);

    const handleInventorySelect = (id: string) => {
        setSelectedInventoryId(id);
        const item = inventoryItems.find(i => i.id === id);
        if (item) {
            setProductName(`${item.brand} ${item.model}`);
            setBrand(item.brand);
            setModel(item.model);

            const specLines = item.specs ? Object.entries(item.specs)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n') : '';

            setSpecsText(
                `Device Type: ${item.device_type}\n` +
                `Grade: ${item.grade}\n` +
                `Serial: ${item.serial_number}\n\n` +
                `Specs:\n${specLines}`
            );
            toast.success('Fields auto-filled from Inventory!');
        }
    };


    const handleRunAI = async () => {
        if (!selectedTemplateId || !productName) {
            toast.error('Please select a template and enter product name');
            return;
        }

        setLoading(true);
        try {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (!template) throw new Error('Template not found');

            // 1. Create Draft Listing
            const { data: user } = await supabase.auth.getUser();
            const { data: listing, error: createError } = await supabase
                .from('bb_listings')
                .insert({
                    template_id: template.id,
                    product_name: productName,
                    specs_text: specsText,
                    known: { brand, model, upc },
                    status: 'draft',
                    created_by: user.user?.id
                })
                .select()
                .single();

            if (createError) throw createError;

            // 2. Call Gemini
            toast.info('Gemini Version 2.5 (High Reasoning) Analyzing specs...');
            const aiData = await extractBestBuyData({
                template_columns: template.columns_json,
                product_name: productName,
                specs_text: specsText,
                known_fields: { brand, model, upc }
            });

            // 3. Save Fields to DB
            const fieldInserts = template.columns_json.map(col => ({
                listing_id: listing.id,
                field_code: col.code,
                field_value: aiData[col.code] !== undefined && aiData[col.code] !== null
                    ? String(aiData[col.code])
                    : null
            }));

            const { error: fieldsError } = await supabase
                .from('bb_listing_fields')
                .insert(fieldInserts);

            if (fieldsError) throw fieldsError;

            await supabase
                .from('bb_listings')
                .update({ ai_output: aiData })
                .eq('id', listing.id);

            toast.success('AI Extraction Complete!');
            navigate(`/bestbuy/listings/${listing.id}`);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'AI Auto-fill failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">New Best Buy Listing</h1>
                <p className="text-gray-500">AI-Powered Data Entry (Gemini 2.5)</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Select Template</CardTitle>
                </CardHeader>
                <CardContent>
                    <SimpleSelect
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        placeholder="Choose a template..."
                        options={templates.map(t => ({ label: `${t.template_name} (${t.category_code})`, value: t.id }))}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Product Data</CardTitle>
                    <CardDescription>Provide raw data for Gemini to analyze.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Tabs defaultValue="manual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                            <TabsTrigger value="inventory">Select from Inventory</TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual">
                            <div className="bg-blue-50/50 p-4 rounded-md mb-6 text-sm text-blue-700">
                                Enter product details manually below.
                            </div>
                        </TabsContent>

                        <TabsContent value="inventory">
                            <div className="space-y-4 mb-8 p-4 border rounded-md bg-gray-50">
                                <div className="space-y-2">
                                    <Label>Search Inventory</Label>
                                    <Input
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        placeholder="Search by brand, model, or serial number..."
                                        className="bg-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Choose Inventory Item (Ready to Ship / Shipped Only)</Label>
                                    <SimpleSelect
                                        value={selectedInventoryId}
                                        onChange={(e) => handleInventorySelect(e.target.value)}
                                        placeholder="Select a device..."
                                        options={inventoryItems
                                            .filter(i => {
                                                const searchLower = inventorySearch.toLowerCase();
                                                return (
                                                    i.brand.toLowerCase().includes(searchLower) ||
                                                    i.model.toLowerCase().includes(searchLower) ||
                                                    i.serial_number.toLowerCase().includes(searchLower)
                                                );
                                            })
                                            .map(i => ({
                                                label: `${i.brand} ${i.model} - SN: ${i.serial_number} (Grade ${i.grade}) - ${i.status}`,
                                                value: i.id
                                            }))}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    Selecting an item will auto-fill the fields below with stored data.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="space-y-2">
                        <Label>Product Name *</Label>
                        <Input
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            placeholder="e.g. HP EliteBook 840 G5 14 inch Laptop"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Brand (Optional)</Label>
                            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="HP" />
                        </div>
                        <div className="space-y-2">
                            <Label>Model (Optional)</Label>
                            <Input value={model} onChange={e => setModel(e.target.value)} placeholder="840 G5" />
                        </div>
                        <div className="space-y-2">
                            <Label>UPC (Optional)</Label>
                            <Input value={upc} onChange={e => setUpc(e.target.value)} placeholder="123456789012" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Raw Specs / Description *</Label>
                        <Textarea
                            rows={8}
                            value={specsText}
                            onChange={e => setSpecsText(e.target.value)}
                            placeholder="Paste full specs, features, and description here..."
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    size="lg"
                    onClick={handleRunAI}
                    disabled={loading || !selectedTemplateId || !productName}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing with AI...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Run AI Auto-fill
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
