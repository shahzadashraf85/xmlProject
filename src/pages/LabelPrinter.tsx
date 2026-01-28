import React, { useState } from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Printer } from 'lucide-react';

export default function LabelPrinter() {
  const [formData, setFormData] = useState({
    serialNumber: '',
    brand: '',
    processor: '',
    ram: '',
    ssd: '',
    grade: '',
    comments: ''
  });

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
                  placeholder="e.g. Dell, HP"
                />
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
               {/* Label Container - 4x6 inches approx */}
               <div className="bg-white text-black p-4 border border-gray-300 shadow-sm print:border-none print:shadow-none w-[4in] h-[6in] flex flex-col items-center justify-between box-border overflow-hidden relative">
                  
                  {/* Header/Brand */}
                  <div className="text-center w-full border-b-2 border-black pb-2 mb-2">
                     <h2 className="text-4xl font-bold uppercase tracking-wide">{formData.brand || 'BRAND'}</h2>
                  </div>

                  {/* Main Specs */}
                  <div className="flex-1 w-full flex flex-col justify-center space-y-4 text-center">
                    {formData.processor && (
                        <div className="text-3xl font-bold">{formData.processor}</div>
                    )}
                    
                    <div className="flex justify-center gap-6 text-2xl font-semibold">
                        {formData.ram && <span>RAM: {formData.ram}</span>}
                        {formData.ssd && <span>SSD: {formData.ssd}</span>}
                    </div>

                    {formData.grade && (
                        <div className="mt-4">
                            <span className="text-xl">Grade:</span>
                            <span className="text-5xl font-bold ml-2">{formData.grade}</span>
                        </div>
                    )}
                  </div>

                  {/* Comments */}
                  {formData.comments && (
                      <div className="w-full text-center text-sm border-t border-black pt-2 mb-2 italic">
                        {formData.comments}
                      </div>
                  )}

                  {/* Footer / Barcode */}
                  <div className="w-full flex flex-col items-center pt-2 border-t-2 border-black mt-auto">
                     <div className="w-full flex justify-center">
                        {formData.serialNumber ? (
                            <Barcode 
                                value={formData.serialNumber} 
                                width={2}
                                height={60}
                                fontSize={14}
                                displayValue={true}
                            />
                        ) : (
                            <div className="h-[80px] w-full flex items-center justify-center border border-dashed border-gray-400 text-gray-400">
                                Serial Number Barcode
                            </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
