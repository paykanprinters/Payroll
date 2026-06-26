"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";
import { recordSettingsChange } from "@/lib/audit-trail";
import { logger, toLogError } from "@/lib/logger";

// Define a mapping for Supabase column names to camelCase property names
const columnToPropertyMap: { [key: string]: keyof MockCompanyDetails | 'updatedAt' } = {
  id: 'id',
  companylegalname: 'companyLegalName',
  companytradingname: 'companyTradingName',
  companyregistrationnumber: 'companyRegistrationNumber',
  companytaxnumber: 'companyTaxNumber',
  vatregistrationnumber: 'vatRegistrationNumber',
  industry: 'industry',
  payereferencenumber: 'payeReferenceNumber',
  uifreferencenumber: 'uifReferenceNumber',
  sdlreferencenumber: 'sdlReferenceNumber',
  coidaregistrationnumber: 'coidaRegistrationNumber',
  physicaladdress: 'physicalAddress',
  postaladdress: 'postalAddress',
  maincontactnumber: 'mainContactNumber',
  alternativecontactnumber: 'alternativeContactNumber',
  companyemail: 'companyEmail',
  companywebsite: 'companyWebsite',
  bankname: 'bankName',
  accountholdername: 'accountholdername', // Matches interface directly
  accountnumber: 'accountNumber',
  branchcode: 'branchCode',
  accounttype: 'accountType',
  logourl: 'logoUrl',
  logowidth: 'logoWidth',
  logoheight: 'logoHeight',
  logofit: 'logoFit',
  updated_at: 'updatedAt', // Handles the underscore case,
  // NEW mapping for persisted active tax year
  active_tax_year: 'activeTaxYear',
  biometric_api_url: 'biometricApiUrl',
};

// Modified conversion function to use the explicit map
const convertKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = columnToPropertyMap[key] || key; // Use mapping, fallback to original key if not found
      acc[newKey] = convertKeysToCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

interface UseCompanyDetailsProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useCompanyDetails = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: UseCompanyDetailsProps) => {
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchCompanyDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      logger.debug("useCompanyDetails: fetching company details");
      const { data, error } = await supabase
        .from("company_details")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          logger.debug("useCompanyDetails: no company details found (expected for initial setup).");
          setCompanyDetails(prev => (prev !== null ? null : prev));
          setError(null);
        } else {
          logger.error("useCompanyDetails: error fetching company details:", toLogError(error));
          setError(error);
          setCompanyDetails(prev => (prev !== null ? null : prev));
          showError(`Failed to load company details: ${toLogError(error)}`);
        }
      } else {
        const camelCaseData = convertKeysToCamelCase(data);
        // Use functional update with deep compare to avoid unnecessary rerenders
        setCompanyDetails(prev => {
          const changed = JSON.stringify(prev) !== JSON.stringify(camelCaseData);
          return changed ? camelCaseData : prev;
        });
      }
    } catch (err: any) {
      logger.error("useCompanyDetails: unhandled error in fetchCompanyDetails:", toLogError(err));
      setError(err);
      setCompanyDetails(prev => (prev !== null ? null : prev));
      showError('An unexpected error occurred while loading company details.');
    } finally {
      setIsLoading(false);
    }
  }, []); // STABILIZED: no dependency on companyDetails

  const upsertCompanyDetails = useCallback(
    async (details: Partial<MockCompanyDetails>) => {
      setIsLoading(true);
      setError(null);

      const payload = {
        id: '00000000-0000-0000-0000-000000000000',
        companylegalname: details.companyLegalName,
        companytradingname: details.companyTradingName,
        companyregistrationnumber: details.companyRegistrationNumber,
        companytaxnumber: details.companyTaxNumber,
        vatregistrationnumber: details.vatRegistrationNumber,
        industry: details.industry,
        payereferencenumber: details.payeReferenceNumber,
        uifreferencenumber: details.uifReferenceNumber,
        sdlreferencenumber: details.sdlReferenceNumber,
        coidaregistrationnumber: details.coidaRegistrationNumber,
        physicaladdress: details.physicalAddress,
        postaladdress: details.postalAddress,
        maincontactnumber: details.mainContactNumber,
        alternativecontactnumber: details.alternativeContactNumber,
        companyemail: details.companyEmail,
        companywebsite: details.companyWebsite,
        bankname: details.bankName,
        accountholdername: details.accountholdername,
        accountnumber: details.accountNumber,
        branchcode: details.branchCode,
        accounttype: details.accountType,
        logourl: details.logoUrl,
        logowidth: details.logoWidth,
        logoheight: details.logoHeight,
        logofit: details.logoFit,
        active_tax_year: details.activeTaxYear,
        biometric_api_url: details.biometricApiUrl,
      };

      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      logger.debug("useCompanyDetails: upserting company details");

      const { data, error } = await supabase
        .from("company_details")
        .upsert(cleanedPayload, { onConflict: 'id' })
        .select();

      if (error) {
        logger.error("useCompanyDetails: upsertCompanyDetails error:", toLogError(error));
        showError(`Failed to save company details: ${toLogError(error)}`);
        setError(error);
      } else {
        const camelCaseData = convertKeysToCamelCase(data && data.length > 0 ? data[0] : null);
        setCompanyDetails(prev => {
          const changed = JSON.stringify(prev) !== JSON.stringify(camelCaseData);
          return changed ? camelCaseData : prev;
        });
        showSuccess("Company details saved successfully!");
        void recordSettingsChange("company_details", "Company details updated");
        window.dispatchEvent(new Event("companyDetailsUpdated"));
      }
      setIsLoading(false);
      return { data, error };
    },
    [] // STABILIZED: remove dependency on companyDetails
  );

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    if (isMockDataEnabled) {
      // For mock data, reconstruct company details from localStorage
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
      const mockCompanyWebsite = localStorage.getItem('companyWebsite') || "www.acmecorp.co.za";
      const mockBankName = localStorage.getItem('bankName') || "";
      const mockAccountholdername = localStorage.getItem('accountholdername') || "";
      const mockAccountNumber = localStorage.getItem('accountNumber') || "";
      const mockBranchCode = localStorage.getItem('branchCode') || "";
      const mockAccountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
      const mockLogoUrl = localStorage.getItem('companyLogoUrl') || '';
      const mockLogoWidth = parseFloat(localStorage.getItem('companyLogoWidth') || '100');
      const mockLogoHeight = parseFloat(localStorage.getItem('companyLogoHeight') || '50');
      const mockLogoFit = (localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || "contain";
      const mockBiometricApiUrl = localStorage.getItem('biometricApiUrl') || undefined;

      const newMockCompanyDetails: MockCompanyDetails = {
        companyLegalName: mockCompanyLegalName, companyTradingName: mockCompanyTradingName, companyRegistrationNumber: mockCompanyRegistrationNumber,
        companyTaxNumber: mockCompanyTaxNumber, vatRegistrationNumber: mockVatRegistrationNumber, industry: mockIndustry,
        payeReferenceNumber: mockPayeReferenceNumber, uifReferenceNumber: mockUifReferenceNumber, sdlReferenceNumber: mockSdlReferenceNumber,
        coidaRegistrationNumber: mockCoidaRegistrationNumber, physicalAddress: mockPhysicalAddress, postalAddress: mockPostalAddress, mainContactNumber: mockMainContactNumber, alternativeContactNumber: mockAlternativeContactNumber,
        companyEmail: mockCompanyEmail, companyWebsite: mockCompanyWebsite, bankName: mockBankName, accountholdername: mockAccountholdername, accountNumber: mockAccountNumber,
        branchCode: mockBranchCode, accountType: mockAccountType, logoUrl: mockLogoUrl, logoWidth: mockLogoWidth, logoHeight: mockLogoHeight, logoFit: mockLogoFit,
        biometricApiUrl: mockBiometricApiUrl,
      };

      // Deep comparison for mock data as well
      if (JSON.stringify(newMockCompanyDetails) !== JSON.stringify(companyDetails)) {
        setCompanyDetails(newMockCompanyDetails);
      }
      setIsLoading(false);
    } else {
      // Live mode: fetch once per auth/mock-state change
      fetchCompanyDetails();

      // Focus refresh is handled centrally in usePayrollProcessor.
    }
  }, [isMockDataEnabled, isLoadingAuth, isAuthenticated]); // REMOVED companyDetails and fetchCompanyDetails from deps

  return { companyDetails, isLoading, error, upsertCompanyDetails, refetchCompanyDetails: fetchCompanyDetails };
};