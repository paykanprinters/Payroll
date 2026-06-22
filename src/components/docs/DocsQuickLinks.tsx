"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { DocsQuickLink } from "@/lib/docs-content";

interface DocsQuickLinksProps {
  title: string;
  description: string;
  links: DocsQuickLink[];
}

const DocsQuickLinks: React.FC<DocsQuickLinksProps> = ({ title, description, links }) => {
  if (links.length === 0) return null;

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
                className="group flex items-start gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug group-hover:text-cyan-800">
                    {link.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocsQuickLinks;
