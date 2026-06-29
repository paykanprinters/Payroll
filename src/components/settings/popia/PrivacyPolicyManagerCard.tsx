"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FileText, Plus, Pencil, CheckCircle2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPrivacyPolicies,
  publishPrivacyPolicy,
  upsertPrivacyPolicy,
  fetchAcceptanceCount,
  type PrivacyPolicy,
} from "@/integrations/supabase/popia-queries";

interface DraftPolicy {
  id?: string;
  version: string;
  title: string;
  summary: string;
  effectiveDate: string;
  body: string;
  published: boolean;
}

const EMPTY_DRAFT: DraftPolicy = {
  version: "",
  title: "Employee Privacy Notice",
  summary: "",
  effectiveDate: "",
  body: "",
  published: false,
};

const PrivacyPolicyManagerCard: React.FC = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PrivacyPolicy[]>([]);
  const [acceptances, setAcceptances] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPolicy>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await fetchPrivacyPolicies();
    setPolicies(rows);
    const counts: Record<string, number> = {};
    await Promise.all(
      rows.map(async (p) => {
        counts[p.id] = await fetchAcceptanceCount(p.id);
      })
    );
    setAcceptances(counts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  };

  const openEdit = (p: PrivacyPolicy) => {
    setDraft({
      id: p.id,
      version: p.version,
      title: p.title,
      summary: p.summary ?? "",
      effectiveDate: p.effectiveDate ?? "",
      body: p.body,
      published: p.published,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.version.trim() || !draft.title.trim() || !draft.body.trim()) {
      showError("Version, title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await upsertPrivacyPolicy(
        {
          id: draft.id,
          version: draft.version,
          title: draft.title,
          summary: draft.summary,
          effectiveDate: draft.effectiveDate || null,
          body: draft.body,
          published: draft.published,
        },
        user?.id
      );
      if (result.ok) {
        showSuccess("Privacy notice saved.");
        setOpen(false);
        await load();
      } else {
        showError(result.error ?? "Failed to save privacy notice.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (p: PrivacyPolicy) => {
    const result = await publishPrivacyPolicy(p.id);
    if (result.ok) {
      showSuccess(`Version ${p.version} is now the active notice.`);
      await load();
    } else {
      showError(result.error ?? "Failed to publish.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Privacy notice
            </CardTitle>
            <CardDescription>
              Versioned privacy notice shown to staff in the portal. Publish one version as the active notice; staff
              acceptances are tracked per version.
            </CardDescription>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="mr-2 h-4 w-4" /> New version
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No privacy notice yet. Create one to publish to staff.</p>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {p.title} <span className="text-muted-foreground">v{p.version}</span>
                    {p.published ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.effectiveDate ? `Effective ${p.effectiveDate} · ` : ""}
                    {acceptances[p.id] ?? 0} acceptance(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </Button>
                  {!p.published && (
                    <Button size="sm" onClick={() => handlePublish(p)}>
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Publish
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit privacy notice" : "New privacy notice"}</DialogTitle>
            <DialogDescription>
              Markdown is supported. Review with your Information Officer before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pp-version">Version</Label>
                <Input
                  id="pp-version"
                  placeholder="1.0"
                  value={draft.version}
                  onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pp-title">Title</Label>
                <Input
                  id="pp-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-effective">Effective date</Label>
              <Input
                id="pp-effective"
                type="date"
                value={draft.effectiveDate}
                onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-summary">Summary</Label>
              <Input
                id="pp-summary"
                placeholder="One-line summary shown to staff"
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-body">Body (markdown)</Label>
              <Textarea
                id="pp-body"
                rows={12}
                className="font-mono text-xs"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
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

export default PrivacyPolicyManagerCard;
