import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface GeneratedReportPayload {
  user_id: string;
  report_title: string;
  report_type: string;
  content_html: string;
}

export const saveReportToSupabase = async (report: GeneratedReportPayload): Promise<boolean> => {
  console.log("report-queries: Saving report to Supabase:", report.report_title);
  const { error } = await supabase
    .from('generated_reports')
    .insert(report);

  if (error) {
    console.error("report-queries: Error saving report to Supabase:", error);
    showError(`Failed to save report: ${error.message}`);
    return false;
  } else {
    showSuccess(`Report "${report.report_title}" saved to Supabase!`);
    return true;
  }
};