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
          
          body * {
            visibility: hidden;
          }
          
          .label-container, .label-container * {
            visibility: visible;
          }
          
          .label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 9.5cm !important;
            height: 4.5cm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
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
              {/* Label Container - 9.5cm x 4.5cm */}
              {/* Using inline styles for exact print measurements */}
              <div
                className="label-container bg-white text-black border border-gray-300 shadow-sm print:border-none print:shadow-none box-border overflow-hidden relative"
                style={{
                  width: '9.5cm',
                  height: '4.5cm',
                  padding: '2mm',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >

                {/* Top Row: Brand & Model */}
                <div className="w-full flex justify-between items-end border-b-2 border-black pb-1 mb-1" style={{ height: '1.0cm' }}>
                  <div className="font-bold uppercase leading-none overflow-hidden whitespace-nowrap" style={{ fontSize: '16pt', maxWidth: '65%' }}>
                    {formData.brand || 'BRAND'}
                  </div>
                  <div className="font-semibold leading-none overflow-hidden whitespace-nowrap text-right" style={{ fontSize: '10pt', maxWidth: '35%' }}>
                    {formData.model || 'MODEL'}
                  </div>
                </div>

                {/* Middle Row: Specs */}
                <div className="w-full flex-grow flex flex-col justify-center space-y-1">
                  {/* Processor - Highlighted */}
                  <div className="text-center font-bold leading-tight w-full truncate" style={{ fontSize: '12pt' }}>
                    {formData.processor || 'Processor'}
                  </div>

                  {/* RAM & SSD */}
                  <div className="flex justify-center gap-4 w-full" style={{ fontSize: '11pt' }}>
                    <div className="font-semibold"><span className="font-normal text-gray-800 text-[9pt]">RAM:</span> {formData.ram || '-'}</div>
                    <div className="font-semibold"><span className="font-normal text-gray-800 text-[9pt]">SSD:</span> {formData.ssd || '-'}</div>
                  </div>
                </div>

                {/* Bottom Section: Grade & Barcode */}
                <div className="w-full flex items-center justify-between mt-1" style={{ height: '1.4cm' }}>

                  {/* Grade Box - Left */}
                  <div className="flex flex-col items-center justify-center border-2 border-black rounded px-2" style={{ width: '2rem', height: '100%', marginRight: '2mm' }}>
                    <span className="font-bold leading-none" style={{ fontSize: '8pt' }}>GR</span>
                    <span className="font-black leading-none" style={{ fontSize: '24pt' }}>{formData.grade || 'B'}</span>
                  </div>

                  {/* Barcode - Right (takes remaining space) */}
                  <div className="flex-grow flex justify-center items-center h-full overflow-hidden">
                    {formData.serialNumber ? (
                      <Barcode
                        value={formData.serialNumber}
                        width={1.5}
                        height={35}
                        fontSize={12}
                        displayValue={true}
                        margin={0}
                        textMargin={0}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center border border-dashed border-gray-300 text-[8pt] text-gray-400">
                        Scan for Barcode
                      </div>
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
