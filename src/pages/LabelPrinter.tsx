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
    comments: ''
  });

  // Auto-print if launched from Inventory
  useEffect(() => {
    if (searchParams.get('autoprint') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 800); // 800ms delay to ensure barcode render
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Auto-populate from URL params
  useEffect(() => {
    const serialNumber = searchParams.get('serialNumber');
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
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
        comments: comments || ''
      });
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 9.5cm !important;
            height: 4.5cm !important;
            overflow: hidden !important;
          }
          
          /* Strict overflow control to prevent 2nd page */
          body > *:not(.label-container) {
            display: none !important;
          }
          
          .label-container {
            position: fixed;
            left: 0;
            top: 0;
            width: 9.4cm !important; /* Slightly smaller to prevent overflow */
            height: 4.4cm !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 9999;
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
              <div
                className="label-container bg-white text-black border border-gray-300 shadow-sm print:border-none print:shadow-none box-border overflow-hidden relative"
                style={{
                  width: '9.4cm',
                  height: '4.4cm',
                  padding: '2mm',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: 'Inter, sans-serif'
                }}
              >

                {/* header: Brand & Model Number */}
                <div className="flex justify-between items-start w-full mb-1" style={{ height: '0.8cm' }}>
                  <div className="uppercase font-medium tracking-wide" style={{ fontSize: '10pt', color: '#333' }}>
                    {formData.brand || 'BRAND'}
                  </div>
                  <div className="font-semibold text-right" style={{ fontSize: '12pt', color: '#000' }}>
                    {formData.model || 'MODEL'}
                  </div>
                </div>

                {/* Main Specs Grid - Clean, light weights */}
                <div className="flex-grow flex flex-col justify-center space-y-1 w-full border-t border-b border-gray-200 py-1 my-1">
                  <div className="text-center w-full" style={{ fontSize: '11pt', fontWeight: 500 }}>
                    {formData.processor || 'Processor'}
                  </div>

                  <div className="flex justify-center gap-6 w-full text-center" style={{ fontSize: '10pt' }}>
                    <div>
                      <span className="text-gray-500 text-[8pt] uppercase mr-1">RAM</span>
                      <span className="font-medium">{formData.ram || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[8pt] uppercase mr-1">SSD</span>
                      <span className="font-medium">{formData.ssd || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Grade & Barcode */}
                <div className="flex items-center justify-between w-full mt-1" style={{ height: '1.4cm' }}>

                  {/* Grade - Circle/Square design instead of heavy border */}
                  <div className="flex flex-col items-center justify-center mr-2">
                    <span className="text-[7pt] text-gray-400 uppercase">Grade</span>
                    <span className="text-2xl font-bold leading-none">{formData.grade || 'B'}</span>
                  </div>

                  {/* Barcode - Wider and clearer */}
                  <div className="flex-grow flex justify-end items-center overflow-hidden">
                    {formData.serialNumber ? (
                      <Barcode
                        value={formData.serialNumber}
                        width={1.8} /* Thicker bars for readability */
                        height={35}
                        fontSize={11}
                        displayValue={true}
                        margin={0}
                        textMargin={2}
                        background="transparent"
                      />
                    ) : (
                      <div className="text-[9pt] text-gray-300 italic">Scan Serial Number</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
