"use client";

import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  timestamp: string;
  user: string;
  action: string;
}

const AUDIT_KEY = "auditEvents";

export const logAuditEvent = async (action: string, entityType?: string, entityId?: string, metadata?: Record<string, any>) => {
  let userLabel = "Anonymous";
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id || null;
  if (data?.user) {
    userLabel = data.user.email || `User ${data.user.id}`;
  }

  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    user: userLabel,
    action,
  };

  // Persist to DB when context is provided (user + entity details)
  if (userId && entityType && entityId) {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
    // Ignore DB errors here; always keep local fallback below
  }

  const existingRaw = typeof window !== "undefined" ? localStorage.getItem(AUDIT_KEY) : null;
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  existing.push(event);
  if (typeof window !== "undefined") {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(existing));
  }
};

export const getAuditEvents = (): AuditEvent[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(AUDIT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AuditEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};