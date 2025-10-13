import { Loan } from "../mock-data-interfaces";
import { format, subDays } from "date-fns";

export const generateMockLoans = (): Loan[] => [
  {
    id: "LOAN001",
    employeeId: "EMP001",
    loanType: "Personal", // New field
    loanAmount: 5000,
    repaymentAmount: 500,
    frequency: "monthly",
    startDate: "2024-07-01",
    remainingBalance: 4500, // Assuming one repayment already
    status: "active",
    paused: false, // New field
    notes: "Initial personal loan for home improvements.", // New field
    deductionHistory: [ // New field
      { date: "2024-07-25", amount: 500, type: "deduction", notes: "Monthly payroll deduction" }
    ],
  },
  {
    id: "LOAN002",
    employeeId: "EMP002",
    loanType: "Emergency", // New field
    loanAmount: 2000,
    repaymentAmount: 100,
    frequency: "weekly",
    startDate: "2024-07-08",
    remainingBalance: 1800, // Assuming two repayments already
    status: "active",
    paused: false, // New field
    notes: "Emergency medical expense loan.", // New field
    deductionHistory: [ // New field
      { date: "2024-07-12", amount: 100, type: "deduction", notes: "Weekly payroll deduction" },
      { date: "2024-07-19", amount: 100, type: "deduction", notes: "Weekly payroll deduction" }
    ],
  },
  {
    id: "LOAN003",
    employeeId: "EMP003",
    loanType: "Education", // New field
    loanAmount: 10000,
    repaymentAmount: 1000,
    frequency: "monthly",
    startDate: "2024-08-01",
    remainingBalance: 10000,
    status: "active",
    paused: false, // New field
    notes: "Loan for employee's child's university fees.", // New field
    deductionHistory: [], // New field
  },
  {
    id: "LOAN004",
    employeeId: "EMP004",
    loanType: "Personal", // New field
    loanAmount: 1500,
    repaymentAmount: 150,
    frequency: "weekly",
    startDate: "2024-07-01",
    remainingBalance: 1050, // Assuming 3 repayments
    status: "active",
    paused: true, // This loan is paused
    notes: "Small personal loan, deduction temporarily paused.", // New field
    deductionHistory: [ // New field
      { date: "2024-07-05", amount: 150, type: "deduction", notes: "Weekly payroll deduction" },
      { date: "2024-07-12", amount: 150, type: "deduction", notes: "Weekly payroll deduction" },
      { date: "2024-07-19", amount: 150, type: "deduction", notes: "Weekly payroll deduction" },
      { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), amount: 0, type: "pause", notes: "Deduction paused manually" }
    ],
  },
];