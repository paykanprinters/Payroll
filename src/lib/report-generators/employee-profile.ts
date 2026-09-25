import { MockEmployee, MockCompanyDetails } from "../mock-data-interfaces";
import { ReportDesignSettings } from "../report-design-interfaces"; // Import ReportDesignSettings
import { formatEmploymentStatusDetail } from "@/lib/employment-status";

export const generateEmployeeProfileReportContent = (
  employee: MockEmployee,
  companyDetails: MockCompanyDetails | null, // Now accepts null
  reportDesignSettings: ReportDesignSettings, // Add reportDesignSettings
): string => {
  const renderField = (label: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === null || value === "") {
      return `<p class="text-sm"><span class="font-semibold">${label}:</span> N/A</p>`;
    }
    return `<p class="text-sm"><span class="font-semibold">${label}:</span> ${String(value)}</p>`;
  };

  const renderAddress = (
    label: string,
    addressLine1?: string,
    addressLine2?: string,
    city?: string,
    province?: string,
    postalCode?: string,
  ) => {
    const addressParts = [addressLine1, addressLine2, city, province, postalCode].filter(Boolean);
    if (addressParts.length === 0) {
      return `<p class="text-sm"><span class="font-semibold">${label}:</span> N/A</p>`;
    }
    return `<p class="text-sm"><span class="font-semibold">${label}:</span> ${addressParts.join(", ")}</p>`;
  };

  return `
    <div class="p-8 bg-white text-gray-900 print:text-black">
      
      <div class="space-y-4">
        <h4 class="text-lg font-semibold underline">Basic Information</h4>
        <div class="grid grid-cols-2 gap-2">
          ${renderField("Employee ID", employee.customEmployeeId)}
          ${renderField("Personal ID", employee.personalId)}
          ${renderField("First Name", employee.firstName)}
          ${renderField("Last Name", employee.lastName)}
          ${renderField("Email", employee.email)}
          ${renderField("Mobile Number", employee.phoneNumber)}
          ${renderField("Date of Joining", employee.startDate)}
          ${renderField("Employment status", formatEmploymentStatusDetail(employee))}
          ${renderField("Designation", employee.jobTitle)}
          ${renderField("Department", employee.department)}
          ${renderField("Work Location", employee.workLocation)}
          ${renderField("Date of Confirmation", employee.dateOfConfirmation)}
          ${renderField("Origin Country", employee.originCountry)}
          ${renderField("Employment Type", employee.employmentType)}
          ${renderField("Portal Access", employee.portalAccess ? "Yes" : "No")}
        </div>

        <h4 class="text-lg font-semibold underline mt-6">Personal Information</h4>
        <div class="grid grid-cols-2 gap-2">
          ${renderField("Date of Birth", employee.dateOfBirth)}
          ${renderField("Gender", employee.gender)}
          ${renderField("ID Number", employee.idNumber)}
          ${renderAddress(
            "Residential Address",
            employee.addressLine1,
            employee.addressLine2,
            employee.city,
            employee.province,
            employee.postalCode,
          )}
          ${renderField("Permanent Address", employee.permanentAddress)}
        </div>

        <h4 class="text-lg font-semibold underline mt-6">Emergency Contact</h4>
        <div class="grid grid-cols-2 gap-2">
          ${renderField("Contact Name", employee.emergencyContactName)}
          ${renderField("Contact Number", employee.emergencyContactNumber)}
          ${renderField("Contact Address", employee.emergencyContactAddress)}
        </div>

        <h4 class="text-lg font-semibold underline mt-6">Payment Information</h4>
        <div class="grid grid-cols-2 gap-2">
          ${renderField("Payment Mode", employee.paymentMode)}
          ${renderField("Pay Frequency", employee.payFrequency)}
          ${employee.salary ? renderField("Salary (R)", employee.salary.toLocaleString('en-ZA', { minimumFractionDigits: 2 })) : ""}
          ${employee.hourlyRate ? renderField("Hourly Rate (R)", employee.hourlyRate.toLocaleString('en-ZA', { minimumFractionDigits: 2 })) : ""}
          ${renderField("Tax Reference Number", employee.taxReferenceNumber)}
          ${renderField("UIF Number", employee.uifNumber)}
          ${renderField("Bank Name", employee.bankName)}
          ${renderField("Account Holder Name", employee.bankAccountHolder)}
          ${renderField("Account Number", employee.accountNumber)}
          ${renderField("Branch Code", employee.branchCode)}
          ${renderField("Account Type", employee.bankAccountType)}
        </div>
      </div>
    </div>
  `;
};