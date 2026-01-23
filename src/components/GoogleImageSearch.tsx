import { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface GoogleImageSearchProps {
    initialQuery?: string;
}

export function GoogleImageSearch({ initialQuery = '' }: GoogleImageSearchProps) {
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = () => {
        if (!query.trim()) return;
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        // Open a popup window on the right side
        const width = 600;
        const height = 800;
        const left = window.screen.width - width;
        const top = 0;
        window.open(url, 'GoogleImageSearch', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`);
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Google Image Search helper
            </h3>

            <div className="flex gap-2 mb-4">
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Product name..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                    Search
                    <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
            </div>

            <div className="flex-1 bg-gray-50 rounded border border-dashed border-gray-300 p-4 text-center flex flex-col items-center justify-center text-gray-500 text-sm">
                <p className="mb-2"><strong>How to use:</strong></p>
                <ol className="text-left space-y-2 list-decimal list-inside">
                    <li>Click <strong>Search</strong> to open Google Images</li>
                    <li>Find a good image in the popup window</li>
                    <li><strong>Click and Drag</strong> the image directly from the popup to the "Image Source" fields on the left</li>
                    <li>The image will be automatically uploaded to Cloudinary!</li>
                </ol>

                <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded text-xs">
                    <p>💡 Tip: You can drag multiple images one by one to fill all slots.</p>
                </div>
            </div>
        </div>
    );
}
