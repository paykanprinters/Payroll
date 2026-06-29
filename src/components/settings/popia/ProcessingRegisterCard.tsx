"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { fetchProcessingRegister, type ProcessingEntry } from "@/integrations/supabase/popia-queries";

const ProcessingRegisterCard: React.FC = () => {
  const [entries, setEntries] = useState<ProcessingEntry[]>([]);

  useEffect(() => {
    fetchProcessingRegister().then(setEntries);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> Processing register
        </CardTitle>
        <CardDescription>
          Record of processing activities (POPIA section 17 / PAIA): what personal information is processed, why, and on
          what lawful basis. Use this as the basis for your PAIA manual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processing activities recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Lawful basis</th>
                  <th className="py-2 pr-4">Recipients</th>
                  <th className="py-2 pr-4">Retention</th>
                  <th className="py-2 pr-4">Flags</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4 font-medium">{e.category}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.purpose}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.lawfulBasis}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.recipients}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.retention}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {e.specialPi && (
                          <Badge variant="destructive" className="text-[10px]">
                            Special PI
                          </Badge>
                        )}
                        {e.crossBorder && (
                          <Badge variant="secondary" className="text-[10px]">
                            Cross-border
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessingRegisterCard;
