"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageSquare, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import {
  MESSAGE_TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLE_HELP,
  type MessageTemplate,
} from "@/lib/message-template-catalog";
import {
  fetchMessageTemplates,
  updateMessageTemplate,
} from "@/integrations/supabase/message-template-queries";

const MessageTemplatesSettings: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, MessageTemplate>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    const rows = await fetchMessageTemplates();
    setTemplates(rows);
    setDrafts(Object.fromEntries(rows.map((t) => [t.id, { ...t }])));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const templatesByCategory = useMemo(() => {
    const map = new Map<string, MessageTemplate[]>();
    for (const cat of MESSAGE_TEMPLATE_CATEGORIES) {
      map.set(
        cat.id,
        templates.filter((t) => t.category === cat.id)
      );
    }
    return map;
  }, [templates]);

  const updateDraft = (id: string, patch: Partial<MessageTemplate>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const handleSave = async (templateId: string) => {
    const draft = drafts[templateId];
    if (!draft) return;
    setSavingId(templateId);
    const result = await updateMessageTemplate(
      {
        id: draft.id,
        subject: draft.subject,
        body: draft.body,
        enabled: draft.enabled,
        includeLogo: draft.includeLogo,
      },
      user?.id
    );
    setSavingId(null);
    if (!result.ok) {
      showError(result.error ?? "Failed to save template.");
      return;
    }
    showSuccess(`${draft.name} saved.`);
    await load();
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message templates</CardTitle>
          <CardDescription>Only admins can edit email and SMS templates.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Message templates</CardTitle>
          <CardDescription>
            Edit the wording of automated emails and SMS messages. Each template can be switched on or
            off independently. Welcome messages are sent when a new employee is saved; payslip and
            payroll templates are ready for you to customise before we wire them into delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <strong>Professional tip:</strong> including your company logo in welcome and payslip
            emails looks polished and helps staff trust the message. Use a publicly accessible logo URL
            from Company Details (we recommend a PNG around 160px wide).
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Variables: {TEMPLATE_VARIABLE_HELP.join(", ")}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="onboarding" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            {MESSAGE_TEMPLATE_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="rounded-lg">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {MESSAGE_TEMPLATE_CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4">
              <p className="text-sm text-muted-foreground">{cat.description}</p>
              {(templatesByCategory.get(cat.id) ?? []).map((template) => {
                const draft = drafts[template.id] ?? template;
                return (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {draft.channel === "email" ? (
                              <Mail className="h-4 w-4" />
                            ) : (
                              <MessageSquare className="h-4 w-4" />
                            )}
                            {draft.name}
                            <Badge variant="outline">{draft.channel.toUpperCase()}</Badge>
                          </CardTitle>
                          {draft.description && (
                            <CardDescription>{draft.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`enabled-${draft.id}`} className="text-sm">
                            Enabled
                          </Label>
                          <Switch
                            id={`enabled-${draft.id}`}
                            checked={draft.enabled}
                            onCheckedChange={(checked) => updateDraft(draft.id, { enabled: checked })}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {draft.channel === "email" && (
                        <>
                          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">Include company logo</p>
                              <p className="text-xs text-muted-foreground">
                                Shows your logo from Company Details in the email header.
                              </p>
                            </div>
                            <Switch
                              checked={draft.includeLogo}
                              onCheckedChange={(checked) =>
                                updateDraft(draft.id, { includeLogo: checked })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`subject-${draft.id}`}>Subject</Label>
                            <Input
                              id={`subject-${draft.id}`}
                              value={draft.subject ?? ""}
                              onChange={(e) => updateDraft(draft.id, { subject: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor={`body-${draft.id}`}>
                          {draft.channel === "email" ? "Email body (HTML)" : "SMS message"}
                        </Label>
                        <Textarea
                          id={`body-${draft.id}`}
                          value={draft.body}
                          onChange={(e) => updateDraft(draft.id, { body: e.target.value })}
                          rows={draft.channel === "email" ? 10 : 4}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button
                        onClick={() => handleSave(draft.id)}
                        disabled={savingId === draft.id}
                      >
                        {savingId === draft.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default MessageTemplatesSettings;
