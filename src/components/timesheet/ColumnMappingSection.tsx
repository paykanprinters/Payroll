"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCcw } from "lucide-react";
import { requiredFields, optionalFields, ColumnMappings } from "@/hooks/use-timesheet-import";

interface ColumnMappingSectionProps {
  csvHeaders: string[];
  columnMappings: ColumnMappings;
  onColumnMappingChange: (key: string, value: string) => void;
  onRevalidate: () => void;
  parsedRawDataLength: number;
}

const ColumnMappingSection: React.FC<ColumnMappingSectionProps> = ({
  csvHeaders,
  columnMappings,
  onColumnMappingChange,
  onRevalidate,
  parsedRawDataLength,
}) => {
  if (csvHeaders.length === 0) {
    return null;
  }

  return (
    <>
      <Separator />
      <h3 className="text-md font-semibold">Column Mapping</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...requiredFields, ...optionalFields].map(field => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
            <Select
              onValueChange={(value) => onColumnMappingChange(field.key, value)}
              value={columnMappings[field.key] || "none"}
            >
              <SelectTrigger id={`map-${field.key}`}>
                <SelectValue placeholder={`Select ${field.label} column`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {csvHeaders.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button onClick={onRevalidate} variant="outline" disabled={parsedRawDataLength === 0}>
        <RefreshCcw className="mr-2 h-4 w-4" /> Re-validate with Mappings
      </Button>
      <Separator />
    </>
  );
};

export default ColumnMappingSection;