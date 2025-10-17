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

export const useCompanyDetails = () => {
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
          setCompanyDetails(null);
          setError(null);
        } else {
          console.error("useCompanyDetails: Error fetching company details:", error);
          setError(error);
          setCompanyDetails(null);
          showError(`Failed to load company details: ${error.message}`);
        }
      } else {
        const camelCaseData = convertKeysToCamelCase(data); // Use the new conversion function
        console.log("useCompanyDetails: Supabase fetchCompanyDetails success. Data (camelCase):", camelCaseData);
        setCompanyDetails(camelCaseData);
      }
    } catch (err: any) {
      console.error("useCompanyDetails: Unhandled error in fetchCompanyDetails:", err);
      setError(err);
      setCompanyDetails(null);
      showError('An unexpected error occurred while loading company details.');
    } finally {
      console.log("useCompanyDetails: Setting isLoading to false in finally block."); // NEW LOG
      setIsLoading(false);
      console.log("useCompanyDetails: Finished fetching. isLoading:", false, "companyDetails:", companyDetails);
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
        accounttype: details.accountType,
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
    fetchCompanyDetails();
    // Removed: window.addEventListener("companyDetailsUpdated", fetchCompanyDetails);
    // Rely on internal state updates and other components listening to the event.
    return () => {
      // Removed: window.removeEventListener("companyDetailsUpdated", fetchCompanyDetails);
    };
  }, [fetchCompanyDetails]);

  return { companyDetails, isLoading, error, upsertCompanyDetails, refetchCompanyDetails: fetchCompanyDetails };
};