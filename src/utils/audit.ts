"use client";

import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  timestamp: string;
  user: string;
  action: string;
}

const AUDIT_KEY = "auditEvents";

export const logAuditEvent = async (action: string) => {
  let userLabel = "Anonymous";
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    userLabel = data.user.email || `User ${data.user.id}`;
  }

  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    user: userLabel,
    action,
  };

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