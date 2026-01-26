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
          <div className="flex justify-center md:justify-start">
            {/* Label Container - 9.5cm x 4.5cm */}
            <div className="bg-white text-black border border-gray-300 shadow-sm print:border-none print:shadow-none w-[9.5cm] h-[4.5cm] flex flex-col justify-between box-border overflow-hidden relative p-3">

              {/* Brand Header */}
              <div className="text-center w-full border-b-2 border-black pb-2">
                <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>{formData.brand || 'BRAND'}</h2>
              </div>

              {/* Processor - Full width centered */}
              <div className="text-center w-full py-1">
                <div className="text-base font-semibold leading-tight">
                  {formData.processor || 'Processor Info'}
                </div>
              </div>

              {/* RAM and SSD - Side by side */}
              <div className="flex justify-center items-center gap-6 w-full">
                <div className="text-sm font-semibold">
                  RAM: <span className="font-bold">{formData.ram || '0GB'}</span>
                </div>
                <div className="text-sm font-semibold">
                  SSD: <span className="font-bold">{formData.ssd || '0GB'}</span>
                </div>
              </div>

              {/* Grade - Centered with border */}
              <div className="text-center w-full border-t-2 border-b-2 border-black py-2">
                <span className="text-sm font-medium">Grade: </span>
                <span className="text-4xl font-bold">{formData.grade || 'B'}</span>
              </div>

              {/* Barcode - Bottom */}
              <div className="w-full flex justify-center items-center">
                {formData.serialNumber ? (
                  <Barcode
                    value={formData.serialNumber}
                    width={1.2}
                    height={35}
                    fontSize={10}
                    displayValue={true}
                    margin={0}
                  />
                ) : (
                  <div className="h-[45px] w-full flex items-center justify-center border border-dashed border-gray-400 text-gray-400 text-xs">
                    Serial Number Barcode
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
