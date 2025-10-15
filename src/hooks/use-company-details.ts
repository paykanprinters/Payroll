"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";

export const useCompanyDetails = () => {
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchCompanyDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("company_details")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching company details:", error);
      setError(error);
      setCompanyDetails(null); // Ensure companyDetails is null on error
    } else {
      setCompanyDetails(data);
    }
    setIsLoading(false);
  }, []);

  const upsertCompanyDetails = useCallback(
    async (details: Partial<MockCompanyDetails>) => {
      setIsLoading(true);
      setError(null);

      // Explicitly map the incoming details to ensure correct casing for Supabase
      // This prevents any accidental camelCase 'accountHolderName' from being sent.
      const payload = {
        companyLegalName: details.companyLegalName,
        companyTradingName: details.companyTradingName,
        companyRegistrationNumber: details.companyRegistrationNumber,
        companyTaxNumber: details.companyTaxNumber,
        vatRegistrationNumber: details.vatRegistrationNumber,
        industry: details.industry,
        payeReferenceNumber: details.payeReferenceNumber,
        uifReferenceNumber: details.uifReferenceNumber,
        sdlReferenceNumber: details.sdlReferenceNumber,
        coidaRegistrationNumber: details.coidaRegistrationNumber,
        physicalAddress: details.physicalAddress,
        postalAddress: details.postalAddress,
        mainContactNumber: details.mainContactNumber,
        alternativeContactNumber: details.alternativeContactNumber,
        companyEmail: details.companyEmail,
        companyWebsite: details.companyWebsite,
        bankName: details.bankName,
        accountholdername: details.accountholdername, // CRITICAL: Ensure this is lowercase
        accountNumber: details.accountNumber,
        branchCode: details.branchCode,
        accountType: details.accountType,
        logoUrl: details.logoUrl,
        logoWidth: details.logoWidth,
        logoHeight: details.logoHeight,
        logoFit: details.logoFit,
      };

      // Filter out undefined values from the payload to avoid issues with Supabase upsert
      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from("company_details")
        .upsert(cleanedPayload) // Use the cleaned and explicitly mapped payload
        .select()
        .single();

      if (error) {
        console.error("Error upserting company details:", error);
        showError(`Failed to save company details: ${error.message}`);
        setError(error);
      } else {
        setCompanyDetails(data);
        showSuccess("Company details saved successfully!");
        window.dispatchEvent(new Event("companyDetailsUpdated")); // Notify other components
      }
      setIsLoading(false);
      return { data, error };
    },
    [] // No dependencies needed as all details are passed in
  );

  useEffect(() => {
    fetchCompanyDetails();
    window.addEventListener("companyDetailsUpdated", fetchCompanyDetails);
    return () => {
      window.removeEventListener("companyDetailsUpdated", fetchCompanyDetails);
    };
  }, [fetchCompanyDetails]);

  return { companyDetails, isLoading, error, upsertCompanyDetails, refetchCompanyDetails: fetchCompanyDetails };
};