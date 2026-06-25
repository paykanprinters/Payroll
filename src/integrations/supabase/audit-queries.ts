"use client";

import { supabase } from "@/integrations/supabase/client";
import type { AuditEntityType, AuditLogRow, AuditSeverity } from "@/lib/audit-trail";
import { recordAuditEvent } from "@/lib/audit-trail";

export type { AuditEntityType };

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  severity: AuditSeverity;
  module: string;
  action: string;
  message: string | null;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  userName?: string | null;
  userEmail?: string | null;
}

export interface AuditLogFilters {
  severity?: string;
  module?: string;
  search?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
}

function mapRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || null,
    severity: (row.severity as AuditSeverity) || "info",
    module: (row.module as string) || "system",
    action: row.action as string,
    message: (row.message as string) || null,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    metadata: (row.metadata as Record<string, unknown>) || undefined,
    createdAt: row.created_at as string,
    userName: (row.user_name as string) || null,
    userEmail: (row.user_email as string) || null,
  };
}

export const insertAuditLog = async (
  entityType: AuditEntityType,
  entityId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<boolean> => {
  return recordAuditEvent({
    severity: "info",
    module: entityType === "settings" ? "settings" : "payroll",
    action,
    message: action,
    entityType,
    entityId,
    metadata,
  });
};

export const fetchAuditLogsForEntity = async (
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLogEntry[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("audit-queries: fetchAuditLogsForEntity error", error);
    return [];
  }
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
};

export const fetchAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> => {
  const limit = filters.limit ?? 200;

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters.module && filters.module !== "all") {
    query = query.eq("module", filters.module);
  }
  if (filters.dateStart) {
    query = query.gte("created_at", `${filters.dateStart}T00:00:00.000Z`);
  }
  if (filters.dateEnd) {
    query = query.lte("created_at", `${filters.dateEnd}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("audit-queries: fetchAuditLogs error", error);
    return [];
  }

  let rows = (data || []).map((row) => mapRow(row as Record<string, unknown>));

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const hay = [
        row.message,
        row.action,
        row.module,
        row.severity,
        row.entityType,
        row.entityId,
        row.userEmail,
        JSON.stringify(row.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    const userMap = new Map((users || []).map((u) => [u.id, u]));
    rows = rows.map((row) => {
      const u = row.userId ? userMap.get(row.userId) : null;
      return {
        ...row,
        userName: u?.name ?? row.userName,
        userEmail: u?.email ?? row.userEmail,
      };
    });
  }

  return rows;
};
