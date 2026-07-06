"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertTriangle, Target, ClipboardList, Lightbulb } from "lucide-react";
import type { TrainingManual } from "@/lib/training-content";
import TrainingWorkflowDoodle from "@/components/docs/training-doodles/TrainingWorkflowDoodle";

interface TrainingManualPanelProps {
  manual: TrainingManual;
}

function SectionList({
  icon: Icon,
  title,
  items,
  ordered,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";
  const listClass = ordered
    ? "list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground"
    : "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-700" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ListTag className={listClass}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

const TrainingManualPanel: React.FC<TrainingManualPanelProps> = ({ manual }) => {
  const Icon = manual.icon;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-50 p-2.5 text-cyan-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{manual.title}</CardTitle>
                <CardDescription className="mt-1">{manual.description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{manual.category}</Badge>
              <Badge variant="outline">~{manual.estimatedMinutes} min</Badge>
              {manual.audience.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 border-t pt-4">
          <Button asChild size="sm" className="rounded-full">
            <Link to={manual.href}>
              Open in app
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <TrainingWorkflowDoodle manualId={manual.id} title={manual.title} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Learning objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionList icon={Target} title="After this module you should be able to" items={manual.objectives} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Before you start</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionList icon={CheckCircle2} title="Checklist" items={manual.beforeYouStart} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step-by-step procedures</CardTitle>
          <CardDescription>Follow in order during training or live work.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {manual.procedures.map((procedure, index) => (
            <div key={procedure.title} className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-semibold">
                {index + 1}. {procedure.title}
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {procedure.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border border-amber-200/60 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Common mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionList icon={AlertTriangle} title="Avoid these" items={manual.commonMistakes} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-cyan-200/60 bg-cyan-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Practice exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
              <p className="text-sm leading-relaxed text-muted-foreground">{manual.practiceExercise}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Trainer tip: complete the practice exercise in{" "}
            <Link to={manual.href} className="font-medium text-cyan-800 underline-offset-2 hover:underline">
              {manual.title}
            </Link>{" "}
            with the trainee watching, then let them repeat it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingManualPanel;
