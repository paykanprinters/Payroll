import { createContext } from "react";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

export type StaffPortalContextValue = {
  employee: MockEmployee;
  basePath: string;
};

export const StaffPortalContext = createContext<StaffPortalContextValue | null>(null);
