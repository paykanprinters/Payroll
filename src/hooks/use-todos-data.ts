"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToDoEntry } from "@/lib/mock-data-interfaces";

export const useToDosData = (initialToDos: ToDoEntry[], isMockDataEnabled: boolean) => {
  const [toDos, setToDos] = useState<ToDoEntry[]>(initialToDos);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    setToDos(initialToDos);
    setPendingCount(initialToDos.filter(todo => todo.status === "pending").length);
  }, [initialToDos]);

  const markToDoAsDone = useCallback((id: string) => {
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
  }, [isMockDataEnabled]);

  return {
    toDos,
    pendingCount,
    markToDoAsDone,
  };
};