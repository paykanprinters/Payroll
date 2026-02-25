"use client";

import { supabase } from "@/integrations/supabase/client";

export type AuditEntityType = 'payroll_run' | 'payment_batch' | 'settings' | 'timesheet' | 'payslip';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export const insertAuditLog = async (
  entityType: AuditEntityType,
  entityId: string,
  action: string,
  metadata?: Record<string, any>
): Promise<boolean> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;

  const payload = {
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
  };

  const { error } = await supabase.from('audit_logs').insert(payload);
  if (error) {
    console.error("audit-queries: insertAuditLog error", error);
    return false;
  }
  return true;
};

export const fetchAuditLogsForEntity = async (entityType: AuditEntityType, entityId: string): Promise<AuditLogEntry[]> => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("audit-queries: fetchAuditLogsForEntity error", error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
  })) as AuditLogEntry[];
};