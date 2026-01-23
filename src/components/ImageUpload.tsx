import { useState, useCallback } from 'react';
import { X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const uploadToCloudinary = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Get Cloudinary config from env
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            toast.error('Cloudinary not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'bestbuy-products'); // Organize in folder

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // Use secure_url for HTTPS
            onChange(data.secure_url);
            toast.success('Image uploaded to Cloudinary!');
        } catch (error: any) {
            console.error('Cloudinary upload error:', error);
            toast.error('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadToCloudinary(e.dataTransfer.files[0]);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadToCloudinary(e.target.files[0]);
        }
    };

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="space-y-2">
            {value ? (
                <div className="relative group">
                    <img
                        src={value}
                        alt={label}
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EBroken%3C/text%3E%3C/svg%3E';
                        }}
                    />
                    <button
                        onClick={handleClear}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        type="button"
                        title="Remove image"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="mt-2">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            placeholder="Cloudinary URL"
                        />
                    </div>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <div className="flex flex-col items-center gap-2">
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-600">Uploading to Cloudinary...</p>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
