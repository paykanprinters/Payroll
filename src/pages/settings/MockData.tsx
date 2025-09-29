"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { eachDayOfInterval, isWeekend } from "date-fns";

// Define mock data structures
interface MockCompanyDetails {
  companyLegalName: string;
  companyTradingName: string;
  companyRegistrationNumber: string;
  companyTaxNumber: string;
  vatRegistrationNumber: string;
  industry: string;
  payeReferenceNumber: string;
  uifReferenceNumber: string;
  sdlReferenceNumber: string;
  coidaRegistrationNumber: string;
  physicalAddress: string;
  postalAddress: string;
  mainContactNumber: string;
  alternativeContactNumber: string;
  companyEmail: string;
  companyWebsite: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branchCode: string;
  accountType: "Cheque" | "Savings" | "Business";
  logoUrl: string;
  logoSize: number;
}

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  salary: number;
  startDate: string;
  // New fields
  idNumber?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  taxReferenceNumber?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  bankAccountType?: "Cheque" | "Savings" | "Business";
}

interface Loan {
  id: string;
  employeeId: string;
  loanAmount: number;
  repaymentAmount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  remainingBalance: number;
}

interface SavingPlan {
  id: string;
  employeeId: string;
  amount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  endDate?: string;
  status: "active" | "completed";
}

interface LeaveEntry {
  id: string;
  employeeId: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Family Responsibility Leave" | "Maternity Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays: number;
  reason?: string;
  documentUrl?: string;
}

// Helper to calculate working days (excluding weekends)
const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const days = eachDayOfInterval({ start, end });
  for (const day of days) {
    if (!isWeekend(day)) {
      count++;
    }
  }
  return count;
};

interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number }; // Added leave summary
}

// Mock data generation functions
const generateMockCompanyDetails = (): MockCompanyDetails => ({
  companyLegalName: "Acme Corp (Pty) Ltd",
  companyTradingName: "Acme Payroll Solutions",
  companyRegistrationNumber: "2023/123456/07",
  companyTaxNumber: "9876543210",
  vatRegistrationNumber: "4000123456",
  industry: "Software & Payroll Services",
  payeReferenceNumber: "7000123456",
  uifReferenceNumber: "0123456/7",
  sdlReferenceNumber: "L123456789",
  coidaRegistrationNumber: "9876543210",
  physicalAddress: "123 Tech Park, Innovation Hub, Johannesburg, 2000",
  postalAddress: "PO Box 123, Business Centre, 2001",
  mainContactNumber: "+27 11 123 4567",
  alternativeContactNumber: "+27 87 654 3210",
  companyEmail: "info@acmecorp.co.za",
  companyWebsite: "https://www.acmecorp.co.za",
  bankName: "FNB",
  accountHolderName: "Acme Corp (Pty) Ltd",
  accountNumber: "62001234567",
  branchCode: "250655",
  accountType: "Business",
  logoUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?text=ACME", // Placeholder logo
  logoSize: 50,
});

const generateMockEmployees = (): MockEmployee[] => [
  {
    id: "EMP001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@acmecorp.co.za",
    jobTitle: "Software Engineer",
    salary: 45000,
    startDate: "2022-01-15",
    idNumber: "9001015000087",
    phoneNumber: "0821234567",
    emergencyContactName: "Jane Doe",
    emergencyContactNumber: "0729876543",
    addressLine1: "15 Tech Street",
    addressLine2: "Unit 10",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2001",
    taxReferenceNumber: "1234567890",
    bankName: "FNB",
    bankAccountHolder: "John Doe",
    bankAccountNumber: "62000000001",
    bankBranchCode: "250655",
    bankAccountType: "Cheque",
  },
  {
    id: "EMP002",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@acmecorp.co.za",
    jobTitle: "HR Manager",
    salary: 38000,
    startDate: "2021-03-01",
    idNumber: "8505055000088",
    phoneNumber: "0712345678",
    emergencyContactName: "John Smith",
    emergencyContactNumber: "0831234567",
    addressLine1: "22 Oak Avenue",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    taxReferenceNumber: "0987654321",
    bankName: "Standard Bank",
    bankAccountHolder: "Jane Smith",
    bankAccountNumber: "07000000002",
    bankBranchCode: "051001",
    bankAccountType: "Savings",
  },
  {
    id: "EMP003",
    firstName: "Peter",
    lastName: "Jones",
    email: "peter.jones@acmecorp.co.za",
    jobTitle: "Accountant",
    salary: 32000,
    startDate: "2023-07-20",
    idNumber: "9203035000089",
    phoneNumber: "0601112233",
    emergencyContactName: "Mary Jones",
    emergencyContactNumber: "0769998877",
    addressLine1: "789 Finance Street",
    city: "Durban",
    province: "KwaZulu-Natal",
    postalCode: "4001",
    taxReferenceNumber: "1122334455",
    bankName: "Absa",
    bankAccountHolder: "Peter Jones",
    bankAccountNumber: "90000000003",
    bankBranchCode: "632005",
    bankAccountType: "Cheque",
  },
  {
    id: "EMP004",
    firstName: "Sarah",
    lastName: "Brown",
    email: "sarah.brown@acmecorp.co.za",
    jobTitle: "Marketing Specialist",
    salary: 28000,
    startDate: "2022-11-10",
    idNumber: "9507075000090",
    phoneNumber: "0845556677",
    emergencyContactName: "David Brown",
    emergencyContactNumber: "0612223344",
    addressLine1: "321 Creative Lane",
    city: "Pretoria",
    province: "Gauteng",
    postalCode: "0001",
    taxReferenceNumber: "2233445566",
    bankName: "Nedbank",
    bankAccountHolder: "Sarah Brown",
    bankAccountNumber: "10000000004",
    bankBranchCode: "198765",
    bankAccountType: "Savings",
  },
  {
    id: "EMP005",
    firstName: "David",
    lastName: "Green",
    email: "david.green@acmecorp.co.za",
    jobTitle: "Operations Manager",
    salary: 40000,
    startDate: "2021-05-01",
    idNumber: "8802025000091",
    phoneNumber: "0798889900",
    emergencyContactName: "Emily Green",
    emergencyContactNumber: "0827776655",
    addressLine1: "65 Industrial Park",
    city: "Port Elizabeth",
    province: "Eastern Cape",
    postalCode: "6001",
    taxReferenceNumber: "3344556677",
    bankName: "Capitec",
    bankAccountHolder: "David Green",
    bankAccountNumber: "45000000005",
    bankBranchCode: "470010",
    bankAccountType: "Cheque",
  },
  {
    id: "EMP006",
    firstName: "Emily",
    lastName: "White",
    email: "emily.white@acmecorp.co.za",
    jobTitle: "Customer Support",
    salary: 25000,
    startDate: "2023-02-28",
    idNumber: "9810105000092",
    phoneNumber: "0671112233",
    emergencyContactName: "Michael White",
    emergencyContactNumber: "0743334455",
    addressLine1: "101 Help Desk Road",
    city: "Bloemfontein",
    province: "Free State",
    postalCode: "9301",
    taxReferenceNumber: "4455667788",
    bankName: "FNB",
    bankAccountHolder: "Emily White",
    bankAccountNumber: "62000000006",
    bankBranchCode: "250655",
    bankAccountType: "Savings",
  },
];

const generateMockLoans = (): Loan[] => [
  {
    id: "LOAN001",
    employeeId: "EMP001",
    loanAmount: 5000,
    repaymentAmount: 500,
    frequency: "monthly",
    startDate: "2024-07-01",
    remainingBalance: 4500, // Assuming one repayment already
  },
  {
    id: "LOAN002",
    employeeId: "EMP002",
    loanAmount: 2000,
    repaymentAmount: 100,
    frequency: "weekly",
    startDate: "2024-07-08",
    remainingBalance: 1800, // Assuming two repayments already
  },
];

const generateMockSavingPlans = (): SavingPlan[] => [
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

const generateMockLeaveRecords = (): LeaveEntry[] => [
  {
    id: "LEAVE001",
    employeeId: "EMP001",
    leaveType: "Annual Leave",
    startDate: "2024-08-05",
    endDate: "2024-08-09",
    totalDays: 5,
    workingDays: 5,
    reason: "Summer vacation",
    documentUrl: undefined,
  },
  {
    id: "LEAVE002",
    employeeId: "EMP002",
    leaveType: "Sick Leave",
    startDate: "2024-07-22",
    endDate: "2024-07-23",
    totalDays: 2,
    workingDays: 2,
    reason: "Flu",
    documentUrl: "data:application/pdf;base64,JVBERi0xLjQKJcOvxo... (mock base64 PDF)", // Mock document
  },
];

const generateMockPayslips = (employees: MockEmployee[], loans: Loan[], savingPlans: SavingPlan[], leaveRecords: LeaveEntry[]): MockPayslip[] => {
  const payslips: MockPayslip[] = [];
  const payPeriod = "2024-07-01 - 2024-07-31"; // Current mock pay period
  const currentMonth = "2024-07"; // For monthly deductions
  const currentWeekStart = "2024-07-01"; // Simplified for weekly deductions

  employees.forEach(emp => {
    let grossEarnings = emp.salary;
    let totalDeductions = 0;
    const earningsBreakdown = [{ name: "Basic Salary", amount: emp.salary }];
    const deductionsBreakdown: { name: string; amount: number }[] = [];

    // Statutory Deductions (simplified)
    const paye = grossEarnings * 0.15; // Simplified PAYE
    const uif = Math.min(grossEarnings * 0.01, 177.12); // Simplified UIF cap
    const sdl = grossEarnings * 0.01; // Simplified SDL
    const providentFund = grossEarnings * 0.075; // Simplified Provident Fund

    if (localStorage.getItem('applyPAYE') === 'true') {
      deductionsBreakdown.push({ name: "PAYE", amount: paye });
      totalDeductions += paye;
    }
    deductionsBreakdown.push({ name: "UIF", amount: uif });
    totalDeductions += uif;
    if (localStorage.getItem('applySDL') === 'true') {
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
    deductionsBreakdown.push({ name: "Provident Fund", amount: providentFund });
    totalDeductions += providentFund;

    // Loan Deductions
    const employeeLoans = loans.filter(loan => loan.employeeId === emp.id);
    employeeLoans.forEach(loan => {
      let deductionAmount = 0;
      if (loan.status !== "completed" && loan.startDate.substring(0, 7) <= currentMonth) {
        if (loan.frequency === "monthly") {
          deductionAmount = Math.min(loan.repaymentAmount, loan.remainingBalance);
        } else if (loan.frequency === "weekly") {
          // Assuming 4 weeks in a month for weekly deductions for simplicity
          deductionAmount = Math.min(loan.repaymentAmount * 4, loan.remainingBalance);
        }
      }

      if (deductionAmount > 0) {
        deductionsBreakdown.push({ name: `Loan Repayment (${loan.id})`, amount: deductionAmount });
        totalDeductions += deductionAmount;
      }
    });

    // Savings Deductions
    const employeeSavingPlans = savingPlans.filter(plan => plan.employeeId === emp.id);
    employeeSavingPlans.forEach(plan => {
      let deductionAmount = 0;
      if (plan.status === "active" && plan.startDate.substring(0, 7) <= currentMonth) {
        if (!plan.endDate || plan.endDate >= currentMonth) { // Check if plan is still active
          if (plan.frequency === "monthly") {
            deductionAmount = plan.amount;
          } else if (plan.frequency === "weekly") {
            // Assuming 4 weeks in a month for weekly deductions for simplicity
            deductionAmount = plan.amount * 4;
          }
        }
      }

      if (deductionAmount > 0) {
        deductionsBreakdown.push({ name: `Savings (${plan.id})`, amount: deductionAmount });
        totalDeductions += deductionAmount;
      }
    });

    // Leave Summary (simplified for mock)
    let annualLeaveTaken = 0;
    let sickLeaveTaken = 0;
    let unpaidLeaveTaken = 0;

    const employeeLeave = leaveRecords.filter(rec => rec.employeeId === emp.id);
    employeeLeave.forEach(rec => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      const periodStart = new Date(payPeriod.split(' - ')[0]);
      const periodEnd = new Date(payPeriod.split(' - ')[1]);

      // Only count leave within the current pay period
      if (leaveStart <= periodEnd && leaveEnd >= periodStart) {
        const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
        const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
        const daysInPeriod = calculateWorkingDays(overlapStart, overlapEnd);

        if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInPeriod;
        else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInPeriod;
        else if (rec.leaveType === "Unpaid Leave") unpaidLeaveTaken += daysInPeriod;
      }
    });

    const netPay = grossEarnings - totalDeductions;

    payslips.push({
      id: `PS-${emp.id}-202407`,
      employeeId: emp.id,
      payPeriod: payPeriod,
      grossEarnings: grossEarnings,
      totalDeductions: totalDeductions,
      netPay: netPay,
      earningsBreakdown: earningsBreakdown,
      deductionsBreakdown: deductionsBreakdown,
      leaveSummary: {
        annual: 20 - annualLeaveTaken, // Mock total annual leave 20 days
        sick: 10 - sickLeaveTaken,   // Mock total sick leave 10 days
        unpaid: unpaidLeaveTaken,
      },
    });
  });
  return payslips;
};

const MockData: React.FC = () => {
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  const applyMockData = () => {
    const mockCompany = generateMockCompanyDetails();
    const mockEmployees = generateMockEmployees();
    const mockLoans = generateMockLoans();
    const mockSavingPlans = generateMockSavingPlans();
    const mockLeaveRecords = generateMockLeaveRecords(); // Generate mock leave records
    const mockPayslips = generateMockPayslips(mockEmployees, mockLoans, mockSavingPlans, mockLeaveRecords); // Pass leave records to payslip generation

    // Save company details
    Object.entries(mockCompany).forEach(([key, value]) => {
      localStorage.setItem(key, String(value));
    });
    localStorage.setItem("isMockDataEnabled", "true");
    localStorage.setItem("mockEmployees", JSON.stringify(mockEmployees));
    localStorage.setItem("mockLoans", JSON.stringify(mockLoans));
    localStorage.setItem("mockSavingPlans", JSON.stringify(mockSavingPlans));
    localStorage.setItem("mockLeaveRecords", JSON.stringify(mockLeaveRecords)); // Save mock leave records
    localStorage.setItem("mockPayslips", JSON.stringify(mockPayslips));
    localStorage.setItem("applyPAYE", "true"); // Enable PAYE for mock data
    localStorage.setItem("applySDL", "true"); // Enable SDL for mock data

    // Dispatch events to update components
    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('mockDataUpdated')); // Generic event for other components
    console.log("MockData: Dispatched 'mockDataUpdated' event.");
    showSuccess("Mock data populated successfully!");
  };

  const clearMockData = () => {
    // Clear company details
    const mockCompany = generateMockCompanyDetails(); // Use schema to get keys
    Object.keys(mockCompany).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem("isMockDataEnabled");
    localStorage.removeItem("mockEmployees");
    localStorage.removeItem("mockLoans");
    localStorage.removeItem("mockSavingPlans");
    localStorage.removeItem("mockLeaveRecords"); // Clear mock leave records
    localStorage.removeItem("mockPayslips");
    localStorage.removeItem("applyPAYE");
    localStorage.removeItem("applySDL");

    // Dispatch events to update components
    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('mockDataUpdated')); // Generic event for other components
    console.log("MockData: Dispatched 'mockDataUpdated' event (cleared).");
    showSuccess("Mock data cleared successfully!");
  };

  useEffect(() => {
    if (isMockDataEnabled) {
      applyMockData();
    } else {
      clearMockData();
    }
  }, [isMockDataEnabled]); // Only run when isMockDataEnabled changes

  const handleToggleChange = (checked: boolean) => {
    setIsMockDataEnabled(checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mock Data</CardTitle>
        <CardDescription>
          Enable this switch to populate the entire system with sample data for testing and review purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="mock-data-toggle">Enable Mock Data</Label>
          <Switch
            id="mock-data-toggle"
            checked={isMockDataEnabled}
            onCheckedChange={handleToggleChange}
          />
        </div>
        <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
          <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
          <p className="text-sm">
            Enabling mock data will overwrite certain `localStorage` values for company details, employees, and payslips. Disabling it will clear this mock data. This is for front-end demonstration only and does not interact with any real backend or database.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MockData;