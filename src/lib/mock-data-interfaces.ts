// Interfaces for Mock Data
export interface MockCompanyDetails {
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

export interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  salary: number;
  startDate: string;
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
  ibanNumber?: string; // Renamed from bankAccountNumber
  routingSwiftCode?: string; // Renamed from bankBranchCode
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
  // fathersName?: string; // Removed as requested
  // molId?: string; // Removed as requested
  permanentAddress?: string;
  paymentMode?: "Bank Transfer" | "Cash" | "Cheque";
}

export interface Loan {
  id: string;
  employeeId: string;
  loanAmount: number;
  repaymentAmount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  remainingBalance: number;
  status?: "active" | "completed";
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
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number };
  ytdGrossEarnings: number;
  ytdTotalDeductions: number;
}