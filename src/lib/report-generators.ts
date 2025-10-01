import { format } from "date-fns";
import { MockEmployee, MockPayslip, LeaveEntry } from "./mock-data";

interface CompanyDetails {
  companyLegalName: string;
  companyTradingName: string;
  physicalAddress: string;
  mainContactNumber: string;
  companyEmail: string;
  companyWebsite: string;
  companyRegistrationNumber: string;
  vatRegistrationNumber: string;
}

// Helper to get employee name
const getEmployeeName = (employeeId: string, employees: MockEmployee[]) => {
  const employee = employees.find(emp => emp.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
};

// --- Report Content Generators ---

export const generatePayrollSummaryReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const totalGross = payslips.reduce((sum, p) => sum + p.grossEarnings, 0);
  const totalDeductions = payslips.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);

  const uniquePayPeriods = Array.from(new Set(payslips.map(p => p.payPeriod))).sort();

  let html = `
    <p><strong>Report Period:</strong> ${uniquePayPeriods[0]} to ${uniquePayPeriods[uniquePayPeriods.length - 1]}</p>
    <p><strong>Total Employees Paid:</strong> ${new Set(payslips.map(p => p.employeeId)).size}</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Overall Summary</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Metric</th>
          <th class="py-2 px-4 text-right">Amount (R)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b">
          <td class="py-2 px-4">Total Gross Earnings</td>
          <td class="py-2 px-4 text-right">${totalGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4">Total Deductions</td>
          <td class="py-2 px-4 text-right">${totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4 font-bold">Total Net Pay</td>
          <td class="py-2 px-4 text-right font-bold">${totalNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
    <br/>
    <h4 class="text-md font-semibold mb-2">Summary by Pay Period</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Gross Pay</th>
          <th class="py-2 px-4 text-right">Deductions</th>
          <th class="py-2 px-4 text-right">Net Pay</th>
        </tr>
      </thead>
      <tbody>
  `;

  uniquePayPeriods.forEach(period => {
    const periodPayslips = payslips.filter(p => p.payPeriod === period);
    const periodGross = periodPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
    const periodDeductions = periodPayslips.reduce((sum, p) => sum + p.totalDeductions, 0);
    const periodNet = periodPayslips.reduce((sum, p) => sum + p.netPay, 0);
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${period}</td>
        <td class="py-2 px-4 text-right">${periodGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${periodDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${periodNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateEmployeePayslipReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  let html = `<p>This report provides a list of all generated payslips. For detailed individual payslips, please use the 'Payslips' section.</p><br/>`;
  html += `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Gross Pay</th>
          <th class="py-2 px-4 text-right">Net Pay</th>
        </tr>
      </thead>
      <tbody>
  `;

  payslips.forEach(p => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)} (${p.employeeId})</td>
        <td class="py-2 px-4">${p.payPeriod}</td>
        <td class="py-2 px-4 text-right">${p.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateTaxStatutoryReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const taxDeductionsMap = new Map<string, number>();
  payslips.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (["PAYE", "UIF", "SDL"].includes(d.name)) { // Focus on statutory
        taxDeductionsMap.set(d.name, (taxDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  let html = `
    <p>This report summarizes statutory deductions for compliance with SARS.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Total Statutory Deductions</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Deduction Type</th>
          <th class="py-2 px-4 text-right">Total Amount (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(taxDeductionsMap.entries()).forEach(([name, amount]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${name}</td>
        <td class="py-2 px-4 text-right">${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <br/>
    <p class="text-sm text-muted-foreground">
      Note: This is a simplified summary. Actual SARS reports require specific formats and detailed employee-level data.
    </p>
  `;

  return html;
};

export const generateLeaveAbsenceReportContent = (leaveRecords: LeaveEntry[], employees: MockEmployee[]): string => {
  if (leaveRecords.length === 0) {
    return "<p>No leave records available to generate this report.</p>";
  }

  let html = `
    <p>This report provides an overview of all recorded employee leave and absences.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Leave Records</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Leave Type</th>
          <th class="py-2 px-4">Start Date</th>
          <th class="py-2 px-4">End Date</th>
          <th class="py-2 px-4 text-right">Working Days</th>
        </tr>
      </thead>
      <tbody>
  `;

  leaveRecords.forEach(record => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${getEmployeeName(record.employeeId, employees)}</td>
        <td class="py-2 px-4">${record.leaveType}</td>
        <td class="py-2 px-4">${record.startDate}</td>
        <td class="py-2 px-4">${record.endDate}</td>
        <td class="py-2 px-4 text-right">${record.workingDays}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateOvertimeBonusReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const overtimeBonusData: { employeeName: string; payPeriod: string; overtime: number; bonus: number }[] = [];

  payslips.forEach(p => {
    const overtimeEntry = p.earningsBreakdown.find(e => e.name === "Overtime");
    const bonusEntry = p.earningsBreakdown.find(e => e.name === "Bonus"); // Assuming a 'Bonus' entry might exist

    if (overtimeEntry || bonusEntry) {
      overtimeBonusData.push({
        employeeName: getEmployeeName(p.employeeId, employees),
        payPeriod: p.payPeriod,
        overtime: overtimeEntry ? overtimeEntry.amount : 0,
        bonus: bonusEntry ? bonusEntry.amount : 0,
      });
    }
  });

  if (overtimeBonusData.length === 0) {
    return "<p>No overtime or bonus data found in payslips to generate this report.</p>";
  }

  let html = `
    <p>This report details overtime hours and bonus payouts for employees.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Overtime & Bonus Payments</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Overtime (R)</th>
          <th class="py-2 px-4 text-right">Bonus (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  overtimeBonusData.forEach(data => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${data.employeeName}</td>
        <td class="py-2 px-4">${data.payPeriod}</td>
        <td class="py-2 px-4 text-right">${data.overtime.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${data.bonus.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateDepartmentalCostReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0 || employees.length === 0) {
    return "<p>No payslip or employee data available to generate this report.</p>";
  }

  const departmentCostMap = new Map<string, { gross: number; net: number }>();

  payslips.forEach(p => {
    const employee = employees.find(emp => emp.id === p.employeeId);
    const department = employee?.jobTitle || "Unassigned"; // Using jobTitle as a proxy for department

    const current = departmentCostMap.get(department) || { gross: 0, net: 0 };
    departmentCostMap.set(department, {
      gross: current.gross + p.grossEarnings,
      net: current.net + p.netPay,
    });
  });

  let html = `
    <p>This report breaks down payroll expenses by department (using job titles as a proxy).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Payroll Costs by Department</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Department</th>
          <th class="py-2 px-4 text-right">Total Gross Pay (R)</th>
          <th class="py-2 px-4 text-right">Total Net Pay (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(departmentCostMap.entries()).forEach(([department, data]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${department}</td>
        <td class="py-2 px-4 text-right">${data.gross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${data.net.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateBankTransferReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0 || employees.length === 0) {
    return "<p>No payslip or employee data available to generate this report.</p>";
  }

  let html = `
    <p>This report lists net pay amounts and bank details for salary disbursements.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Bank Transfer Details (Net Pay)</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Bank Name</th>
          <th class="py-2 px-4">Account Number</th>
          <th class="py-2 px-4">Branch Code</th>
          <th class="py-2 px-4 text-right">Net Pay (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  payslips.forEach(p => {
    const employee = employees.find(emp => emp.id === p.employeeId);
    if (employee) {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)}</td>
          <td class="py-2 px-4">${employee.bankName || "N/A"}</td>
          <td class="py-2 px-4">${employee.bankAccountNumber || "N/A"}</td>
          <td class="py-2 px-4">${employee.bankBranchCode || "N/A"}</td>
          <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateNewHiresTerminationsReportContent = (employees: MockEmployee[]): string => {
  if (employees.length === 0) {
    return "<p>No employee data available to generate this report.</p>";
  }

  const newHires = employees.filter(emp => new Date(emp.startDate).getFullYear() === new Date().getFullYear());
  // For terminations, we'd need a 'terminationDate' field, so we'll mock it simply
  const mockTerminations = employees.filter((_, index) => index % 5 === 0 && new Date(employees[index].startDate).getFullYear() < new Date().getFullYear()); // Every 5th old employee is 'terminated'

  let html = `
    <p>This report summarizes new hires and terminations within the current year (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">New Hires (${new Date().getFullYear()})</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee Name</th>
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4">Start Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  if (newHires.length === 0) {
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No new hires this year in mock data.</td></tr>`;
  } else {
    newHires.forEach(emp => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${emp.firstName} ${emp.lastName}</td>
          <td class="py-2 px-4">${emp.jobTitle}</td>
          <td class="py-2 px-4">${emp.startDate}</td>
        </tr>
      `;
    });
  }
  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Terminations (Mock Data)</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee Name</th>
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4">Mock Termination Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  if (mockTerminations.length === 0) {
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No mock terminations.</td></tr>`;
  } else {
    mockTerminations.forEach(emp => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${emp.firstName} ${emp.lastName}</td>
          <td class="py-2 px-4">${emp.jobTitle}</td>
          <td class="py-2 px-4">${format(new Date(emp.startDate).setMonth(new Date().getMonth() - 1), 'yyyy-MM-dd')}</td>
        </tr>
      `;
    });
  }
  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateEmployeeDemographicsReportContent = (employees: MockEmployee[]): string => {
  if (employees.length === 0) {
    return "<p>No employee data available to generate this report.</p>";
  }

  const jobTitleCounts = new Map<string, number>();
  const salaryRangeCounts = {
    "R0 - R20k": 0,
    "R20k - R40k": 0,
    "R40k - R60k": 0,
    "R60k+": 0,
  };

  employees.forEach(emp => {
    jobTitleCounts.set(emp.jobTitle, (jobTitleCounts.get(emp.jobTitle) || 0) + 1);
    if (emp.salary <= 20000) salaryRangeCounts["R0 - R20k"]++;
    else if (emp.salary <= 40000) salaryRangeCounts["R20k - R40k"]++;
    else if (emp.salary <= 60000) salaryRangeCounts["R40k - R60k"]++;
    else salaryRangeCounts["R60k+"]++;
  });

  let html = `
    <p>This report provides a demographic overview of your employee base (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Employees by Job Title</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
  `;
  Array.from(jobTitleCounts.entries()).forEach(([title, count]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${title}</td>
        <td class="py-2 px-4 text-right">${count}</td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Employees by Salary Range</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Salary Range</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
  `;
  Object.entries(salaryRangeCounts).forEach(([range, count]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${range}</td>
        <td class="py-2 px-4 text-right">${count}</td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateBenefitDeductionsReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const benefitDeductionsMap = new Map<string, number>();
  payslips.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (!["PAYE", "UIF", "SDL"].includes(d.name)) { // Consider non-statutory as 'benefits' for mock
        benefitDeductionsMap.set(d.name, (benefitDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  if (benefitDeductionsMap.size === 0) {
    return "<p>No non-statutory benefit deductions found in payslips to generate this report.</p>";
  }

  let html = `
    <p>This report summarizes non-statutory benefit deductions from employee payslips (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Total Benefit Deductions</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Deduction Type</th>
          <th class="py-2 px-4 text-right">Total Amount (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(benefitDeductionsMap.entries()).forEach(([name, amount]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${name}</td>
        <td class="py-2 px-4 text-right">${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};

export const generateAuditTrailReportContent = (): string => {
  const mockAuditEvents = [
    { timestamp: "2024-07-20 10:30:00", user: "Admin User", action: "Updated employee EMP001 salary" },
    { timestamp: "2024-07-19 15:00:00", user: "HR Manager", action: "Approved leave for EMP002" },
    { timestamp: "2024-07-18 09:00:00", user: "Admin User", action: "Generated payslips for July 2024" },
    { timestamp: "2024-07-17 11:45:00", user: "Finance Dept", action: "Added new loan for EMP003" },
    { timestamp: "2024-07-16 14:20:00", user: "Admin User", action: "Updated company details" },
  ];

  let html = `
    <p>This report provides a log of recent system activities (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Recent Audit Events</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Timestamp</th>
          <th class="py-2 px-4">User</th>
          <th class="py-2 px-4">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  mockAuditEvents.forEach(event => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${event.timestamp}</td>
        <td class="py-2 px-4">${event.user}</td>
        <td class="py-2 px-4">${event.action}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};