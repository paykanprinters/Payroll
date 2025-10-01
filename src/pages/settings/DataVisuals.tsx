"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { showSuccess } from "@/utils/toast";

const DEFAULT_FONT_SIZE = 14; // Default font size in pixels
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

const DataVisuals: React.FC = () => {
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem("dataVisualsFontSize");
    return savedFontSize ? parseFloat(savedFontSize) : DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    localStorage.setItem("dataVisualsFontSize", fontSize.toString());
    // Dispatch a custom event to notify other components that the setting has changed
    window.dispatchEvent(new CustomEvent('dataVisualsSettingsUpdated', { detail: fontSize }));
  }, [fontSize]);

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
    showSuccess(`Data visual text size set to ${value[0]}px`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Visuals</CardTitle>
        <CardDescription>
          Customize the appearance of text within charts and data visualizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fontSizeSlider">Text Size ({fontSize}px)</Label>
            <Slider
              id="fontSizeSlider"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              value={[fontSize]}
              onValueChange={handleFontSizeChange}
              className="mt-2"
            />
          </div>
        </div>
        <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
          <h3 className="font-semibold text-lg mb-2">Note:</h3>
          <p className="text-sm">
            This setting will adjust the font size of labels, legends, and tooltips in various charts across the application to improve readability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataVisuals;