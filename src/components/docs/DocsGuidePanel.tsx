"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "lucide-react";
import type { DocsGuide } from "@/lib/docs-content";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

interface DocsGuidePanelProps {
  guide: DocsGuide;
}

const DocsGuidePanel: React.FC<DocsGuidePanelProps> = ({ guide }) => {
  const [search, setSearch] = useState("");

  const filteredAccordions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guide.accordions;
    return guide.accordions.filter((section) => {
      const hay = [
        section.title,
        section.description,
        ...(section.bullets || []),
        ...(section.subsections?.flatMap((s) => [s.title, ...s.items]) || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [guide.accordions, search]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="rounded-xl border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{guide.title}</CardTitle>
            <CardDescription>{guide.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.intro}</p>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this guide…"
                className="pl-8"
                aria-label="Search documentation"
              />
            </div>

            {filteredAccordions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No topics match your search.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {filteredAccordions.map((section) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      {section.description && (
                        <p className="text-muted-foreground">{section.description}</p>
                      )}
                      {section.bullets && <BulletList items={section.bullets} />}
                      {section.subsections?.map((sub) => (
                        <div key={sub.title}>
                          <p className="mb-1 font-medium text-foreground">{sub.title}</p>
                          <BulletList items={sub.items} />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-xl border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {guide.workflowSteps.map((step, i) => (
                <li key={step.step} className="text-sm">
                  <span className="font-medium">
                    {i + 1}. {step.step}
                  </span>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {guide.sidebarCards.map((card) => (
          <Card key={card.title} className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={card.items} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocsGuidePanel;
