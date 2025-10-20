"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToDoEntry, MockEmployee } from "@/lib/mock-data-interfaces"; // Import MockEmployee
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog"; // Import EmployeeFormValues
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

// Helper to convert snake_case to camelCase for Supabase ToDo data
const convertToDoKeysToCamelCase = (obj: any): ToDoEntry => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as ToDoEntry;
};

interface UseToDosDataProps {
  initialToDos: ToDoEntry[];
  isMockDataEnabled: boolean;
  employees: MockEmployee[];
  addOrUpdateEmployee: (employee: EmployeeFormValues) => Promise<void>;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useToDosData = (
  { initialToDos, isMockDataEnabled, employees, addOrUpdateEmployee, isAuthenticated, isLoadingAuth }: UseToDosDataProps
) => {
  const [toDos, setToDos] = useState<ToDoEntry[]>([]); // Initialize as empty, will fetch from Supabase or localStorage
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoadingToDos, setIsLoadingToDos] = useState<boolean>(true);

  const fetchLiveToDos = useCallback(async () => {
    setIsLoadingToDos(true);
    try {
      console.log("useToDosData: Fetching live To-Dos from Supabase...");
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("useToDosData: Error fetching live To-Dos:", error);
        showError("Failed to load live To-Dos.");
        setToDos([]);
      } else {
        const camelCaseData = data.map(convertToDoKeysToCamelCase);
        console.log("useToDosData: Live To-Dos fetched (camelCaseData):", camelCaseData); // ADDED THIS LOG
        setToDos(camelCaseData);
        setPendingCount(camelCaseData.filter(todo => todo.status === "pending").length);
      }
    } catch (err) {
      console.error("useToDosData: Unhandled error fetching live To-Dos:", err);
      showError("An unexpected error occurred while loading live To-Dos.");
      setToDos([]);
    } finally {
      dismissToast("loading-todos"); // Dismiss any loading toast
      setIsLoadingToDos(false);
      console.log("useToDosData: fetchLiveToDos finished. isLoadingToDos set to false.");
    }
  }, []);

  useEffect(() => {
    console.log("useToDosData: useEffect triggered. isMockDataEnabled:", isMockDataEnabled, "isAuthenticated:", isAuthenticated, "isLoadingAuth:", isLoadingAuth);
    console.log("useToDosData: Current initialToDos length:", initialToDos.length, "employees length:", employees.length);
    if (isLoadingAuth) {
      setIsLoadingToDos(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      console.log("useToDosData: Mock data enabled. Setting To-Dos from initialToDos.");
      setToDos(initialToDos);
      setPendingCount(initialToDos.filter(todo => todo.status === "pending").length);
      setIsLoadingToDos(false);
    } else if (isAuthenticated) {
      console.log("useToDosData: Live data enabled and authenticated. Calling fetchLiveToDos.");
      fetchLiveToDos();
    } else {
      // Not mock data, not authenticated, and auth is done loading
      console.log("useToDosData: Live data enabled but not authenticated. Clearing To-Dos.");
      setToDos([]);
      setPendingCount(0);
      setIsLoadingToDos(false);
    }
  }, [initialToDos, isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveToDos, employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const markToDoAsDone = useCallback(async (id: string) => {
    const todoToMark = toDos.find(todo => todo.id === id);

    if (!todoToMark) {
      showError("To-Do not found.");
      return;
    }

    if (isMockDataEnabled) {
      console.log("useToDosData: Mock data enabled. Marking To-Do as done locally.");
      // Mock data handling
      if (todoToMark.employeeId && todoToMark.relatedField) {
        const employee = employees.find(emp => emp.id === todoToMark.employeeId);
        if (employee) {
          const updatedIgnoredFields = new Set(employee.ignoredIncompleteFields || []);
          updatedIgnoredFields.add(todoToMark.relatedField);

          const updatedEmployee: EmployeeFormValues = {
            ...employee,
            ignoredIncompleteFields: Array.from(updatedIgnoredFields),
          };
          console.log("useToDosData: Mock - updatedEmployee before addOrUpdateEmployee:", updatedEmployee); // Added log

          try {
            console.log(`useToDosData: Updating mock employee ${employee.firstName} with ignored field ${todoToMark.relatedField}.`);
            await addOrUpdateEmployee(updatedEmployee); // Persist the updated employee
            showSuccess(`Field '${todoToMark.relatedField}' for ${employee.firstName} ${employee.lastName} marked as intentionally blank.`);
          } catch (error) {
            console.error("useToDosData: Failed to update employee with ignored field (mock):", error);
            showError("Failed to mark field as intentionally blank (mock).");
            return;
          }
        }
      }

      setToDos(prevToDos => {
        const updatedToDos = prevToDos.map(todo =>
          todo.id === id ? { ...todo, status: "done" as const } : todo
        );
        localStorage.setItem("mockToDos", JSON.stringify(updatedToDos));
        window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: updatedToDos }));
        setPendingCount(updatedToDos.filter(todo => todo.status === "pending").length);
        return updatedToDos;
      });
    } else {
      console.log("useToDosData: Live data enabled. Marking To-Do as done in Supabase.");
      setIsLoadingToDos(true);
      try {
        // 1. Update To-Do status in Supabase
        const { error: updateTodoError } = await supabase
          .from('todos')
          .update({ status: 'done' })
          .eq('id', id);

        if (updateTodoError) {
          console.error("useToDosData: Error updating To-Do status in Supabase:", updateTodoError);
          showError(`Failed to mark To-Do as done: ${updateTodoError.message}`);
          return;
        }

        // 2. If related to an employee field, update employee's ignored_incomplete_fields
        if (todoToMark.employeeId && todoToMark.relatedField) {
          const employee = employees.find(emp => emp.id === todoToMark.employeeId);
          if (employee) {
            const updatedIgnoredFields = new Set(employee.ignoredIncompleteFields || []);
            updatedIgnoredFields.add(todoToMark.relatedField);

            const updatedEmployee: EmployeeFormValues = {
              ...employee,
              ignoredIncompleteFields: Array.from(updatedIgnoredFields),
            };
            console.log("useToDosData: Live - updatedEmployee before addOrUpdateEmployee:", updatedEmployee); // Added log

            try {
              console.log(`useToDosData: Updating live employee ${employee.firstName} with ignored field ${todoToMark.relatedField}.`);
              await addOrUpdateEmployee(updatedEmployee); // Persist the updated employee to Supabase
              showSuccess(`Field '${todoToMark.relatedField}' for ${employee.firstName} ${employee.lastName} marked as intentionally blank.`);
            } catch (error) {
              console.error("useToDosData: Failed to update employee with ignored field (live):", error);
              showError("Failed to mark field as intentionally blank (live).");
              return;
            }
          }
        }

        showSuccess("To-Do marked as done!");
        fetchLiveToDos(); // Re-fetch to update the list
      } catch (err) {
        console.error("useToDosData: Unhandled error marking To-Do as done (live):", err);
        showError("An unexpected error occurred while marking To-Do as done.");
      } finally {
        dismissToast("loading-todos"); // Dismiss any loading toast
        setIsLoadingToDos(false);
        console.log("useToDosData: markToDoAsDone finished. isLoadingToDos set to false.");
      }
    }
  }, [toDos, employees, isMockDataEnabled, addOrUpdateEmployee, fetchLiveToDos]);

  return {
    toDos,
    pendingCount,
    markToDoAsDone,
    getEmployeeCustomId,
    isLoadingToDos,
    refetchToDos: fetchLiveToDos,
  };
};