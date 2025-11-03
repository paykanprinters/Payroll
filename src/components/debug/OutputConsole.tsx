"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Trash2 } from "lucide-react";
import { bankersRound, formatCurrency } from "@/lib/utils";

const availableLocales = [
  { code: "en-ZA", label: "English (South Africa)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "fr-FR", label: "French (France)" },
];

const OutputConsole: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  // Format tester state
  const [rawInput, setRawInput] = React.useState<string>("12345.6789");
  const [locale, setLocale] = React.useState<string>("en-ZA");

  // Log capture state
  const [captureLogs, setCaptureLogs] = React.useState<boolean>(false);
  const [logs, setLogs] = React.useState<{ time: string; items: any[] }[]>([]);

  // Monkey-patch console.log while capture is enabled
  React.useEffect(() => {
    if (!captureLogs) return;

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), items: args }, ...prev].slice(0, 200));
      originalLog(...args);
    };

    return () => {
      console.log = originalLog;
    };
  }, [captureLogs]);

  // Helper: parse input that may use comma or dot as decimal separator
  const parseNumberInput = (input: string): number | null => {
    if (!input) return null;
    // Replace comma with dot for parsing; preserve minus and decimals
    const normalized = input.replace(/,/g, ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  };

  const parsedValue = parseNumberInput(rawInput);
  const roundedValue = parsedValue !== null ? bankersRound(parsedValue, 2) : null;
  const formattedValue = parsedValue !== null ? new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bankersRound(parsedValue, 2)) : "";
  const formattedValueViaHelper = parsedValue !== null ? formatCurrency(parsedValue, locale) : "";

  // Determine decimal separator used by current locale
  const decimalSeparator = (() => {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
    const sep = parts.find(p => p.type === "decimal")?.value;
    return sep || ".";
  })();

  return (
    <div className="flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Terminal className="mr-2 h-4 w-4" /> Console
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Output Console</SheetTitle>
            <SheetDescription>Inspect formatting and capture logs.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-6">
            {/* Format Tester */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Format Tester</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="format-input">Input value</Label>
                  <Input id="format-input" value={rawInput} onChange={(e) => setRawInput(e.target.value)} className="mt-1" placeholder="e.g. 12345,6789 or 12345.6789" />
                </div>
                <div>
                  <Label htmlFor="format-locale">Locale</Label>
                  <Select value={locale} onValueChange={setLocale}>
                    <SelectTrigger id="format-locale" className="mt-1">
                      <SelectValue placeholder="Select locale" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocales.map(loc => (
                        <SelectItem key={loc.code} value={loc.code}>
                          {loc.label} ({loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">Decimal separator for {locale}: <span className="font-semibold">{decimalSeparator}</span></p>
                <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                  <p>Parsed numeric value: <span className="font-mono">{parsedValue !== null ? parsedValue : "Invalid"}</span></p>
                  <p>Bankers rounded (2dp): <span className="font-mono">{roundedValue !== null ? roundedValue : "N/A"}</span></p>
                  <p>Formatted (Intl): <span className="font-mono">{formattedValue}</span></p>
                  <p>Formatted (formatCurrency): <span className="font-mono">{formattedValueViaHelper}</span></p>
                </div>
              </div>
            </div>

            {/* Log Capture */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Log Capture</h3>
              <div className="flex items-center gap-2">
                <Button variant={captureLogs ? "default" : "outline"} size="sm" onClick={() => setCaptureLogs(v => !v)}>
                  {captureLogs ? "Capturing console.log" : "Start capture"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>
              <div className="rounded-md border">
                <ScrollArea className="h-48 p-3">
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No logs captured yet. Toggle "Start capture", then use console.log anywhere in the app.</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-semibold">{log.time}</span>{" "}
                          {log.items.map((item, i) => (
                            <span key={i} className="font-mono break-words">
                              {typeof item === "string" ? item : JSON.stringify(item)}
                              {i < log.items.length - 1 ? " " : ""}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OutputConsole;