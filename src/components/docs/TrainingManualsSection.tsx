"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, GraduationCap } from "lucide-react";
import TrainingManualPanel from "@/components/docs/TrainingManualPanel";
import {
  ALL_TRAINING_MANUALS,
  filterTrainingManuals,
  getDefaultTrainingManualId,
  getTrainingCategories,
  type TrainingManual,
} from "@/lib/training-content";

interface TrainingManualsSectionProps {
  role?: string;
}

const TrainingManualsSection: React.FC<TrainingManualsSectionProps> = ({ role }) => {
  const manuals = useMemo(() => filterTrainingManuals(ALL_TRAINING_MANUALS, role), [role]);
  const categories = useMemo(() => getTrainingCategories(manuals), [manuals]);

  const [selectedId, setSelectedId] = useState(() => getDefaultTrainingManualId(role));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredManuals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return manuals.filter((m) => {
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = [
        m.title,
        m.description,
        m.category,
        ...m.objectives,
        ...m.procedures.flatMap((p) => [p.title, ...p.steps]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [manuals, search, categoryFilter]);

  const selectedManual = useMemo(
    () => manuals.find((m) => m.id === selectedId) ?? filteredManuals[0] ?? manuals[0],
    [manuals, selectedId, filteredManuals]
  );

  React.useEffect(() => {
    if (selectedManual && selectedManual.id !== selectedId) {
      setSelectedId(selectedManual.id);
    }
  }, [selectedManual, selectedId]);

  const renderManualButton = (manual: TrainingManual) => {
    const Icon = manual.icon;
    const isActive = selectedManual?.id === manual.id;
    return (
      <button
        key={manual.id}
        type="button"
        onClick={() => setSelectedId(manual.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
          isActive ? "border-cyan-300 bg-cyan-50/80" : "bg-background hover:bg-muted/50"
        )}
      >
        <div className={cn("rounded-lg p-2", isActive ? "bg-cyan-100 text-cyan-800" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{manual.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{manual.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              {manual.estimatedMinutes} min
            </Badge>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-cyan-200/50 bg-cyan-50/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-cyan-800" />
            <CardTitle className="text-base">Training manuals</CardTitle>
          </div>
          <CardDescription>
            Module-by-module guides for trainers and learners. Use during onboarding, then keep
            Reference guides for day-to-day lookup.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <Card className="rounded-xl border lg:sticky lg:top-4 lg:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modules</CardTitle>
            <CardDescription>{manuals.length} manuals for your role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search manuals…"
                className="pl-8"
                aria-label="Search training manuals"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  categoryFilter === "all" ? "bg-cyan-100 text-cyan-900" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    categoryFilter === cat
                      ? "bg-cyan-100 text-cyan-900"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto pr-1">
              {filteredManuals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No manuals match your search.</p>
              ) : (
                filteredManuals.map(renderManualButton)
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          {selectedManual ? (
            <TrainingManualPanel manual={selectedManual} />
          ) : (
            <Card className="rounded-xl border">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Select a training module from the list.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingManualsSection;
