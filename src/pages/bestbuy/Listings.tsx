import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import type { BestBuyListing } from '../../types/bestbuy';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BestBuyListings() {
    const navigate = useNavigate();
    const [listings, setListings] = useState<BestBuyListing[]>([]);
    const [templates, setTemplates] = useState<Record<string, string>>({}); // id -> name
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Fetch Templates for lookup
        const { data: tmplData } = await supabase.from('bb_templates').select('id, template_name');
        if (tmplData) {
            const map: Record<string, string> = {};
            tmplData.forEach((t: any) => map[t.id] = t.template_name);
            setTemplates(map);
        }

        // Fetch Listings
        const { data, error } = await supabase
            .from('bb_listings')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) toast.error('Failed to load listings');
        else setListings(data as BestBuyListing[] || []);

        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this listing?')) return;

        const { error } = await supabase.from('bb_listings').delete().eq('id', id);
        if (error) toast.error('Delete failed');
        else {
            toast.success('Listing deleted');
            fetchData();
        }
    };

    const filtered = listings.filter(l =>
        l.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.status.includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Best Buy Listings</h1>
                    <p className="text-gray-500">Manage product content and AI drafts.</p>
                </div>
                <Button onClick={() => navigate('/bestbuy/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> New Listing
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search listings..."
                            className="pl-9 max-w-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No listings found.</TableCell></TableRow>
                            ) : (
                                filtered.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.product_name}
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{item.id.substring(0, 8)}</div>
                                        </TableCell>
                                        <TableCell>{templates[item.template_id] || 'Unknown'}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'approved' ? 'default' : 'secondary'} className={item.status === 'approved' ? 'bg-green-600' : ''}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/bestbuy/listings/${item.id}`)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
