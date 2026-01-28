import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Printer } from 'lucide-react';

export default function LabelPrinter() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    serialNumber: '',
    brand: '',
    model: '',
    processor: '',
    ram: '',
    ssd: '',
    grade: '',
    comments: '',
    isTouch: false
  });

  // Auto-print if launched from Inventory
  useEffect(() => {
    if (searchParams.get('autoprint') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 1500); // Increased delay to 1.5s to ensure full render
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Auto-populate from URL params
  useEffect(() => {
    const serialNumber = searchParams.get('serialNumber');
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
    // Check various fields for "Touch" keyword OR explicit isTouch param
    const isTouchParam = searchParams.get('isTouch') === 'true';
    const isTouch = isTouchParam || [model, searchParams.get('comments'), searchParams.get('display')].some(
      s => s?.toLowerCase().includes('touch')
    );
    const processor = searchParams.get('processor');
    const ram = searchParams.get('ram');
    const ssd = searchParams.get('ssd');
    const grade = searchParams.get('grade');
    const comments = searchParams.get('comments');

    if (serialNumber || brand || processor) {
      setFormData({
        serialNumber: serialNumber || '',
        brand: brand || '',
        model: model || '',
        processor: processor || '',
        ram: ram || '',
        ssd: ssd || '',
        grade: grade || '',
        comments: comments || '',
        isTouch: isTouch || false
      });
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @page {
          size: 9.5cm 4.5cm;
          margin: 0;
        }
        
        @media print {
          /* Hide everything using visibility (allows children to override) */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 9.5cm !important;
            height: 4.5cm !important;
            overflow: hidden !important;
            background: white !important;
          }
          
          /* Hide all body content */
          body * {
            visibility: hidden !important;
          }
          
          /* Show ONLY the label container and its children */
          .label-container,
          .label-container * {
            visibility: visible !important;
          }
          
          /* Position label at top-left corner */
          .label-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 9.4cm !important;
            height: 4.4cm !important;
            padding: 2mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Label Printer</h1>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            Print Label
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block">
          {/* Input Form - Hidden when printing */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Laptop Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Enter Serial Number"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g. Dell, HP, Lenovo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g. Latitude 5420"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 border p-2 rounded bg-gray-50">
                <input
                  type="checkbox"
                  id="isTouch"
                  name="isTouch"
                  checked={formData.isTouch}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isTouch" className="cursor-pointer font-semibold">Touchscreen Display</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g. A, B, C"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="processor">Processor</Label>
                <Input
                  id="processor"
                  name="processor"
                  value={formData.processor}
                  onChange={handleChange}
                  placeholder="e.g. i7 8th Gen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ram">RAM</Label>
                  <Input
                    id="ram"
                    name="ram"
                    value={formData.ram}
                    onChange={handleChange}
                    placeholder="e.g. 16GB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssd">SSD</Label>
                  <Input
                    id="ssd"
                    name="ssd"
                    value={formData.ssd}
                    onChange={handleChange}
                    placeholder="e.g. 512GB"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Label Preview */}
          <div className="space-y-4 print:space-y-0">
            <h2 className="text-xl font-semibold print:hidden">Preview</h2>
            <div className="flex justify-center md:justify-start print:block">
              {/* Label Container - 9.4cm x 4.4cm (Safer size) */}
              {/* moved style logic to @media print for reliability */}
              <div
                className="label-container bg-white text-black border border-gray-300 shadow-sm print:border-none print:shadow-none box-border overflow-hidden relative"
                style={{
                  fontFamily: 'Inter, sans-serif'
                  /* Dimensions handled by @media print */
                }}
              >

                {/* Header: Brand (Left) & Model (Right) - Larger Text */}
                <div className="flex justify-between items-start w-full mb-0.5 pb-0.5 border-b border-gray-400" style={{ height: '0.9cm' }}>
                  <div className="uppercase font-bold tracking-wider text-gray-800 self-end" style={{ fontSize: '11pt', fontFamily: 'system-ui' }}>
                    {formData.brand || 'BRAND'}
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="font-semibold text-black leading-none" style={{ fontSize: '11pt', fontFamily: 'monospace' }}>
                      {formData.model || 'MODEL'}
                    </div>
                    {/* Touch Badge - Only if isTouch is true */}
                    {formData.isTouch && (
                      <div className="border border-black text-black px-1 rounded-[2px] font-black tracking-wider mt-0.5 leading-none text-center" style={{ fontSize: '7pt' }}>
                        TOUCH
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Specs - Larger Text */}
                <div className="flex-grow flex flex-col justify-center w-full py-0.5 space-y-0.5">
                  {/* Processor - Highlighted Pill */}
                  <div className="w-full flex justify-center">
                    <span className="px-2 py-0.5 rounded border border-gray-300 font-semibold text-black" style={{ fontSize: '10pt', background: '#f9fafb', lineHeight: 1.1 }}>
                      {formData.processor || 'Processor'}
                    </span>
                  </div>

                  {/* RAM & SSD - Clean Text */}
                  <div className="flex justify-center gap-6 w-full text-center items-center mt-1" style={{ fontSize: '10pt' }}>
                    <div className="flex items-center gap-1">
                      <span className="text-[8pt] font-bold text-gray-500 uppercase tracking-wide">RAM</span>
                      <span className="font-medium text-black">{formData.ram || '-'}</span>
                    </div>
                    <div className="h-3 w-px bg-gray-300"></div> {/* Divider */}
                    <div className="flex items-center gap-1">
                      <span className="text-[8pt] font-bold text-gray-500 uppercase tracking-wide">SSD</span>
                      <span className="font-medium text-black">{formData.ssd || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Comment - Elegant Italic */}
                {formData.comments && (
                  <div className="w-full text-center truncate italic text-gray-500 px-1 mt-0.5" style={{ fontSize: '8pt', fontFamily: 'serif' }}>
                    "{formData.comments}"
                  </div>
                )}
              </div>

              {/* Footer: Grade Badge & Barcode */}
              <div className="flex items-center justify-between w-full mt-0 pt-0.5 border-t border-gray-200" style={{ height: '1.3cm' }}>

                {/* Grade Badge - Circular/Stamp Style */}
                <div className="flex items-center justify-center mr-2 border-2 border-black rounded-md w-[28px] h-[28px]">
                  <span className="text-xl font-black leading-none">{formData.grade || 'B'}</span>
                </div>

                {/* Barcode - Clean & Sharp */}
                <div className="flex-grow flex justify-end items-center overflow-hidden">
                  {formData.serialNumber ? (
                    <Barcode
                      value={formData.serialNumber}
                      width={1.7}
                      height={28}
                      fontSize={10}
                      displayValue={true}
                      margin={0}
                      textMargin={1}
                      background="transparent"
                      fontOptions="bold"
                      textAlign="right"
                    />
                  ) : (
                    <div className="text-[8pt] text-gray-300 uppercase tracking-widest">NO SERIAL</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
    </>
  );
}
