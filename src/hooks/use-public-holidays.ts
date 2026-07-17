"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";

export type PublicHoliday = {
  id?: string;
  userId: string;
  name: string;
  date: string; // ISO yyyy-MM-dd
  recurring?: boolean;
  visibleInCalendar?: boolean;
  departments?: string[]; // optional departments scope
};

const LOCAL_KEY = "publicHolidays";

type Options = {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
};

function calcEasterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDefaultSouthAfricanHolidays(year: number): { name: string; date: string; recurring: boolean }[] {
  const easter = calcEasterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const familyDay = new Date(easter);
  familyDay.setDate(easter.getDate() + 1);

  return [
    { name: "New Year’s Day", date: `${year}-01-01`, recurring: true },
    { name: "Human Rights Day", date: `${year}-03-21`, recurring: true },
    { name: "Good Friday", date: toISO(goodFriday), recurring: false },
    { name: "Family Day", date: toISO(familyDay), recurring: false },
    { name: "Freedom Day", date: `${year}-04-27`, recurring: true },
    { name: "Workers’ Day", date: `${year}-05-01`, recurring: true },
    { name: "Youth Day", date: `${year}-06-16`, recurring: true },
    { name: "National Women’s Day", date: `${year}-08-09`, recurring: true },
    { name: "Heritage Day", date: `${year}-09-24`, recurring: true },
    { name: "Day of Reconciliation", date: `${year}-12-16`, recurring: true },
    { name: "Christmas Day", date: `${year}-12-25`, recurring: true },
    { name: "Day of Goodwill", date: `${year}-12-26`, recurring: true },
  ];
}

export const usePublicHolidays = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: Options) => {
  const { user } = useAuth();
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [isLoadingPublicHolidays, setIsLoading] = useState<boolean>(true);

  const fetchLive = useCallback(async () => {
    if (!user?.id) {
      setPublicHolidays([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("public_holidays")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) {
      showError("Failed to load public holidays.");
      setPublicHolidays([]);
    } else {
      const mapped = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        date: row.date,
        recurring: !!row.recurring,
        visibleInCalendar: !!row.visible_in_calendar,
        departments: row.departments || [],
      })) as PublicHoliday[];
      setPublicHolidays(mapped);
    }
    setIsLoading(false);
  }, [user]);

  const saveLive = useCallback(async (holiday: Omit<PublicHoliday, "userId"> & { id?: string }) => {
    if (!user?.id) {
      showError("User not authenticated.");
      return null;
    }
    const payload = {
      id: holiday.id || undefined,
      user_id: user.id,
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring ?? true,
      visible_in_calendar: holiday.visibleInCalendar ?? true,
      departments: holiday.departments || [],
    };
    const { data, error } = await supabase
      .from("public_holidays")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      showError(`Failed to save holiday: ${error.message}`);
      return null;
    }
    showSuccess("Holiday saved.");
    await fetchLive();
    return data;
  }, [user, fetchLive]);

  const deleteLive = useCallback(async (id: string) => {
    const { error } = await supabase.from("public_holidays").delete().eq("id", id);
    if (error) {
      showError(`Failed to delete holiday: ${error.message}`);
      return false;
    }
    showSuccess("Holiday deleted.");
    await fetchLive();
    return true;
  }, [fetchLive]);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }
    if (isMockDataEnabled) {
      const raw = localStorage.getItem(LOCAL_KEY) || "[]";
      setPublicHolidays(JSON.parse(raw));
      setIsLoading(false);
    } else if (isAuthenticated) {
      fetchLive();
    } else {
      setPublicHolidays([]);
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLive]);

  const saveHoliday = useCallback(async (holiday: Omit<PublicHoliday, "userId"> & { id?: string }) => {
    if (isMockDataEnabled) {
      const existing = [...publicHolidays];
      const idx = existing.findIndex((h) => h.id === holiday.id);
      const entry: PublicHoliday = {
        ...holiday,
        id: holiday.id || crypto.randomUUID(),
        userId: user?.id || "mock-user",
      };
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
      setPublicHolidays(existing);
      showSuccess("Holiday saved (mock).");
      return entry;
    } else {
      return await saveLive(holiday);
    }
  }, [isMockDataEnabled, publicHolidays, user, saveLive]);

  const deleteHoliday = useCallback(async (id: string) => {
    if (isMockDataEnabled) {
      const filtered = publicHolidays.filter((h) => h.id !== id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      setPublicHolidays(filtered);
      showSuccess("Holiday deleted (mock).");
      return true;
    } else {
      return await deleteLive(id);
    }
  }, [isMockDataEnabled, publicHolidays, deleteLive]);

  const importDefaultSouthAfricanHolidays = useCallback(async (year: number) => {
    const defaults = getDefaultSouthAfricanHolidays(year);
    if (isMockDataEnabled) {
      const merged = [
        ...publicHolidays,
        ...defaults
          .filter((d) => !publicHolidays.some((h) => h.date === d.date && h.name === d.name))
          .map((d) => ({
            id: crypto.randomUUID(),
            userId: user?.id || "mock-user",
            name: d.name,
            date: d.date,
            recurring: d.recurring,
            visibleInCalendar: true,
            departments: [],
          })),
      ];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      setPublicHolidays(merged);
      showSuccess("Default SA holidays imported (mock).");
      return true;
    } else {
      for (const d of defaults) {
        await saveLive({
          name: d.name,
          date: d.date,
          recurring: d.recurring,
          visibleInCalendar: true,
          departments: [],
        });
      }
      showSuccess("Default SA holidays imported.");
      return true;
    }
  }, [isMockDataEnabled, publicHolidays, user, saveLive]);

  return {
    publicHolidays,
    isLoadingPublicHolidays,
    saveHoliday,
    deleteHoliday,
    importDefaultSouthAfricanHolidays,
  };
};