import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { BestBuyListing, BestBuyTemplate, BestBuyColumn } from '../../types/bestbuy';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { SimpleSelect } from '../../components/ui/simple-select';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Save, Sparkles, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function BestBuyEditListing() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [listing, setListing] = useState<BestBuyListing | null>(null);
    const [template, setTemplate] = useState<BestBuyTemplate | null>(null);
    const [fields, setFields] = useState<Record<string, string>>({}); // valid field_code -> value
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        // Fetch Listing
        const { data: listData, error: listError } = await supabase
            .from('bb_listings')
            .select('*')
            .eq('id', id)
            .single();

        if (listError || !listData) {
            toast.error('Listing not found');
            return;
        }
        setListing(listData as BestBuyListing);

        // Fetch Template
        const { data: tempData } = await supabase
            .from('bb_templates')
            .select('*')
            .eq('id', listData.template_id)
            .single();
        setTemplate(tempData as BestBuyTemplate);

        // Fetch Fields
        const { data: fieldData } = await supabase
            .from('bb_listing_fields')
            .select('*')
            .eq('listing_id', id);

        // Map to state object
        const fieldMap: Record<string, string> = {};
        if (fieldData) {
            fieldData.forEach((f: any) => {
                fieldMap[f.field_code] = f.field_value || '';
            });
        }
        setFields(fieldMap);
        setLoading(false);
    };

    const handleFieldChange = (code: string, value: string) => {
        setFields(prev => ({ ...prev, [code]: value }));
    };

    const saveChanges = async () => {
        if (!listing || !id) return;
        setSaving(true);
        try {
            // Upsert fields
            const updates = Object.entries(fields).map(([code, val]) => ({
                listing_id: id,
                field_code: code,
                field_value: val
            }));

            const { error } = await supabase
                .from('bb_listing_fields')
                .upsert(updates, { onConflict: 'listing_id,field_code' });

            if (error) throw error;

            // Check required fields
            const missing = template?.columns_json.filter(c => c.required && (!fields[c.code] || fields[c.code].toString().trim() === ''));
            if (missing && missing.length === 0) {
                await supabase.from('bb_listings').update({ status: 'approved' }).eq('id', id);
                toast.success('Listing saved and approved! All required fields present.');
            } else {
                // Block approval if required fields are missing
                if (missing && missing.length > 0) {
                    toast.error(`Cannot approve: ${missing.length} required field(s) missing: ${missing.map(m => m.label).join(', ')}`);
                } else {
                    toast.success('Draft saved.');
                }
            }

        } catch (error: any) {
            toast.error('Save failed: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReRunAI = async () => {
        if (!listing || !template || !id) return;

        const confirmed = window.confirm('This will regenerate all fields using AI. Current data will be overwritten. Continue?');
        if (!confirmed) return;

        setSaving(true);
        try {
            toast.info('Re-running AI extraction...');

            // Import the AI function
            const { extractBestBuyData } = await import('../../lib/bestbuy-ai');

            // Re-run AI with current listing data
            const aiData = await extractBestBuyData({
                template_columns: template.columns_json,
                product_name: listing.product_name,
                specs_text: listing.specs_text || '',
                known_fields: listing.known || {}
            });

            // Update fields state
            const newFields: Record<string, string> = {};
            template.columns_json.forEach(col => {
                if (aiData[col.code] !== undefined && aiData[col.code] !== null) {
                    newFields[col.code] = String(aiData[col.code]);
                }
            });
            setFields(newFields);

            // Save to database
            const updates = Object.entries(newFields).map(([code, val]) => ({
                listing_id: id,
                field_code: code,
                field_value: val
            }));

            await supabase
                .from('bb_listing_fields')
                .upsert(updates, { onConflict: 'listing_id,field_code' });

            await supabase
                .from('bb_listings')
                .update({ ai_output: aiData })
                .eq('id', id);

            toast.success('AI re-extraction complete!');
        } catch (error: any) {
            console.error(error);
            toast.error('AI re-run failed: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Grouping Logic - Sort required fields first
    const groupedColumns = template?.columns_json.reduce((acc, col) => {
        const group = col.group || 'General';
        if (!acc[group]) acc[group] = [];
        acc[group].push(col);
        return acc;
    }, {} as Record<string, BestBuyColumn[]>) || {};

    // Sort each group: required fields first
    Object.keys(groupedColumns).forEach(group => {
        groupedColumns[group].sort((a, b) => {
            if (a.required && !b.required) return -1;
            if (!a.required && b.required) return 1;
            return 0;
        });
    });

    const groups = Object.keys(groupedColumns);

    if (loading) return <div className="p-8 text-center">Loading Listing...</div>;
    if (!listing || !template) return <div className="p-8 text-center text-red-500">Error loading data</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/bestbuy/listings')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold truncate max-w-xl">{listing.product_name}</h1>
                        <p className="text-xs text-gray-500">Template: {template.template_name} | ID: {listing.id.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleReRunAI} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                        Re-Run AI
                    </Button>
                    <Button onClick={saveChanges} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        Save & Verify
                    </Button>
                </div>
            </div>

            {/* Main Form */}
            <div className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue={groups[0]} className="w-full">
                    <TabsList className="mb-6 flex-wrap h-auto justify-start bg-white p-2 border rounded-lg shadow-sm">
                        {groups.map(g => {
                            // Check completion status for this group
                            const cols = groupedColumns[g] || [];
                            const isComplete = cols.every(c => !c.required || (fields[c.code] && fields[c.code].toString().trim() !== ''));

                            return (
                                <TabsTrigger key={g} value={g} className="px-4 py-2 flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                                    {g}
                                    {isComplete && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {groups.map(group => (
                        <TabsContent key={group} value={group} className="space-y-6">
                            <div className="max-w-4xl mx-auto space-y-0 bg-white rounded-lg shadow-sm border border-gray-200">
                                {groupedColumns[group].map((col, index) => {
                                    const val = fields[col.code] || '';
                                    const isMissing = col.required && !val;

                                    // Check if this is the first optional field (transition point)
                                    const isFirstOptional = !col.required && index > 0 && groupedColumns[group][index - 1].required;

                                    // Determine input type
                                    const isLongText = col.label.toLowerCase().includes('description') && !col.label.toLowerCase().includes('short');

                                    return (
                                        <>
                                            {index === 0 && groupedColumns[group].some(c => c.required) && (
                                                <div className="bg-red-50 border-b-2 border-red-200 px-6 py-3">
                                                    <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                                        <span className="text-red-600 text-lg">*</span>
                                                        Required Fields
                                                    </h3>
                                                    <p className="text-xs text-red-600 mt-1">All fields in this section must be completed</p>
                                                </div>
                                            )}

                                            {isFirstOptional && (
                                                <div className="bg-gray-50 border-y border-gray-200 px-6 py-2">
                                                    <h3 className="text-sm font-semibold text-gray-600">Optional Fields</h3>
                                                </div>
                                            )}

                                            <div className={`p-6 group flex flex-col md:flex-row gap-6 items-start transition-colors border-b border-gray-100 last:border-b-0 ${isMissing ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>

                                                {/* Label Section */}
                                                <div className="w-full md:w-1/3 pt-1 space-y-1">
                                                    <Label className={`text-sm font-semibold leading-tight block ${col.required ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {col.label}
                                                        {col.required && (
                                                            <span className="text-red-600 font-bold ml-1 text-base" title="Required field">*</span>
                                                        )}
                                                        {col.required && (
                                                            <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">REQUIRED</span>
                                                        )}
                                                    </Label>

                                                    <div className="flex flex-col gap-0.5 pt-1">
                                                        <span className="text-[10px] text-gray-400 font-mono select-all cursor-help w-fit bg-gray-50 px-1 rounded" title="Field Code">
                                                            {col.code}
                                                        </span>
                                                        {col.description && (
                                                            <p className="text-[11px] text-gray-500 leading-snug pr-4 mt-0.5">
                                                                {col.description}
                                                            </p>
                                                        )}
                                                        {col.example && (
                                                            <p className="text-[10px] text-blue-500 italic mt-0.5">
                                                                e.g. {col.example}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Input Section */}
                                                <div className="w-full md:w-2/3">
                                                    <div className="relative">
                                                        {col.allowed_values && col.allowed_values.length > 0 ? (
                                                            <SimpleSelect
                                                                value={val}
                                                                onChange={(e) => handleFieldChange(col.code, e.target.value)}
                                                                className={`bg-white shadow-sm w-full ${isMissing ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                                                                placeholder="Select..."
                                                                options={col.allowed_values.map(opt => ({ label: opt, value: opt }))}
                                                            />
                                                        ) : col.data_type === 'boolean' || (col.label.toLowerCase().includes('?') && !isLongText) ? (
                                                            <div className="flex items-center gap-3 pt-1 h-9">
                                                                <Switch
                                                                    checked={val?.toLowerCase() === 'yes' || val?.toLowerCase() === 'y' || val === 'true'}
                                                                    onCheckedChange={(c) => handleFieldChange(col.code, c ? 'Yes' : 'No')}
                                                                />
                                                                <span className={`text-sm font-medium ${val ? 'text-gray-900' : 'text-gray-500'}`}>{val || 'No'}</span>
                                                            </div>
                                                        ) : isLongText ? (
                                                            <Textarea
                                                                value={val}
                                                                onChange={e => handleFieldChange(col.code, e.target.value)}
                                                                className={`min-h-[120px] shadow-sm bg-white w-full resize-y ${isMissing ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                                                            />
                                                        ) : (
                                                            <Input
                                                                value={val}
                                                                onChange={e => handleFieldChange(col.code, e.target.value)}
                                                                className={`shadow-sm bg-white w-full hover:border-gray-400 transition-colors ${isMissing ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div >
    );
}
