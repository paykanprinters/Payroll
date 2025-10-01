"use client";

import React, { useState, useEffect } from "react";

const DEFAULT_FONT_SIZE = 14; // Should match the default in DataVisuals.tsx

export const useDataVisualsFontSize = () => {
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem("dataVisualsFontSize");
    return savedFontSize ? parseFloat(savedFontSize) : DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    const handleFontSizeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setFontSize(customEvent.detail);
    };

    window.addEventListener('dataVisualsSettingsUpdated', handleFontSizeUpdate as EventListener);

    // Also load on mount in case the setting was changed in another tab/window
    const initialFontSize = localStorage.getItem("dataVisualsFontSize");
    if (initialFontSize) {
      setFontSize(parseFloat(initialFontSize));
    }

    return () => {
      window.removeEventListener('dataVisualsSettingsUpdated', handleFontSizeUpdate as EventListener);
    };
  }, []);

  return fontSize;
};