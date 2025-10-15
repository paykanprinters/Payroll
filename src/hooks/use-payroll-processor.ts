"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isSameDay,
} from "date-fns";
import {
  MockEmployee,
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
  MockCompanyDetails,
  ToDoEntry, // Import ToDoEntry
} from "@/lib/mock-data-interfaces";
import { generatePayslipsForPeriod } from "@/lib/mock-data-generators";
import { showError, showSuccess } from "@/utils/toast";
import { useCompanyDetails } from "./use-company-details";
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

// Define interfaces for fetched tax data
interface TaxBracketPAYE {
  min_income: number;
  max_income: number | null;
  rate: number;
  deduction: number;
}

interface TaxRatesUIFSDL {
  uif_rate: number;
  uif_cap: number;
  sdl_rate: number;
}

export interface TaxTables {
  payeBrackets: TaxBracketPAYE[];
  uifSdlRates: TaxRatesUIFSDL | null;
}

export const usePayrollProcessor = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [toDos, setToDos] = useState<ToDoEntry[]>([]); // Add toDos state
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(false);
  const [taxTables, setTaxTables] = useState<TaxTables | null>(null); // New state for tax tables
  const [isLoadingTaxTables, setIsLoadingTaxTables] = useState<boolean>(false); // Loading state for tax tables

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails();

  // Load mock data from localStorage for company details
  const getMockCompanyDetailsFromLocalStorage = useCallback((): MockCompanyDetails | null => {
    if (!isMockDataEnabled) return null; // Only return mock details if enabled
    const mockCompanyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
    const mockCompanyTradingName = localStorage.getItem('companyTradingName') || "";
    const mockCompanyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
    const mockCompanyTaxNumber = localStorage.getItem('companyTaxNumber') || "";
    const mockVatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
    const mockIndustry = localStorage.getItem('industry') || "";
    const mockPayeReferenceNumber = localStorage.getItem('payeReferenceNumber') || "";
    const mockUifReferenceNumber = localStorage.getItem('uifReferenceNumber') || "";
    const mockSdlReferenceNumber = localStorage.getItem('sdlReferenceNumber') || "";
    const mockCoidaRegistrationNumber = localStorage.getItem('coidaRegistrationNumber') || "";
    const mockPhysicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
    const mockPostalAddress = localStorage.getItem('postalAddress') || "PO Box 123, Business Centre, 2001";
    const mockMainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
    const mockAlternativeContactNumber = localStorage.getItem('alternativeContactNumber') || "";
    const mockCompanyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
    const mockCompanyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
    const mockBankName = localStorage.getItem('bankName') || "";
    const mockAccountholdername = localStorage.getItem('accountholdername') || "";
    const mockAccountNumber = localStorage.getItem('accountNumber') || "";
    const mockBranchCode = localStorage.getItem('branchCode') || "";
    const mockAccountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
    const mockLogoUrl = localStorage.getItem('companyLogoUrl') || '';
    const mockLogoWidth = parseFloat(localStorage.getItem('companyLogoWidth') || '100');
    const mockLogoHeight = parseFloat(localStorage.getItem('companyLogoHeight') || '50');
    const mockLogoFit = (localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || "contain";

    console.log("usePayrollProcessor: getMockCompanyDetailsFromLocalStorage - isMockDataEnabled:", isMockDataEnabled);
    if (isMockDataEnabled) {
      const mockDetails = {
        companyLegalName: mockCompanyLegalName, companyTradingName: mockCompanyTradingName, companyRegistrationNumber: mockCompanyRegistrationNumber,
        companyTaxNumber: mockCompanyTaxNumber, vatRegistrationNumber: mockVatRegistrationNumber, industry: mockIndustry,
        payeReferenceNumber: mockPayeReferenceNumber, uifReferenceNumber: mockUifReferenceNumber, sdlReferenceNumber: mockSdlReferenceNumber,
        coidaRegistrationNumber: mockCoidaRegistrationNumber, physicalAddress: mockPhysicalAddress, postalAddress: mockPostalAddress, mainContactNumber: mockMainContactNumber, alternativeContactNumber: mockAlternativeContactNumber,
        companyEmail: mockCompanyEmail, companyWebsite: mockCompanyWebsite, bankName: mockBankName, accountholdername: mockAccountholdername, accountNumber: mockAccountNumber,
        branchCode: mockBranchCode, accountType: mockAccountType, logoUrl: mockLogoUrl, logoWidth: mockLogoWidth, logoHeight: mockLogoHeight, logoFit: mockLogoFit,
      };
      console.log("usePayrollProcessor: Returning mock company details:", mockDetails);
      return mockDetails;
    }
    console.log("usePayrollProcessor: Mock data not enabled, returning null for mock details.");
    return null;
  }, [isMockDataEnabled]); // Dependency on isMockDataEnabled

  // Derived state for companyDetails: always reflects the correct source
  const companyDetails = useMemo(() => {
    console.log("usePayrollProcessor: Recalculating derived companyDetails. isMockDataEnabled:", isMockDataEnabled, "supabaseCompanyDetails:", supabaseCompanyDetails);
    if (isMockDataEnabled) {
      const mockDetails = getMockCompanyDetailsFromLocalStorage();
      console.log("usePayrollProcessor: Derived companyDetails (mock):", mockDetails);
      return mockDetails;
    }
    console.log("usePayrollProcessor: Derived companyDetails (Supabase):", supabaseCompanyDetails);
    return supabaseCompanyDetails;
  }, [isMockDataEnabled, supabaseCompanyDetails, getMockCompanyDetailsFromLocalStorage]);


  // Effect for initial load and when mock data is toggled (full re-parse)
  useEffect(() => {
    const handleAllMockDataUpdate = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: handleAllMockDataUpdate triggered. mockEnabled:", mockEnabled);

      if (mockEnabled) {
        setEmployees(JSON.parse(localStorage.getItem("mockEmployees") || "[]"));
        setPayslips(JSON.parse(localStorage.getItem("mockPayslips") || "[]"));
        setLoans(JSON.parse(localStorage.getItem("mockLoans") || "[]"));
        setSavingPlans(JSON.parse(localStorage.getItem("mockSavingPlans") || "[]"));
        setLeaveRecords(JSON.parse(localStorage.getItem("mockLeaveRecords") || "[]"));
        setTimesheets(JSON.parse(localStorage.getItem("mockTimesheets") || "[]"));
        setToDos(JSON.parse(localStorage.getItem("mockToDos") || "[]"));
        console.log("usePayrollProcessor: Mock data loaded from localStorage.");
      } else {
        // Clear all mock data if mock data is not enabled
        setEmployees([]);
        setPayslips([]);
        setLoans([]);
        setSavingPlans([]);
        setLeaveRecords([]);
        setTimesheets([]);
        setToDos([]);
        console.log("usePayrollProcessor: Mock data cleared.");
      }
    };

    // Initial load
    handleAllMockDataUpdate();

    window.addEventListener("allMockDataUpdated", handleAllMockDataUpdate);
    window.addEventListener("companyDetailsUpdated", refetchCompanyDetails);
    return () => {
      window.removeEventListener("allMockDataUpdated", handleAllMockDataUpdate);
      window.removeEventListener("companyDetailsUpdated", refetchCompanyDetails);
    };
  }, [refetchCompanyDetails]); // Removed supabaseCompanyDetails from dependencies here, as companyDetails is now derived.

  // Fetch tax tables based on the current year or a selected year
  const fetchTaxTables = useCallback(async (year: number) => {
    setIsLoadingTaxTables(true);
    try {
      const { data: payeData, error: payeError } = await supabase
        .from('tax_brackets_paye')
        .select('*')
        .eq('tax_year', year)
        .order('min_income', { ascending: true });

      const { data: uifSdlData, error: uifSdlError } = await supabase
        .from('tax_rates_uif_sdl')
        .select('*')
        .eq('tax_year', year)
        .single();

      if (payeError || uifSdlError) {
        console.error("Error fetching tax tables:", payeError || uifSdlError);
        setTaxTables(null);
        showError("Failed to load tax tables for payroll calculations.");
      } else {
        setTaxTables({
          payeBrackets: payeData || [],
          uifSdlRates: uifSdlData || null,
        });
        console.log(`Tax tables for ${year} loaded successfully.`);
      }
    } catch (err) {
      console.error("Unhandled error fetching tax tables:", err);
      showError("An unexpected error occurred while loading tax tables.");
      setTaxTables(null);
    } finally {
      setIsLoadingTaxTables(false);
    }
  }, []);

  // Effect to load tax tables on mount and when taxTablesUpdated event is dispatched
  useEffect(() => {
    const currentTaxYear = new Date().getFullYear(); // Or determine based on fiscal year
    fetchTaxTables(currentTaxYear);

    const handleTaxTablesUpdate = () => {
      fetchTaxTables(currentTaxYear); // Re-fetch if the event is triggered
    };

    window.addEventListener('taxTablesUpdated', handleTaxTablesUpdate);
    return () => {
      window.removeEventListener('taxTablesUpdated', handleTaxTablesUpdate);
    };
  }, [fetchTaxTables]);


  // Individual listeners for specific data updates
  useEffect(() => {
    const handleEmployeesUpdated = (event: CustomEvent<MockEmployee[]>) => {
      if (isMockDataEnabled) {
        setEmployees(event.detail);
        console.log("usePayrollProcessor: employeesUpdated event received (mock data).");
      }
    };
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => {
      if (isMockDataEnabled) {
        setPayslips(event.detail);
        console.log("usePayrollProcessor: payslipsUpdated event received (mock data).");
      }
    };
    const handleLoansUpdated = (event: CustomEvent<Loan[]>) => {
      if (isMockDataEnabled) {
        setLoans(event.detail);
        console.log("usePayrollProcessor: loansUpdated event received (mock data).");
      }
    };
    const handleSavingPlansUpdated = (event: CustomEvent<SavingPlan[]>) => {
      if (isMockDataEnabled) {
        setSavingPlans(event.detail);
        console.log("usePayrollProcessor: savingPlansUpdated event received (mock data).");
      }
    };
    const handleLeaveRecordsUpdated = (event: CustomEvent<LeaveEntry[]>) => {
      if (isMockDataEnabled) {
        setLeaveRecords(event.detail);
        console.log("usePayrollProcessor: leaveRecordsUpdated event received (mock data).");
      }
    };
    const handleTimesheetsUpdated = (event: CustomEvent<TimesheetEntry[]>) => {
      if (isMockDataEnabled) {
        setTimesheets(event.detail);
        console.log("usePayrollProcessor: timesheetsUpdated event received (mock data).");
      }
    };
    const handleToDosUpdated = (event: CustomEvent<ToDoEntry[]>) => {
      if (isMockDataEnabled) {
        setToDos(event.detail);
        console.log("usePayrollProcessor: toDosUpdated event received (mock data).");
      }
    };

    window.addEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);

    return () => {
      window.removeEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    };
  }, [isMockDataEnabled]); // Dependencies for individual listeners

  const runPayrollProcess = useCallback(
    (periodStart: Date, periodEnd: Date) => {
      if (!employees.length) {
        showError("No employees found to run payroll.");
        return;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot run payroll.");
        return;
      }

      // Deep copy current mutable states for processing
      const currentLoansCopy: Loan[] = JSON.parse(JSON.stringify(loans));
      const currentSavingPlansCopy: SavingPlan[] = JSON.parse(JSON.stringify(savingPlans));
      const currentTimesheetsCopy: TimesheetEntry[] = JSON.parse(JSON.stringify(timesheets));

      // 1. Generate payslips for the period
      const newPayslips = generatePayslipsForPeriod(
        employees,
        currentLoansCopy, // Pass mutable copy
        currentSavingPlansCopy, // Pass mutable copy
        leaveRecords,
        currentTimesheetsCopy,
        periodStart,
        periodEnd,
        taxTables // Pass tax tables
      );

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      // 2. Update YTD for new payslips and merge with existing
      const updatedAllPayslips = [...payslips];
      newPayslips.forEach(newPayslip => {
        const employeePayslips = updatedAllPayslips.filter(p => p.employeeId === newPayslip.employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        newPayslip.ytdGrossEarnings = (lastPayslipForEmployee?.ytdGrossEarnings || 0) + newPayslip.grossEarnings;
        newPayslip.ytdTotalDeductions = (lastPayslipForEmployee?.ytdTotalDeductions || 0) + newPayslip.totalDeductions;

        // Remove any existing payslip for the same employee and period before adding the new one
        const existingPayslipIndex = updatedAllPayslips.findIndex(p =>
          p.employeeId === newPayslip.employeeId &&
          p.payPeriod === newPayslip.payPeriod
        );
        if (existingPayslipIndex !== -1) {
          updatedAllPayslips[existingPayslipIndex] = newPayslip;
        } else {
          updatedAllPayslips.push(newPayslip);
        }
      });

      // 3. Lock timesheets for the processed period
      const updatedTimesheets = currentTimesheetsCopy.map((ts) => {
        const tsDate = parseISO(ts.date);
        if (
          ts.employeeId &&
          ts.status !== "Locked" && // Only lock if not already locked
          isWithinInterval(tsDate, { start: periodStart, end: periodEnd })
        ) {
          const auditEntry = {
            action: "Status changed to Locked (Payroll Run)",
            timestamp: new Date().toISOString(),
            user: "System (Payroll)",
            captureMethod: "System" as const,
          };
          return {
            ...ts,
            status: "Locked" as const,
            auditLog: [...(ts.auditLog || []), auditEntry],
          };
        }
        return ts;
      });

      // 4. Save all updated data to localStorage
      localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));
      localStorage.setItem("mockLoans", JSON.stringify(currentLoansCopy)); // Save updated loans
      localStorage.setItem("mockSavingPlans", JSON.stringify(currentSavingPlansCopy));
      localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));

      // 5. Update state and notify components
      setPayslips(updatedAllPayslips);
      setLoans(currentLoansCopy); // Update loans state
      setSavingPlans(currentSavingPlansCopy);
      setTimesheets(updatedTimesheets);
      // Dispatch specific events instead of a general 'mockDataUpdated'
      window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: updatedAllPayslips }));
      window.dispatchEvent(new CustomEvent('loansUpdated', { detail: currentLoansCopy }));
      window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: currentSavingPlansCopy }));
      window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets }));
      showSuccess(`Payroll for ${format(periodStart, "MMM yyyy")} processed successfully!`);
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables]
  );

  const calculateSinglePayslipPreview = useCallback(
    (employeeId: string, periodStart: Date, periodEnd: Date): MockPayslip | null => {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) {
        showError("Employee not found for payslip preview.");
        return null;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot generate payslip preview.");
        return null;
      }

      // Deep copy current mutable states for preview (don't modify actual data)
      const currentLoansCopy: Loan[] = JSON.parse(JSON.stringify(loans));
      const currentSavingPlansCopy: SavingPlan[] = JSON.parse(JSON.stringify(savingPlans));
      const currentTimesheetsCopy: TimesheetEntry[] = JSON.parse(JSON.stringify(timesheets));

      const previewPayslips = generatePayslipsForPeriod(
        [employee], // Only generate for the selected employee
        currentLoansCopy,
        currentSavingPlansCopy,
        leaveRecords,
        currentTimesheetsCopy,
        periodStart,
        periodEnd,
        taxTables // Pass tax tables
      );

      if (previewPayslips.length > 0) {
        const previewPayslip = previewPayslips[0];

        // Calculate YTD for the preview based on existing payslips
        const employeePayslips = payslips.filter(p => p.employeeId === employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        previewPayslip.ytdGrossEarnings = (lastPayslipForEmployee?.ytdGrossEarnings || 0) + previewPayslip.grossEarnings;
        previewPayslip.ytdTotalDeductions = (lastPayslipForEmployee?.ytdTotalDeductions || 0) + previewPayslip.totalDeductions;

        return previewPayslip;
      }
      return null;
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables]
  );

  return {
    employees,
    setEmployees,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    toDos, // Expose toDos
    companyDetails, // Now derived
    isLoadingCompanyDetails, // Still expose loading state from useCompanyDetails
    isMockDataEnabled, // Expose isMockDataEnabled
    taxTables, // Expose taxTables
    isLoadingTaxTables, // Expose loading state for tax tables
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};