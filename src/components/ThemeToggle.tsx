"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Switch checked={isDark} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
      <Label className="text-sm">{isDark ? "Dark" : "Light"}</Label>
      <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </div>
  );
};

export default ThemeToggle;