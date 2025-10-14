"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext"; // Import useAuth to check user role

const SINGLE_COMPANY_DETAILS_ID = '00000000-0000-0000-0000-000000000000';

export const useCompanyDetails = () => {
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Get current user to check role

  const fetchCompanyDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('company_details')
        .select('*')
        .eq('id', SINGLE_COMPANY_DETAILS_ID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error("Error fetching company details:", fetchError);
        setError(fetchError.message);
        setCompanyDetails(null);
      } else if (data) {
        setCompanyDetails(data as MockCompanyDetails);
      } else {
        setCompanyDetails(null); // No details found
      }
    } catch (err: any) {
      console.error("Unexpected error fetching company details:", err);
      setError(err.message || "An unexpected error occurred.");
      setCompanyDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const upsertCompanyDetails = useCallback(async (details: Partial<MockCompanyDetails>) => {
    if (user?.role !== 'Admin') {
      showError("Only Admins can update company details.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: upsertError } = await supabase
        .from('company_details')
        .upsert({ ...details, id: SINGLE_COMPANY_DETAILS_ID }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error("Error upserting company details:", upsertError);
        setError(upsertError.message);
        showError(`Failed to save company details: ${upsertError.message}`);
      } else if (data) {
        setCompanyDetails(data as MockCompanyDetails);
        showSuccess("Company details saved successfully!");
        // Dispatch a custom event to notify other components (like Sidebar)
        window.dispatchEvent(new Event('companyDetailsUpdated'));
      }
    } catch (err: any) {
      console.error("Unexpected error upserting company details:", err);
      setError(err.message || "An unexpected error occurred.");
      showError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { companyDetails, isLoading, error, refetchCompanyDetails: fetchCompanyDetails, upsertCompanyDetails };
};