"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToDoEntry, MockEmployee } from "@/lib/mock-data-interfaces"; // Import MockEmployee
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog"; // Import EmployeeFormValues
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { logger, toLogError } from "@/lib/logger";

// Helper to convert snake_case to camelCase for Supabase ToDo data
const convertToDoKeysToCamelCase = (obj: object): ToDoEntry => {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    newObj[camelKey] = value;
  }
  return newObj as unknown as ToDoEntry;
};

interface UseToDosDataProps {
  initialToDos: ToDoEntry[];
  isMockDataEnabled: boolean;
  employees: MockEmployee[];
  addOrUpdateEmployee: (employee: EmployeeFormValues) => Promise<boolean>;
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
      logger.debug("useToDosData: fetching live To-Dos");
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error("useToDosData: error fetching live To-Dos:", toLogError(error));
        showError("Failed to load live To-Dos.");
        setToDos([]);
      } else {
        const camelCaseData = data.map(convertToDoKeysToCamelCase);
        setToDos(camelCaseData);
        setPendingCount(camelCaseData.filter(todo => todo.status === "pending").length);
      }
    } catch (err) {
      logger.error("useToDosData: unhandled error fetching live To-Dos:", toLogError(err));
      showError("An unexpected error occurred while loading live To-Dos.");
      setToDos([]);
    } finally {
      dismissToast("loading-todos"); // Dismiss any loading toast
      setIsLoadingToDos(false);
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingToDos(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      setToDos(initialToDos);
      setPendingCount(initialToDos.filter(todo => todo.status === "pending").length);
      setIsLoadingToDos(false);
    } else if (isAuthenticated) {
      fetchLiveToDos();
    } else {
      // Not mock data, not authenticated, and auth is done loading
      setToDos([]);
      setPendingCount(0);
      setIsLoadingToDos(false);
    }
  }, [initialToDos, isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveToDos]);

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

          try {
            const saved = await addOrUpdateEmployee(updatedEmployee); // Persist the updated employee
            if (!saved) return;
            showSuccess(`Field '${todoToMark.relatedField}' for ${employee.firstName} ${employee.lastName} marked as intentionally blank.`);
          } catch (error) {
            logger.error("useToDosData: failed to update employee with ignored field (mock):", toLogError(error));
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
      logger.debug("useToDosData: marking To-Do as done in Supabase.");
      setIsLoadingToDos(true);
      try {
        // 1. Update To-Do status in Supabase
        const { error: updateTodoError } = await supabase
          .from('todos')
          .update({ status: 'done' })
          .eq('id', id);

        if (updateTodoError) {
          logger.error("useToDosData: error updating To-Do status in Supabase:", toLogError(updateTodoError));
          showError(`Failed to mark To-Do as done: ${toLogError(updateTodoError)}`);
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

            try {
              const saved = await addOrUpdateEmployee(updatedEmployee); // Persist the updated employee to Supabase
              if (!saved) return;
              showSuccess(`Field '${todoToMark.relatedField}' for ${employee.firstName} ${employee.lastName} marked as intentionally blank.`);
            } catch (error) {
              logger.error("useToDosData: failed to update employee with ignored field (live):", toLogError(error));
              showError("Failed to mark field as intentionally blank (live).");
              return;
            }
          }
        }

        showSuccess("To-Do marked as done!");
        fetchLiveToDos(); // Re-fetch to update the list
      } catch (err) {
        logger.error("useToDosData: unhandled error marking To-Do as done (live):", toLogError(err));
        showError("An unexpected error occurred while marking To-Do as done.");
      } finally {
        dismissToast("loading-todos"); // Dismiss any loading toast
        setIsLoadingToDos(false);
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