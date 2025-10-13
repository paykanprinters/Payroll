"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToDoEntry } from "@/lib/mock-data-interfaces";

export const useToDosData = () => {
  const [toDos, setToDos] = useState<ToDoEntry[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const loadToDos = useCallback(() => {
    const storedToDos = localStorage.getItem("mockToDos");
    const loadedToDos: ToDoEntry[] = storedToDos ? JSON.parse(storedToDos) : [];
    setToDos(loadedToDos);
    setPendingCount(loadedToDos.filter(todo => todo.status === "pending").length);
  }, []);

  useEffect(() => {
    loadToDos();
    window.addEventListener('mockDataUpdated', loadToDos);
    return () => {
      window.removeEventListener('mockDataUpdated', loadToDos);
    };
  }, [loadToDos]);

  const markToDoAsDone = useCallback((id: string) => {
    setToDos(prevToDos => {
      const updatedToDos = prevToDos.map(todo =>
        todo.id === id ? { ...todo, status: "done" } : todo
      );
      localStorage.setItem("mockToDos", JSON.stringify(updatedToDos));
      setPendingCount(updatedToDos.filter(todo => todo.status === "pending").length);
      return updatedToDos;
    });
  }, []);

  return {
    toDos,
    pendingCount,
    markToDoAsDone,
    loadToDos, // Expose for explicit refresh if needed
  };
};