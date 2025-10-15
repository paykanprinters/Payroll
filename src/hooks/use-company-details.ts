"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      // All column names in Supabase schema are lowercase.
      const payload = {
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
        alternativecontactnumber: details.alternativeContactNumber, // Corrected casing
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