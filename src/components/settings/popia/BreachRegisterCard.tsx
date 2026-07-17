"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Plus, Pencil } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchBreachIncidents,
  upsertBreachIncident,
  type BreachIncident,
  type BreachInput,
} from "@/integrations/supabase/popia-queries";

const SEVERITY_COLOR: Record<BreachIncident["severity"], string> = {
  low: "bg-slate-500",
  medium: "bg-amber-500",
  high: "bg-orange-600",
  critical: "bg-red-600",
};

const EMPTY: BreachInput = {
  title: "",
  description: "",
  severity: "medium",
  status: "open",
  affectedDescription: "",
  regulatorNotified: false,
  subjectsNotified: false,
  remediation: "",
};

const BreachRegisterCard: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<BreachIncident[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BreachInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIncidents(await fetchBreachIncidents());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (i: BreachIncident) => {
    setDraft({
      id: i.id,
      title: i.title,
      description: i.description ?? "",
      severity: i.severity,
      status: i.status,
      discoveredAt: i.discoveredAt,
      occurredAt: i.occurredAt,
      affectedCount: i.affectedCount,
      affectedDescription: i.affectedDescription ?? "",
      regulatorNotified: i.regulatorNotified,
      subjectsNotified: i.subjectsNotified,
      remediation: i.remediation ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      showError("A title is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await upsertBreachIncident(draft, user?.id);
      if (result.ok) {
        showSuccess("Incident saved.");
        setOpen(false);
        await load();
      } else {
        showError(result.error ?? "Failed to save incident.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Breach register
            </CardTitle>
            <CardDescription>
              POPIA section 22 requires recording security compromises and, where there is a real risk of harm,
              notifying the Information Regulator and affected data subjects.
            </CardDescription>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Log incident
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents logged. That&apos;s good news.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {i.title}
                    <Badge className={`${SEVERITY_COLOR[i.severity]} hover:${SEVERITY_COLOR[i.severity]}`}>
                      {i.severity}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {i.status}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i.discoveredAt ? `Discovered ${new Date(i.discoveredAt).toLocaleDateString()} · ` : ""}
                    Regulator: {i.regulatorNotified ? "notified" : "no"} · Subjects:{" "}
                    {i.subjectsNotified ? "notified" : "no"}
                    {i.affectedCount != null ? ` · ${i.affectedCount} affected` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(i)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit incident" : "Log a breach incident"}</DialogTitle>
            <DialogDescription>Record what happened and the response taken.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="b-title">Title</Label>
              <Input
                id="b-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={draft.severity}
                  onValueChange={(v) => setDraft({ ...draft, severity: v as BreachInput["severity"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as BreachInput["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="contained">Contained</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-discovered">Discovered at</Label>
                <Input
                  id="b-discovered"
                  type="datetime-local"
                  value={draft.discoveredAt ? draft.discoveredAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setDraft({ ...draft, discoveredAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-affected">Affected count</Label>
                <Input
                  id="b-affected"
                  type="number"
                  min={0}
                  value={draft.affectedCount ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, affectedCount: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-desc">What happened</Label>
              <Textarea
                id="b-desc"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-remediation">Remediation</Label>
              <Textarea
                id="b-remediation"
                rows={3}
                value={draft.remediation}
                onChange={(e) => setDraft({ ...draft, remediation: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Information Regulator notified</p>
                <p className="text-xs text-muted-foreground">Toggle on once you&apos;ve reported it.</p>
              </div>
              <Switch
                checked={draft.regulatorNotified}
                onCheckedChange={(v) => setDraft({ ...draft, regulatorNotified: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Affected subjects notified</p>
                <p className="text-xs text-muted-foreground">Toggle on once employees have been informed.</p>
              </div>
              <Switch
                checked={draft.subjectsNotified}
                onCheckedChange={(v) => setDraft({ ...draft, subjectsNotified: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BreachRegisterCard;
