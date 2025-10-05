"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear } from "date-fns";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import IndividualPayslipCard from "./IndividualPayslipCard";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import IndividualPayslipActions from "./IndividualPayslipActions";
import BulkPayslipActions from "./BulkPayslipActions";
// IndividualIrp5Actions and related imports are removed
// generateIrp5ExportContent and ReportDesignSettings are removed
// ReportContentWrapper is removed

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  showYTD?: boolean;
  sectionOrder?: ("Earnings" | "Deductions")[];
  layoutSize?: "Letter" | "A4" | "A5";
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right";
}

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails;
  allEmployees: MockEmployee[];
  // isIrp5ExportEnabled and reportDesignSettings are no longer props
}

const PayslipGenerationSection: React.FC<PayslipGenerationSectionProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  getEmployeeName,
  payslipDesignSettings,
  companyDetails,
  allEmployees,
  // isIrp5ExportEnabled, reportDesignSettings are removed from destructuring
}) => {
  const [selectedPayPeriodDate, setSelectedPayPeriodDate] = React.useState<Date | undefined>(new Date());
  const { generatePdf, printPdf } = usePdfGenerator();

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);
  // selectedEmployee is no longer needed here as IRP5 logic moved out

  React.useEffect(() => {
    if (selectedEmployeeId && filteredPayslipsForEmployee.length > 0) {
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip && mostRecentPayslip.id !== selectedPayslipId) {
        setSelectedPayslipId(mostRecentPayslip.id);
      }
    } else if (!selectedEmployeeId && selectedPayslipId) {
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, filteredPayslipsForEmployee, selectedPayslipId, setSelectedPayslipId]);

  // Helper to render an IndividualPayslipCard into a hidden DOM element for PDF generation
  const renderPayslipToDomElement = (payslip: MockPayslip, container: HTMLDivElement): Promise<void> => {
    return new Promise((resolve) => {
      const payslipRoot = document.createElement('div');
      container.appendChild(payslipRoot);

      const root = ReactDOM.createRoot(payslipRoot);
      root.render(
        <IndividualPayslipCard
          payslip={payslip}
          payslipDesignSettings={payslipDesignSettings}
          companyDetails={companyDetails}
          employees={allEmployees}
          getEmployeeName={getEmployeeName}
          isPdfGeneration={true}
          onReadyForPdf={() => {
            console.log(`Payslip ${payslip.id} signaled readiness.`);
            resolve();
          }}
        />
      );

      // Store the root for cleanup
      (payslipRoot as any)._reactRoot = root;

      // Fallback if onReadyForPdf doesn't fire (e.g., no images, or component renders very fast)
      setTimeout(() => {
        if (!payslipRoot.isConnected) return; // Already resolved and cleaned up
        console.warn(`Payslip ${payslip.id} rendering timed out, proceeding.`);
        resolve();
      }, 5000); // Increased timeout
    });
  };

  // Helper to clean up the temporary DOM element and its React root
  const cleanupRenderedElement = (container: HTMLDivElement) => {
    Array.from(container.children).forEach(child => {
      const root = (child as any)._reactRoot;
      if (root) {
        root.unmount();
      }
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

    const toastId = showLoading(`Generating PDF for ${action}, please wait...`) as string;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    try {
      await renderPayslipToDomElement(selectedPayslip, container);
      const payslipElement = container.firstChild as HTMLDivElement; // Get the rendered payslip

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(payslipElement).set(opt);

      if (action === 'download') {
        await pdfPromise.save();
        showSuccess("Payslip PDF downloaded successfully!");
      } else { // 'print'
        const pdf = await pdfPromise.toPdf().get('pdf');
        pdf.output('dataurlnewwindow');
        showSuccess("Payslip sent to printer.");
      }
    } catch (error: any) {
      showError(`Error generating PDF for ${action}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf ${action} error:`, error);
    } finally {
      dismissToast(toastId);
      cleanupRenderedElement(container);
    }
  };

  const handlePrintOrDownloadAll = async (action: 'print' | 'download') => {
    if (!selectedPayPeriodDate) {
      showError("Please select a pay period date to generate all payslips.");
      return;
    }

    const payslipsForPeriod = payslips.filter(p => {
      const [startPeriodStr] = p.payPeriod.split(' - ');
      const payslipDate = new Date(startPeriodStr);
      return isSameMonth(payslipDate, selectedPayPeriodDate) && isSameYear(payslipDate, selectedPayPeriodDate);
    });

    if (payslipsForPeriod.length === 0) {
      showError(`No payslips found for the selected pay period (${format(selectedPayPeriodDate, 'MMM yyyy')}).`);
      return;
    }

    const toastId = showLoading(`Generating all payslips for ${format(selectedPayPeriodDate, 'MMM yyyy')} for ${action}, please wait...`) as string;

    // Create a hidden iframe for rendering all payslips
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px'; // Position off-screen
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden'; // Ensure it's hidden
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      dismissToast(toastId);
      showError("Could not access iframe document for bulk payslip generation.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write('<!DOCTYPE html><html><head><title>Bulk Payslips</title></head><body><div id="payslips-root"></div></body></html>');
    iframeDoc.close();

    // Copy all stylesheets and style tags from the main document to the iframe
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
      const clonedNode = node.cloneNode(true);
      iframeDoc.head.appendChild(clonedNode);
    });

    const payslipsRoot = iframeDoc.getElementById('payslips-root');
    if (!payslipsRoot) {
      dismissToast(toastId);
      showError("Payslips root element not found in iframe.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    const root = ReactDOM.createRoot(payslipsRoot);
    (iframe as any)._reactRoot = root; // Store root for cleanup

    try {
      const renderPromises: Promise<void>[] = [];
      for (let i = 0; i < payslipsForPeriod.length; i++) {
        const payslipContainer = document.createElement('div');
        payslipsRoot.appendChild(payslipContainer);
        
        renderPromises.push(new Promise<void>((resolve) => {
          const payslipRootInstance = ReactDOM.createRoot(payslipContainer);
          payslipRootInstance.render(
            <IndividualPayslipCard
              payslip={payslipsForPeriod[i]}
              payslipDesignSettings={payslipDesignSettings}
              companyDetails={companyDetails}
              employees={allEmployees}
              getEmployeeName={getEmployeeName}
              isPdfGeneration={true}
              onReadyForPdf={() => {
                console.log(`Payslip ${payslipsForPeriod[i].id} in iframe signaled readiness.`);
                resolve();
              }}
            />
          );
          (payslipContainer as any)._reactRoot = payslipRootInstance; // Store for cleanup
          // Fallback for rendering readiness
          setTimeout(() => {
            if (!payslipContainer.isConnected) return;
            console.warn(`Payslip ${payslipsForPeriod[i].id} rendering in iframe timed out, proceeding.`);
            resolve();
          }, 5000);
        }));

        if (i < payslipsForPeriod.length - 1) {
          const pageBreak = iframeDoc.createElement('div');
          pageBreak.style.pageBreakAfter = 'always';
          payslipsRoot.appendChild(pageBreak);
        }
      }

      await Promise.all(renderPromises); // Wait for all payslips to render and signal readiness

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `all-payslips-${format(selectedPayPeriodDate, 'yyyy-MM')}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(payslipsRoot).set(opt);

      if (action === 'download') {
        await pdfPromise.save();
        showSuccess("All payslips PDF downloaded successfully!");
      } else { // 'print'
        const pdf = await pdfPromise.toPdf().get('pdf');
        pdf.output('dataurlnewwindow');
        showSuccess("All payslips sent to printer.");
      }
    } catch (error: any) {
      showError(`Error generating all payslips for ${action}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf all payslips ${action} error:`, error);
    } finally {
      dismissToast(toastId);
      // Clean up all temporary DOM elements and the iframe
      Array.from(payslipsRoot.children).forEach(child => {
        const childRoot = (child as any)._reactRoot;
        if (childRoot) childRoot.unmount();
      });
      root.unmount();
      iframe.parentNode?.removeChild(iframe);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Payslips</CardTitle>
        <CardDescription>
          Generate individual payslips or a batch of all payslips for printing or downloading.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <EmployeePayslipSelector
            employees={employees}
            payslips={payslips}
            selectedEmployeeId={selectedEmployeeId}
            setSelectedEmployeeId={setSelectedEmployeeId}
            selectedPayslipId={selectedPayslipId}
            setSelectedPayslipId={setSelectedPayslipId}
            filteredPayslipsForEmployee={filteredPayslipsForEmployee}
          />
          <IndividualPayslipActions
            selectedPayslip={selectedPayslip}
            onPrint={() => handlePrintOrDownload('print')}
            onDownload={() => handlePrintOrDownload('download')}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 items-end">
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            onPrintAll={() => handlePrintOrDownloadAll('print')}
            onDownloadAll={() => handlePrintOrDownloadAll('download')}
          />
        </div>

        {/* IndividualIrp5Actions component removed from here */}
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;