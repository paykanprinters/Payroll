"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";

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
  updated_at: 'updatedAt', // Handles the underscore case
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
      console.log("useCompanyDetails: Attempting to fetch company details from Supabase...");
      const { data, error } = await supabase
        .from("company_details")
        .select("*")
        .limit(1)
        .single();

      console.log("useCompanyDetails: Raw Supabase response - data:", data, "error:", error); // NEW LOG

      if (error) {
        console.error("useCompanyDetails: Supabase fetchCompanyDetails error:", error);
        if (error.code === "PGRST116") {
          console.info("useCompanyDetails: No company details found in database (expected for initial setup). Setting companyDetails to null.");
          setCompanyDetails(null); // This is correct for no data
          setError(null);
        } else {
          console.error("useCompanyDetails: Error fetching company details:", error);
          setError(error);
          setCompanyDetails(null); // This is correct for an error
          showError(`Failed to load company details: ${error.message}`);
        }
      } else {
        const camelCaseData = convertKeysToCamelCase(data); // This line correctly converts data
        console.log("useCompanyDetails: Supabase fetchCompanyDetails success. Data (camelCase):", camelCaseData);
        setCompanyDetails(camelCaseData); // This line should set the state with the fetched data
      }
    } catch (err: any) {
      console.error("useCompanyDetails: Unhandled error in fetchCompanyDetails:", err);
      setError(err);
      setCompanyDetails(null); // This is correct for unhandled error
      showError('An unexpected error occurred while loading company details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upsertCompanyDetails = useCallback(
    async (details: Partial<MockCompanyDetails>) => {
      setIsLoading(true);
      setError(null);

      // Explicitly map the incoming details to ensure correct casing for Supabase
      // All column names in Supabase schema are lowercase.
      const payload = {
        id: '00000000-0000-0000-0000-000000000000', // Always include the fixed ID for upsert
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
        accounttype: details.accounttype,
        logourl: details.logoUrl,
        logowidth: details.logoWidth,
        logoheight: details.logoHeight,
        logofit: details.logoFit,
      };

      // Filter out undefined values from the payload to avoid issues with Supabase upsert
      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      console.log("useCompanyDetails: Attempting to upsert company details with payload:", cleanedPayload);

      const { data, error } = await supabase
        .from("company_details")
        .upsert(cleanedPayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useCompanyDetails: Supabase upsertCompanyDetails error:", error);
        showError(`Failed to save company details: ${error.message}`);
        setError(error);
      } else {
        const camelCaseData = convertKeysToCamelCase(data && data.length > 0 ? data[0] : null); // Convert to camelCase
        console.log("useCompanyDetails: Supabase upsertCompanyDetails success. Data (camelCase):", camelCaseData);
        setCompanyDetails(camelCaseData);
        showSuccess("Company details saved successfully!");
        window.dispatchEvent(new Event("companyDetailsUpdated"));
      }
      setIsLoading(false);
      return { data, error };
    },
    []
  );

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true); // Keep loading true while auth is loading
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

      setCompanyDetails({
        companyLegalName: mockCompanyLegalName, companyTradingName: mockCompanyTradingName, companyRegistrationNumber: mockCompanyRegistrationNumber,
        companyTaxNumber: mockCompanyTaxNumber, vatRegistrationNumber: mockVatRegistrationNumber, industry: mockIndustry,
        payeReferenceNumber: mockPayeReferenceNumber, uifReferenceNumber: mockUifReferenceNumber, sdlReferenceNumber: mockSdlReferenceNumber,
        coidaRegistrationNumber: mockCoidaRegistrationNumber, physicalAddress: mockPhysicalAddress, postalAddress: mockPostalAddress, mainContactNumber: mockMainContactNumber, alternativeContactNumber: mockAlternativeContactNumber,
        companyEmail: mockCompanyEmail, companyWebsite: mockCompanyWebsite, bankName: mockBankName, accountholdername: mockAccountholdername, accountNumber: mockAccountNumber,
        branchCode: mockBranchCode, accountType: mockAccountType, logoUrl: mockLogoUrl, logoWidth: mockLogoWidth, logoHeight: mockLogoHeight, logoFit: mockLogoFit,
      });
      setIsLoading(false);
    } else {
      // Not mock data, so attempt to fetch live data.
      // This should happen whether authenticated or not, as company details are public.
      fetchCompanyDetails();
    }
  }, [isMockDataEnabled, isLoadingAuth, fetchCompanyDetails]);

  return { companyDetails, isLoading, error, upsertCompanyDetails, refetchCompanyDetails: fetchCompanyDetails };
};