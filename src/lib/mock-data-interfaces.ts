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
  payeRates?: any[]; // Assuming an array of any for simplicity, could be more specific if needed
  companyBankName?: string;
  companyBankAccountNumber?: string;
  companyBankBranchCode?: string;
  companyBankAccountType?: string;
  companyBankSwiftCode?: string;
  companyBankIban?: string;
  // NEW: active tax year persisted in Supabase
  activeTaxYear?: number;
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
  fathersName?: string; // Added
  molId?: string; // Added
  permanentAddress?: string;
  paymentMode?: "Bank Transfer" | "Cash" | "Cheque";
  payFrequency?: "Monthly" | "Weekly" | "Bi-Weekly"; // New field
  standardDailyHours?: number; // Added for timesheet calculations
  ignoredIncompleteFields?: string[]; // New field to store intentionally blank fields
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
}

export interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  payDate: string; // Added payDate field
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number };
  ytdGrossEarnings: number;
  ytdTotalDeductions: number;
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
  showHourlyRate: boolean; // Added showHourlyRate
  sectionOrder: ("Earnings" | "Deductions")[];
  layoutSize: "Letter" | "A4" | "A5";
  earningsDeductionsLayout: "deductions-left-earnings-right" | "earnings-left-deductions-right";
  payslipLogoUrl?: string; // New field for payslip-specific logo
  payslipLogoWidth?: number; // New field for payslip logo width
  payslipLogoHeight?: number; // New field for payslip logo height
  payslipLogoFit?: "contain" | "cover" | "fill" | "none" | "scale-down"; // New field for payslip logo object-fit
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