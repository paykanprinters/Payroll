"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToDoEntry, MockEmployee } from "@/lib/mock-data-interfaces"; // Import MockEmployee
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog"; // Import EmployeeFormValues
import { showSuccess, showError } from "@/utils/toast";

export const useToDosData = (
  initialToDos: ToDoEntry[],
  isMockDataEnabled: boolean,
  employees: MockEmployee[],
  addOrUpdateEmployee: (employee: EmployeeFormValues) => Promise<void> // New prop
) => {
  const [toDos, setToDos] = useState<ToDoEntry[]>(initialToDos);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    setToDos(initialToDos);
    setPendingCount(initialToDos.filter(todo => todo.status === "pending").length);
  }, [initialToDos]);

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
          await addOrUpdateEmployee(updatedEmployee); // Persist the updated employee
          showSuccess(`Field '${todoToMark.relatedField}' for ${employee.firstName} ${employee.lastName} marked as intentionally blank.`);
        } catch (error) {
          console.error("Failed to update employee with ignored field:", error);
          showError("Failed to mark field as intentionally blank.");
          return; // Do not mark To-Do as done if employee update fails
        }
      }
    }

    setToDos(prevToDos => {
      const updatedToDos = prevToDos.map(todo =>
        todo.id === id ? { ...todo, status: "done" as const } : todo
      );
      if (isMockDataEnabled) {
        localStorage.setItem("mockToDos", JSON.stringify(updatedToDos));
        window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: updatedToDos })); // Dispatch specific event
      }
      setPendingCount(updatedToDos.filter(todo => todo.status === "pending").length);
      return updatedToDos;
    });
  }, [toDos, employees, isMockDataEnabled, addOrUpdateEmployee]);

  return {
    toDos,
    pendingCount,
    markToDoAsDone,
    getEmployeeCustomId, // Expose new helper
  };
};