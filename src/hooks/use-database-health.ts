"use client";

import { useCallback, useEffect, useState } from "react";
import { checkDatabaseHealth, type DatabaseHealthReport } from "@/lib/database-health";

export function useDatabaseHealth(options: {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  enabled?: boolean;
}) {
  const [report, setReport] = useState<DatabaseHealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runCheck = useCallback(async () => {
    if (options.enabled === false) return;
    setIsChecking(true);
    try {
      const result = await checkDatabaseHealth({
        isMockDataEnabled: options.isMockDataEnabled,
        isAuthenticated: options.isAuthenticated,
      });
      setReport(result);
    } finally {
      setIsChecking(false);
    }
  }, [options.isMockDataEnabled, options.isAuthenticated, options.enabled]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return { report, isChecking, runCheck };
}
