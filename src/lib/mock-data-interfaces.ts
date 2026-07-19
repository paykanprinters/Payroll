// Interfaces for Mock Data
export interface MockCompanyDetails {
  id?: string; // Added 'id' property to match Supabase schema
  companyLegalName?: string;
  companyTradingName?: string;
  companyRegistrationNumber?: string;
  companyTaxNumber?: string;
  vatRegistrationNumber?: string;
  industry?: string;
  payeReferenceNumber?: string;
  uifReferenceNumber?: string;
  sdlReferenceNumber?: string;
  coidaRegistrationNumber?: string;
  physicalAddress?: string;
  postalAddress?: string;
  mainContactNumber?: string;
  alternativeContactNumber?: string;
  companyEmail?: string;
  companyWebsite?: string;
  bankName?: string;
  accountholdername?: string; // Corrected to match Supabase schema
  accountNumber?: string;
  branchCode?: string;
  accountType?: "Cheque" | "Savings" | "Business";
  logoUrl?: string;
  logoWidth?: number; // New field for logo width
  logoHeight?: number; // New field for logo height
  logoFit?: "contain" | "cover" | "fill" | "none" | "scale-down"; // New field for object-fit
  // New fields for tax and banking details, added to match usage in PayslipDesign.tsx
  taxYearStartMonth?: number;
  taxYearEndMonth?: number;
  uifThreshold?: number;
  sarsEfilingNumber?: string;
  payeThreshold?: number;
  sdlRate?: number;
  uifRate?: number;
  payeRates?: unknown[];
  companyBankName?: string;
  companyBankAccountNumber?: string;
  companyBankBranchCode?: string;
  companyBankAccountType?: string;
  companyBankSwiftCode?: string;
  companyBankIban?: string;
  // NEW: active tax year persisted in Supabase
  activeTaxYear?: number;
  biometricApiUrl?: string;
}

export interface MockEmployee {
  id: string; // Internal UUID, hidden from UI
  customEmployeeId: string; // New field for human-readable ID
  personalId?: string; // New field for external clock-in system ID
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  salary?: number; // Made optional as hourlyRate can also be a payment basis
  hourlyRate?: number; // New field
  startDate: string;
  /** Last day of employment; omit/undefined while currently employed. */
  terminationDate?: string;
  idNumber?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactAddress?: string; // New field
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  taxReferenceNumber?: string;
  uifNumber?: string; // New field
  bankName?: string;
  bankAccountHolder?: string;
  accountNumber?: string; // Renamed from ibanNumber
  branchCode?: string; // Renamed from routingSwiftCode
  bankAccountType?: "Cheque" | "Savings" | "Business";
  
  // New fields from screenshot
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  department?: string;
  workLocation?: string;
  dateOfConfirmation?: string;
  originCountry?: string;
  employmentType?: "Permanent" | "Contract" | "Temporary";
  portalAccess?: boolean;
  userId?: string;
  fathersName?: string; // Added
  molId?: string; // Added
  permanentAddress?: string;
  paymentMode?: "Bank Transfer" | "Cash" | "Cheque";
  payFrequency?: "Monthly" | "Weekly" | "Bi-Weekly"; // New field
  standardDailyHours?: number; // Added for timesheet calculations

  // Medical scheme (Section 6A tax credit, COMP-07)
  medicalAidMember?: boolean; // True when the employee is the principal medical-scheme member
  medicalAidDependants?: number; // Number of dependants (excluding the main member)

  // Retirement fund (Section 11F pre-tax deduction, COMP-08)
  retirementFundContributionPercent?: number; // Employee contribution as % of gross (pensionable) earnings
  retirementFundContributionFixed?: number; // Fixed employee contribution per pay period (Rands)

  ignoredIncompleteFields?: string[]; // New field to store intentionally blank fields

  /** Leave accrual overrides (optional — defaults follow BCEA-aligned policy). */
  leaveCycleStartDate?: string;
  leaveOpeningAnnualBalance?: number;
  leaveOpeningSickBalance?: number;
  leaveOpeningFamilyBalance?: number;
  annualLeaveEntitlementDays?: number;
}

export interface LoanDeductionHistoryEntry {
  date: string; // YYYY-MM-DD
  amount: number;
  type: "deduction" | "manual" | "pause"; // 'pause' indicates a skipped deduction
  notes?: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  loanType: "Personal" | "Emergency" | "Education" | "Other"; // New field
  loanAmount: number;
  repaymentAmount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  remainingBalance: number;
  status: "active" | "completed";
  paused: boolean; // New field
  notes?: string; // New field
  deductionHistory: LoanDeductionHistoryEntry[]; // New field

  // Optional: advanced freeze controls
  freezeMode?: "range" | "cycles" | null;
  freezeStartDate?: string | null; // YYYY-MM-DD
  freezeEndDate?: string | null; // YYYY-MM-DD
  freezeCyclesRemaining?: number | null;
}

export interface SavingPlan {
  id: string;
  employeeId: string;
  amount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  endDate?: string;
  status: "active" | "completed";
}

export interface LeaveEntry {
  id: string;
  employeeId: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Family Responsibility Leave" | "Maternity Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays: number;
  reason?: string;
  documentUrl?: string;
  status?: "Pending" | "Approved" | "Rejected" | "Cancelled";
  submittedAt?: string;
  submittedByUserId?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  rejectionReason?: string;
  source?: "admin" | "staff";
}

export interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  payDate: string; // Added payDate field
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  /**
   * Employer-paid Skills Development Levy (1% of leviable remuneration).
   * This is an EMPLOYER cost for statutory reporting only — it is NOT deducted
   * from the employee and is excluded from totalDeductions / netPay.
   */
  employerSdl?: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number; family?: number };
  ytdGrossEarnings: number;
  ytdTotalDeductions: number;

  // Snapshot branding for RLS-safe rendering
  companyName?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm
  teaStart?: string; // HH:mm
  teaEnd?: string; // HH:mm
  lunchStart?: string; // HH:mm
  lunchEnd?: string; // HH:mm
  timeOut: string; // HH:mm
  totalWorkHours: number; // Calculated
  overtimeHours: number; // Calculated
  lateArrival: boolean; // Calculated
  earlyDeparture: boolean; // Calculated
  absent: boolean; // Calculated
  status: "Draft" | "Submitted" | "Approved" | "Locked";
  submittedBy?: string;
  submittedAt?: string; // ISO string
  approvedBy?: string;
  approvedAt?: string; // ISO string
  auditLog?: { action: string; timestamp: string; user: string; captureMethod: "Manual" | "Biometric" | "Imported" | "System" }[];
}

export interface PayslipDesignSettings {
  showCompanyLogo: boolean;
  showCompanyDetails: boolean;
  showEmployeeDetails: boolean;
  showEarningsBreakdown: boolean;
  showDeductionsBreakdown: boolean;
  showLeaveSummary: boolean;
  showBankDetails: boolean;
  showYTD: boolean;
  showHourlyRate: boolean; // existing
  // NEW visibility toggles
  showEmployeeIdNumber?: boolean;
  showEmployeeTaxRefNumber?: boolean;
  showEmployeeAddress?: boolean;

  sectionOrder: ("Earnings" | "Deductions")[];
  layoutSize: "Letter" | "A4" | "A5";
  earningsDeductionsLayout: "deductions-left-earnings-right" | "earnings-left-deductions-right";
  payslipLogoUrl?: string;
  payslipLogoWidth?: number;
  payslipLogoHeight?: number;
  payslipLogoFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export interface ToDoEntry {
  id: string;
  message: string;
  level: "critical" | "warning" | "info";
  module: string; // e.g., 'Employees', 'Timesheet', 'Payslips'
  actionUrl?: string; // Optional link to resolve the to-do
  status: "pending" | "done";
  assignedTo?: string; // Mock user role/ID
  employeeId?: string; // New: Link to specific employee
  relatedField?: string; // New: Link to specific field (e.g., 'personalId')
  createdAt?: string; // Added for Supabase
  updatedAt?: string; // Added for Supabase
}