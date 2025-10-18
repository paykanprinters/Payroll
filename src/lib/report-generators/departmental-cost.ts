import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const generateDepartmentalCostReportContent = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredPayslips = payslips;
  let reportPeriodDescription = "All Periods";

  if (selectedDate) {
    if (periodType === "monthly") {
      filteredPayslips = payslips.filter(p => {
        const [startPeriodStr] = p.payPeriod.split(' - ');
        const payslipDate = parseISO(startPeriodStr);
        return isSameMonth(payslipDate, selectedDate) && isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = format(selectedDate, "MMMM yyyy");
    } else if (periodType === "yearly") {
      filteredPayslips = payslips.filter(p => {
        const [startPeriodStr] = p.payPeriod.split(' - ');
        const payslipDate = parseISO(startPeriodStr);
        return isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = format(selectedDate, "yyyy");
    }
  }

  if (filteredPayslips.length === 0 || employees.length === 0) {
    return `<p>No payslip or employee data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  const departmentCostMap = new Map<string, { gross: number; net: number }>();

  filteredPayslips.forEach(p => {
    const employee = employees.find(emp => emp.id === p.employeeId);
    const department = employee?.jobTitle || "Unassigned"; // Using jobTitle as a proxy for department

    const current = departmentCostMap.get(department) || { gross: 0, net: 0 };
    departmentCostMap.set(department, {
      gross: current.gross + p.grossEarnings,
      net: current.net + p.netPay,
    });
  });

  let html = `
    <p>This report breaks down payroll expenses by department (using job titles as a proxy) for ${reportPeriodDescription}.</p>
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