"use client";

import React from "react";
import { FileText, Sparkles } from "lucide-react";

const ReportsHeader: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-r from-sky-300 via-indigo-400 to-fuchsia-500 text-white">
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="rounded-xl bg-white/20 p-3">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">Payroll Reports & Analytics</h1>
            <p className="text-white/85 text-sm">
              Generate polished reports with a fresher, retro-funk perspective
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-5 w-5 text-white/90" />
          <span className="text-white/85">Quick setup, clean previews, easy exports</span>
        </div>
      </div>
    </div>
  );
};

export default ReportsHeader;