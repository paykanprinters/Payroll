"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { sendEmployeeWelcome } from "@/integrations/supabase/message-template-queries";
import { formatWelcomeDeliverySummary } from "@/lib/notification-delivery";
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation
import { generateCustomEmployeeId } from "@/lib/utils"; // Import the new helper
import { logger, toLogError } from "@/lib/logger";

// Helper to convert snake_case to camelCase for Supabase data
const convertEmployeeKeysToCamelCase = (obj: any): MockEmployee => {
  const newObj: any = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    // Explicitly map DB columns to expected form fields
    if (key === 'iban_number') {
      newObj['accountNumber'] = obj[key];
      continue;
    }
    if (key === 'routing_swift_code') {
      newObj['branchCode'] = obj[key];
      continue;
    }

    // Generic snake_case -> camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj as MockEmployee;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertEmployeeKeysToSnakeCase = (obj: Partial<MockEmployee>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      // Special handling for renamed fields
      if (key === 'accountNumber') {
        newObj['iban_number'] = (obj as any)[key];
      } else if (key === 'branchCode') {
        newObj['routing_swift_code'] = (obj as any)[key];
      } else {
        newObj[snakeKey] = (obj as any)[key];
      }
    }
  }
  return newObj;
};

const sanitizeEmployeeDbPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...payload };
  for (const [key, value] of Object.entries(sanitized)) {
    if (value === "") {
      sanitized[key] = null;
    }
  }
  return sanitized;
};

const formatEmployeeSaveError = (error: unknown): string => {
  const message = toLogError(error);
  if (/row-level security|permission denied|42501/i.test(message)) {
    return "You do not have permission to save employee records. Only Admin and Manager roles can add or update employees.";
  }
  return `Failed to save employee: ${message}`;
};

interface UseEmployeesDataProps {
  isMockDataEnabled: boolean;
  companyName: string;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useEmployeesData = ({ isMockDataEnabled, companyName, isAuthenticated, isLoadingAuth }: UseEmployeesDataProps) => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial/full data fetch
  const [isMutating, setIsMutating] = useState<boolean>(false); // For add/update/delete operations

  // --- Live Employee Data Management (Supabase) ---
  const refetchEmployees = useCallback(async () => { // Renamed from fetchLiveEmployees
    setIsLoading(true); // Only set loading for full refetch
    try {
      logger.debug("useEmployeesData: fetching live employees");
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) {
        logger.error("useEmployeesData: error fetching live employees:", toLogError(error));
        showError("Failed to load live employee data.");
        setEmployees([]);
      } else {
        const camelCaseData = data.map(convertEmployeeKeysToCamelCase);
        logger.debug(`useEmployeesData: fetched ${camelCaseData.length} employees`);
        setEmployees(camelCaseData);
      }
    } catch (err) {
      logger.error("useEmployeesData: unhandled error fetching live employees:", toLogError(err));
      showError("An unexpected error occurred while loading live employee data.");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed for refetchEmployees itself

  const upsertLiveEmployee = useCallback(async (employeeData: EmployeeFormValues): Promise<MockEmployee | null> => {
    const isNewEmployee = !employeeData.id;
    const toastId = showLoading(employeeData.id ? "Updating employee..." : "Adding new employee...") as string;
    setIsMutating(true); // Set mutating for this specific operation
    try {
      let customEmployeeIdToUse = employeeData.customEmployeeId;

      if (!employeeData.id) { // If adding a new employee
        const currentMaxNumber = employees.reduce((max, emp) => {
          const match = emp.customEmployeeId?.match(/\d+$/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        customEmployeeIdToUse = generateCustomEmployeeId(companyName, currentMaxNumber);
      } else { // If updating an existing employee
        if (!customEmployeeIdToUse) {
          const existingEmployee = employees.find(emp => emp.id === employeeData.id);
          customEmployeeIdToUse = existingEmployee?.customEmployeeId;
        }
        if (!customEmployeeIdToUse) {
             const currentMaxNumber = employees.reduce((max, emp) => {
                const match = emp.customEmployeeId?.match(/\d+$/);
                return match ? Math.max(max, parseInt(match[0])) : max;
            }, 0);
            customEmployeeIdToUse = generateCustomEmployeeId(companyName, currentMaxNumber);
        }
      }

      // Enforce exclusivity: if salary is set, clear hourly; if hourly is set, clear salary
      const exclusivePayload: EmployeeFormValues = { ...employeeData };
      if (!exclusivePayload.id) {
        exclusivePayload.id = uuidv4();
      }
      if (exclusivePayload.salary !== undefined && exclusivePayload.salary > 0) {
        exclusivePayload.hourlyRate = undefined;
      } else if (exclusivePayload.hourlyRate !== undefined && exclusivePayload.hourlyRate > 0) {
        exclusivePayload.salary = undefined;
      }

      // Include nulls for cleared fields so Supabase actually clears the column
      const payloadWithCustomId = {
        ...exclusivePayload,
        customEmployeeId: customEmployeeIdToUse,
        salary: exclusivePayload.salary ?? null,
        hourlyRate: exclusivePayload.hourlyRate ?? null,
      } as any;

      const snakeCasePayload = sanitizeEmployeeDbPayload(
        convertEmployeeKeysToSnakeCase(payloadWithCustomId)
      );
      logger.debug("useEmployeesData: upserting live employee");

      let { data, error } = await supabase
        .from('employees')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      // Graceful fallback if the COMP-07/08 migration (20260626120000) hasn't been
      // applied yet: retry without the new columns so saves don't break.
      if (error && /(medical_aid_(member|dependants)|retirement_fund_contribution_(percent|fixed))/.test(error.message || "")) {
        logger.warn(
          "useEmployeesData: medical_aid_* / retirement_fund_contribution_* columns missing — apply migration 20260626120000_medical_aid_tax_credit.sql. Saving without those fields for now."
        );
        const fallbackPayload = { ...snakeCasePayload };
        delete fallbackPayload.medical_aid_member;
        delete fallbackPayload.medical_aid_dependants;
        delete fallbackPayload.retirement_fund_contribution_percent;
        delete fallbackPayload.retirement_fund_contribution_fixed;
        ({ data, error } = await supabase
          .from('employees')
          .upsert(fallbackPayload, { onConflict: 'id' })
          .select());
      }

      if (error) {
        logger.error("useEmployeesData: error upserting live employee:", toLogError(error));
        showError(formatEmployeeSaveError(error));
        return null;
      } else if (data && data.length > 0) {
        const camelCaseData = convertEmployeeKeysToCamelCase(data[0]);
        setEmployees(prev => {
          const existingIndex = prev.findIndex(emp => emp.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((emp, idx) => idx === existingIndex ? camelCaseData : emp);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Employee saved successfully!");
        if (isNewEmployee) {
          void sendEmployeeWelcome(camelCaseData.id).then((welcome) => {
            if (!welcome.ok) {
              showError(
                welcome.error ??
                  "Welcome email/SMS could not be sent. Open Settings → Notifications → Delivery log for details."
              );
              return;
            }
            const summary = formatWelcomeDeliverySummary(welcome.results);
            const anySent =
              welcome.results?.email === "sent" || welcome.results?.sms === "sent";
            const anyFailed =
              welcome.results?.email?.startsWith("failed") ||
              welcome.results?.sms?.startsWith("failed");
            if (anySent && !anyFailed) {
              showSuccess("Welcome email/SMS sent to the new employee.");
            } else if (anySent) {
              showSuccess(`Partially sent. ${summary}`);
            } else {
              showError(`${summary} View Settings → Notifications → Delivery log.`);
            }
          });
        }
        return camelCaseData;
      } else {
        logger.warn("useEmployeesData: upsert succeeded but returned no data. This might indicate an RLS issue or unexpected behavior.");
        showError("Employee saved, but data could not be retrieved. Please refresh.");
        return null;
      }
    } catch (err) {
      logger.error("useEmployeesData: unhandled error upserting live employee:", toLogError(err));
      showError("An unexpected error occurred while saving employee data.");
      return null;
    } finally {
      dismissToast(toastId);
      setIsMutating(false); // Reset mutating state
    }
  }, [employees, companyName]); // `employees` is a dependency here because `customEmployeeIdToUse` generation depends on it.

  const deleteLiveEmployee = useCallback(async (employeeId: string) => {
    const toastId = showLoading("Deleting employee...") as string;
    setIsMutating(true); // Set mutating for this specific operation
    try {
      logger.debug("useEmployeesData: deleting live employee");
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        logger.error("useEmployeesData: error deleting live employee:", toLogError(error));
        showError(`Failed to delete employee: ${toLogError(error)}`);
      } else {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        showSuccess("Employee deleted successfully!");
      }
    } catch (err) {
      logger.error("useEmployeesData: unhandled error deleting live employee:", toLogError(err));
      showError("An unexpected error occurred while deleting employee data.");
    } finally {
      dismissToast(toastId);
      setIsMutating(false); // Reset mutating state
    }
  }, []);

  // --- Unified Employee Management Functions ---
  const addOrUpdateEmployee = useCallback(async (employeeData: EmployeeFormValues): Promise<boolean> => {
    if (isMockDataEnabled) {
      setEmployees(prevEmployees => {
        let updatedEmployees: MockEmployee[];
        if (employeeData.id) {
          const existingEmployee = prevEmployees.find(emp => emp.id === employeeData.id);
          let customEmployeeIdToUse = employeeData.customEmployeeId;

          if (!customEmployeeIdToUse && existingEmployee) {
            customEmployeeIdToUse = existingEmployee.customEmployeeId;
          }
          if (!customEmployeeIdToUse) {
            const currentMaxNumber = prevEmployees.reduce((max, emp) => {
              const match = emp.customEmployeeId?.match(/\d+$/);
              return match ? Math.max(max, parseInt(match[0])) : max;
            }, 0);
            customEmployeeIdToUse = generateCustomEmployeeId(companyName, currentMaxNumber);
          }

          // Enforce exclusivity for mock update as well
          const sanitized = { ...employeeData };
          if (sanitized.salary !== undefined && sanitized.salary > 0) {
            sanitized.hourlyRate = undefined;
          } else if (sanitized.hourlyRate !== undefined && sanitized.hourlyRate > 0) {
            sanitized.salary = undefined;
          }
          updatedEmployees = prevEmployees.map(emp =>
            emp.id === employeeData.id ? { ...emp, ...sanitized, customEmployeeId: customEmployeeIdToUse } : emp
          );
          showSuccess("Mock employee updated successfully!");
        } else {
          const newId = uuidv4();
          const currentMaxNumber = prevEmployees.reduce((max, emp) => {
            const match = emp.customEmployeeId?.match(/\d+$/);
            return match ? Math.max(max, parseInt(match[0])) : max;
          }, 0);
          const newCustomEmployeeId = generateCustomEmployeeId(companyName, currentMaxNumber);

          // Enforce exclusivity for mock creation
          const sanitized = { ...employeeData };
          if (sanitized.salary !== undefined && sanitized.salary > 0) {
            sanitized.hourlyRate = undefined;
          } else if (sanitized.hourlyRate !== undefined && sanitized.hourlyRate > 0) {
            sanitized.salary = undefined;
          }

          const newEmployee: MockEmployee = {
            ...sanitized,
            id: newId,
            customEmployeeId: newCustomEmployeeId,
            standardDailyHours: sanitized.standardDailyHours || 8,
            firstName: sanitized.firstName,
            lastName: sanitized.lastName,
            email: sanitized.email,
            jobTitle: sanitized.jobTitle,
            startDate: sanitized.startDate,
          };
          updatedEmployees = [...prevEmployees, newEmployee];
          showSuccess("Mock employee added successfully!");
        }
        localStorage.setItem("mockEmployees", JSON.stringify(updatedEmployees));
        window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: updatedEmployees }));
        return updatedEmployees;
      });
      return true;
    } else {
      const result = await upsertLiveEmployee(employeeData);
      if (!result) {
        refetchEmployees(); // Call refetchEmployees if upsert didn't return data
        return false;
      }
      return true;
    }
  }, [isMockDataEnabled, upsertLiveEmployee, companyName, refetchEmployees]); // Added refetchEmployees to dependencies

  const deleteEmployee = useCallback(async (employeeId: string, employeeName: string) => {
    if (isMockDataEnabled) {
      setEmployees(prevEmployees => {
        const updatedEmployees = prevEmployees.filter(emp => emp.id !== employeeId);
        localStorage.setItem("mockEmployees", JSON.stringify(updatedEmployees));
        window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: updatedEmployees }));
        showSuccess(`Mock employee ${employeeName} removed.`);
        return updatedEmployees;
      });
    } else {
      await deleteLiveEmployee(employeeId);
    }
  }, [isMockDataEnabled, deleteLiveEmployee]);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      const storedMockEmployees = localStorage.getItem("mockEmployees");
      setEmployees(storedMockEmployees ? JSON.parse(storedMockEmployees) : []);
      setIsLoading(false);
    } else if (isAuthenticated) {
      refetchEmployees(); // Use refetchEmployees here
    } else {
      // Not mock data, not authenticated, and auth is done loading
      setEmployees([]);
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, refetchEmployees]); // Use refetchEmployees here

  // Listen for specific update events to re-fetch/update state
  useEffect(() => {
    const handleEmployeesUpdated = (event: CustomEvent<MockEmployee[]>) => {
      console.log("useEmployeesData: 'employeesUpdated' event received. Updating state.");
      if (isMockDataEnabled) {
        setEmployees(event.detail);
      }
    };
    window.addEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
    return () => {
      window.removeEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
    };
  }, [isMockDataEnabled]);

  return {
    employees,
    isLoadingEmployees: isLoading,
    isMutatingEmployee: isMutating, // Expose new mutating state
    addOrUpdateEmployee,
    deleteEmployee,
    refetchEmployees, // Expose refetchEmployees
  };
};