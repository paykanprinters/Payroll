"use client";

import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import InformationOfficerCard from "@/components/settings/popia/InformationOfficerCard";
import DataSubjectRequestsCard from "@/components/settings/popia/DataSubjectRequestsCard";
import ConsentManagerCard from "@/components/settings/popia/ConsentManagerCard";
import PrivacyPolicyManagerCard from "@/components/settings/popia/PrivacyPolicyManagerCard";
import BreachRegisterCard from "@/components/settings/popia/BreachRegisterCard";
import ProcessingRegisterCard from "@/components/settings/popia/ProcessingRegisterCard";

const PrivacyCompliance: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === "Admin" || user?.role === "Manager";

  if (!isManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy &amp; POPIA</CardTitle>
          <CardDescription>Only admins and managers can view POPIA compliance tools.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Privacy &amp; POPIA
          </CardTitle>
          <CardDescription>
            Tools to meet your Protection of Personal Information Act obligations: appoint an Information Officer, manage
            consent, publish a privacy notice, fulfil data-subject requests, and keep breach and processing registers.
            Registering your Information Officer with the Information Regulator and finalising legal wording remain your
            responsibility.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="officer" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="officer">Officer &amp; retention</TabsTrigger>
          <TabsTrigger value="dsar">Data requests</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="notice">Privacy notice</TabsTrigger>
          <TabsTrigger value="breach">Breach register</TabsTrigger>
          <TabsTrigger value="processing">Processing register</TabsTrigger>
        </TabsList>

        <TabsContent value="officer">
          <InformationOfficerCard />
        </TabsContent>
        <TabsContent value="dsar">
          <DataSubjectRequestsCard />
        </TabsContent>
        <TabsContent value="consent">
          <ConsentManagerCard />
        </TabsContent>
        <TabsContent value="notice">
          <PrivacyPolicyManagerCard />
        </TabsContent>
        <TabsContent value="breach">
          <BreachRegisterCard />
        </TabsContent>
        <TabsContent value="processing">
          <ProcessingRegisterCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivacyCompliance;
