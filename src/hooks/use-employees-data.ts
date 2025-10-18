"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog"; // Import EmployeeFormValues
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
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const useEmployeesData = (isMockDataEnabled: boolean, companyName: string) => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- Live Employee Data Management (Supabase) ---
  const fetchLiveEmployees = useCallback(async () => {
    setIsLoading(true);
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
        setEmployees(camelCaseData);
      }
    } catch (err) {
      console.error("useEmployeesData: Unhandled error fetching live employees:", err);
      showError("An unexpected error occurred while loading live employee data.");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upsertLiveEmployee = useCallback(async (employeeData: EmployeeFormValues) => {
    const toastId = showLoading(employeeData.id ? "Updating employee..." : "Adding new employee...") as string;
    setIsLoading(true);
    try {
      let customEmployeeIdToUse = employeeData.customEmployeeId;

      if (!employeeData.id) { // If adding a new employee
        const currentMaxNumber = employees.reduce((max, emp) => {
          const match = emp.customEmployeeId?.match(/\d+$/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        customEmployeeIdToUse = generateCustomEmployeeId(companyName, currentMaxNumber);
      } else { // If updating an existing employee
        // Prioritize customEmployeeId from form data if present
        if (!customEmployeeIdToUse) {
          // If not from form, try to get from existing employee in state
          const existingEmployee = employees.find(emp => emp.id === employeeData.id);
          customEmployeeIdToUse = existingEmployee?.customEmployeeId;
        }
        // If still no customEmployeeId, generate a new one (e.g., for legacy data)
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
        .select(); // Removed .single()

      if (error) {
        console.error("useEmployeesData: Error upserting live employee:", error);
        showError(`Failed to save employee: ${error.message}`);
      } else if (data && data.length > 0) { // Check if data is returned and has elements
        const camelCaseData = convertEmployeeKeysToCamelCase(data[0]); // Take the first element
        setEmployees(prev => {
          const existingIndex = prev.findIndex(emp => emp.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((emp, idx) => idx === existingIndex ? camelCaseData : emp);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Employee saved successfully!");
      } else {
        // This case means upsert succeeded but returned no data, which is unexpected for onConflict: 'id'
        // It might indicate an RLS issue on SELECT, or a Supabase internal issue.
        console.warn("useEmployeesData: Upsert succeeded but returned no data. This might indicate an RLS issue or unexpected behavior.");
        showError("Employee saved, but data could not be retrieved. Please refresh.");
        // A refetch might be necessary here to ensure state is consistent
        fetchLiveEmployees(); // Trigger a full refetch
      }
    } catch (err) {
      console.error("useEmployeesData: Unhandled error upserting live employee:", err);
      showError("An unexpected error occurred while saving employee data.");
    } finally {
      dismissToast(toastId);
      setIsLoading(false);
    }
  }, [employees, companyName, fetchLiveEmployees]); // Added employees, companyName, and fetchLiveEmployees to dependencies

  const deleteLiveEmployee = useCallback(async (employeeId: string) => {
    const toastId = showLoading("Deleting employee...") as string;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  // --- Unified Employee Management Functions ---
  const addOrUpdateEmployee = useCallback(async (employeeData: EmployeeFormValues) => {
    if (isMockDataEnabled) {
      setEmployees(prevEmployees => {
        let updatedEmployees: MockEmployee[];
        if (employeeData.id) {
          // For mock data, if ID exists, update the employee
          const existingEmployee = prevEmployees.find(emp => emp.id === employeeData.id);
          let customEmployeeIdToUse = employeeData.customEmployeeId;

          // If form didn't provide customEmployeeId, try to use existing one
          if (!customEmployeeIdToUse && existingEmployee) {
            customEmployeeIdToUse = existingEmployee.customEmployeeId;
          }
          // If still no customEmployeeId, generate one (e.g., for legacy mock data)
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
          // For new mock employee, generate ID
          const newId = uuidv4(); // Generate UUID for internal ID
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
      await upsertLiveEmployee(employeeData);
    }
  }, [isMockDataEnabled, upsertLiveEmployee, companyName]); // Added companyName to dependencies

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
    if (isMockDataEnabled) {
      const storedMockEmployees = localStorage.getItem("mockEmployees");
      setEmployees(storedMockEmployees ? JSON.parse(storedMockEmployees) : []);
      setIsLoading(false);
    } else {
      fetchLiveEmployees();
    }
  }, [isMockDataEnabled, fetchLiveEmployees]);

  // Listen for specific update events to re-fetch/update state
  useEffect(() => {
    const handleEmployeesUpdated = (event: CustomEvent<MockEmployee[]>) => {
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
    addOrUpdateEmployee,
    deleteEmployee,
  };
};