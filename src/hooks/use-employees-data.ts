"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation
import { generateCustomEmployeeId } from "@/lib/utils"; // Import the new helper

// Helper to convert snake_case to camelCase for Supabase data
const convertEmployeeKeysToCamelCase = (obj: any): MockEmployee => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
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
      console.log("useEmployeesData: Fetching live employees from Supabase...");
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) {
        console.error("useEmployeesData: Error fetching live employees:", error);
        showError("Failed to load live employee data.");
        setEmployees([]);
      } else {
        const camelCaseData = data.map(convertEmployeeKeysToCamelCase);
        console.log("useEmployeesData: Live employees fetched:", camelCaseData);
        console.log(`useEmployeesData: Successfully fetched ${camelCaseData.length} employees from Supabase.`);
        setEmployees(camelCaseData);
      }
    } catch (err) {
      console.error("useEmployeesData: Unhandled error fetching live employees:", err);
      showError("An unexpected error occurred while loading live employee data.");
      setEmployees([]);
    } finally {
      setIsLoading(false);
      console.log("useEmployeesData: refetchEmployees finished. isLoading set to false.");
    }
  }, []); // No dependencies needed for refetchEmployees itself

  const upsertLiveEmployee = useCallback(async (employeeData: EmployeeFormValues): Promise<MockEmployee | null> => {
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

      const payloadWithCustomId = {
        ...employeeData,
        customEmployeeId: customEmployeeIdToUse,
      };
      const snakeCasePayload = convertEmployeeKeysToSnakeCase(payloadWithCustomId);
      console.log("useEmployeesData: Upserting live employee with payload:", snakeCasePayload);

      const { data, error } = await supabase
        .from('employees')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useEmployeesData: Error upserting live employee:", error);
        showError(`Failed to save employee: ${error.message}`);
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
        return camelCaseData;
      } else {
        console.warn("useEmployeesData: Upsert succeeded but returned no data. This might indicate an RLS issue or unexpected behavior.");
        showError("Employee saved, but data could not be retrieved. Please refresh.");
        return null;
      }
    } catch (err) {
      console.error("useEmployeesData: Unhandled error upserting live employee:", err);
      showError("An unexpected error occurred while saving employee data.");
      return null;
    } finally {
      dismissToast(toastId);
      setIsMutating(false); // Reset mutating state
      console.log("useEmployeesData: upsertLiveEmployee finished. isMutating set to false.");
    }
  }, [employees, companyName]); // `employees` is a dependency here because `customEmployeeIdToUse` generation depends on it.

  const deleteLiveEmployee = useCallback(async (employeeId: string) => {
    const toastId = showLoading("Deleting employee...") as string;
    setIsMutating(true); // Set mutating for this specific operation
    try {
      console.log("useEmployeesData: Deleting live employee with ID:", employeeId);
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error("useEmployeesData: Error deleting live employee:", error);
        showError(`Failed to delete employee: ${error.message}`);
      } else {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        showSuccess("Employee deleted successfully!");
      }
    } catch (err) {
      console.error("useEmployeesData: Unhandled error deleting live employee:", err);
      showError("An unexpected error occurred while deleting employee data.");
    } finally {
      dismissToast(toastId);
      setIsMutating(false); // Reset mutating state
      console.log("useEmployeesData: deleteLiveEmployee finished. isMutating set to false.");
    }
  }, []);

  // --- Unified Employee Management Functions ---
  const addOrUpdateEmployee = useCallback(async (employeeData: EmployeeFormValues) => {
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

          updatedEmployees = prevEmployees.map(emp =>
            emp.id === employeeData.id ? { ...emp, ...employeeData, customEmployeeId: customEmployeeIdToUse } : emp
          );
          showSuccess("Mock employee updated successfully!");
        } else {
          const newId = uuidv4();
          const currentMaxNumber = prevEmployees.reduce((max, emp) => {
            const match = emp.customEmployeeId?.match(/\d+$/);
            return match ? Math.max(max, parseInt(match[0])) : max;
          }, 0);
          const newCustomEmployeeId = generateCustomEmployeeId(companyName, currentMaxNumber);

          const newEmployee: MockEmployee = {
            ...employeeData,
            id: newId,
            customEmployeeId: newCustomEmployeeId,
            standardDailyHours: employeeData.standardDailyHours || 8,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            email: employeeData.email,
            jobTitle: employeeData.jobTitle,
            startDate: employeeData.startDate,
          };
          updatedEmployees = [...prevEmployees, newEmployee];
          showSuccess("Mock employee added successfully!");
        }
        localStorage.setItem("mockEmployees", JSON.stringify(updatedEmployees));
        window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: updatedEmployees }));
        return updatedEmployees;
      });
    } else {
      const result = await upsertLiveEmployee(employeeData);
      if (!result) {
        refetchEmployees(); // Call refetchEmployees if upsert didn't return data
      }
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
    console.log("useEmployeesData: Main useEffect triggered. isMockDataEnabled:", isMockDataEnabled, "isAuthenticated:", isAuthenticated, "isLoadingAuth:", isLoadingAuth);
    if (isLoadingAuth) {
      setIsLoading(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      console.log("useEmployeesData: Mock data enabled. Loading from localStorage.");
      const storedMockEmployees = localStorage.getItem("mockEmployees");
      setEmployees(storedMockEmployees ? JSON.parse(storedMockEmployees) : []);
      setIsLoading(false);
    } else if (isAuthenticated) {
      console.log("useEmployeesData: Live data enabled and authenticated. Calling refetchEmployees.");
      refetchEmployees(); // Use refetchEmployees here
    } else {
      // Not mock data, not authenticated, and auth is done loading
      console.log("useEmployeesData: Live data enabled but not authenticated. Clearing employees.");
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