import { SavingPlan } from "../mock-data-interfaces";

export const generateMockSavingPlans = (): SavingPlan[] => [
  {
    id: "SAV001",
    employeeId: "EMP001",
    amount: 200,
    frequency: "monthly",
    startDate: "2024-07-01",
    endDate: "2025-06-30",
    status: "active",
  },
  {
    id: "SAV002",
    employeeId: "EMP003",
    amount: 50,
    frequency: "weekly",
    startDate: "2024-07-15",
    status: "active",
  },
];