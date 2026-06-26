import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { sanitizeHtml } from "@/utils/sanitize-html";
import { logger, toLogError } from "@/lib/logger";

interface GeneratedReportPayload {
  user_id: string;
  report_title: string;
  report_type: string;
  content_html: string;
}

export const saveReportToSupabase = async (report: GeneratedReportPayload): Promise<boolean> => {
  logger.debug("report-queries: saving report");

  const sanitizedPayload: GeneratedReportPayload = {
    ...report,
    content_html: sanitizeHtml(report.content_html),
  };

  const { error } = await supabase
    .from('generated_reports')
    .insert(sanitizedPayload);

  if (error) {
    logger.error("report-queries: error saving report:", toLogError(error));
    showError(`Failed to save report: ${toLogError(error)}`);
    return false;
  } else {
    showSuccess(`Report "${report.report_title}" saved to Supabase!`);
    return true;
  }
};