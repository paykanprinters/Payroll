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
    try {
      console.log("Attempting to fetch company details..."); // Added log
      const { data, error } = await supabase
        .from("company_details")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        console.error("Supabase fetchCompanyDetails error:", error); // Added log
        // PGRST116 is returned when .single() finds 0 rows. This is expected for initial setup.
        if (error.code === "PGRST116") {
          console.info("No company details found in database (expected for initial setup). Setting companyDetails to null.");
          setCompanyDetails(null);
          setError(null); // Clear error for this expected scenario
        } else {
          console.error("Error fetching company details:", error);
          setError(error);
          setCompanyDetails(null);
          showError(`Failed to load company details: ${error.message}`);
        }
      } else {
        console.log("Supabase fetchCompanyDetails success. Data:", data); // Added log
        setCompanyDetails(data);
      }
    } catch (err: any) {
      console.error("Unhandled error in fetchCompanyDetails:", err);
      setError(err);
      setCompanyDetails(null);
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

      console.log("Attempting to upsert company details with payload:", cleanedPayload); // Added log

      const { data, error } = await supabase
        .from("company_details")
        .upsert(cleanedPayload, { onConflict: 'id' }) // Added onConflict for robustness, removed .single()
        .select();

      if (error) {
        console.error("Supabase upsertCompanyDetails error:", error); // Added log
        showError(`Failed to save company details: ${error.message}`);
        setError(error);
      } else {
        console.log("Supabase upsertCompanyDetails success. Data:", data); // Added log
        // If data is an array, take the first element for setCompanyDetails
        setCompanyDetails(data && data.length > 0 ? data[0] : null);
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