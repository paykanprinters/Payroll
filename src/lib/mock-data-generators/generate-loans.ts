import { Loan } from "../mock-data-interfaces";

export const generateMockLoans = (): Loan[] => [
  {
    id: "LOAN001",
    employeeId: "EMP001",
    loanAmount: 5000,
    repaymentAmount: 500,
    frequency: "monthly",
    startDate: "2024-07-01",
    remainingBalance: 4500, // Assuming one repayment already
    status: "active",
  },
  {
    id: "LOAN002",
    employeeId: "EMP002",
    loanAmount: 2000,
    repaymentAmount: 100,
    frequency: "weekly",
    startDate: "2024-07-08",
    remainingBalance: 1800, // Assuming two repayments already
    status: "active",
  },
];