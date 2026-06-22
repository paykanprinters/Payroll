"use client";

import React from "react";
import { ListTodo, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanPageBanner from "@/components/KanPageBanner";

interface ToDosHeaderProps {
  onGenerate: () => void;
  generateDisabled: boolean;
  generateTitle?: string;
  isGenerating?: boolean;
}

const ToDosHeader: React.FC<ToDosHeaderProps> = ({
  onGenerate,
  generateDisabled,
  generateTitle,
  isGenerating = false,
}) => {
  return (
    <KanPageBanner
      icon={ListTodo}
      title="Payroll To-Dos"
      description="Action items from employee records, timesheets, leave, and payroll readiness checks."
      actions={
        <Button
          onClick={onGenerate}
          disabled={generateDisabled || isGenerating}
          title={generateTitle}
          className="bg-white text-cyan-900 hover:bg-white/90"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate to-dos
        </Button>
      }
    />
  );
};

export default ToDosHeader;
