/** Sample HTML body for Report Design live preview (mirrors payroll summary style). */
export function buildReportDesignSampleHtml(): string {
  return `
    <p style="margin:0 0 12px;color:#4b5563;">
      Period: 1 Jul 2026 – 31 Jul 2026 · Generated for design preview
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:#f3f4f6;text-align:left;">
          <th style="padding:8px;border-bottom:1px solid #e5e7eb;">Employee</th>
          <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">Gross</th>
          <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">Deductions</th>
          <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">Net</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">A. Jacobs</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 22,500.00</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 4,877.12</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 17,622.88</td>
        </tr>
        <tr>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">B. Naidoo</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 18,200.00</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 3,410.50</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 14,789.50</td>
        </tr>
        <tr>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">C. Williams</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 31,000.00</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 8,240.00</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">R 22,760.00</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="font-weight:700;">
          <td style="padding:8px;border-top:2px solid #d1d5db;">Totals</td>
          <td style="padding:8px;border-top:2px solid #d1d5db;text-align:right;">R 71,700.00</td>
          <td style="padding:8px;border-top:2px solid #d1d5db;text-align:right;">R 16,527.62</td>
          <td style="padding:8px;border-top:2px solid #d1d5db;text-align:right;">R 55,172.38</td>
        </tr>
      </tfoot>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
        <div style="font-weight:600;margin-bottom:6px;">Statutory summary</div>
        <div style="display:flex;justify-content:space-between;"><span>PAYE</span><span>R 9,420.00</span></div>
        <div style="display:flex;justify-content:space-between;"><span>UIF</span><span>R 717.00</span></div>
        <div style="display:flex;justify-content:space-between;"><span>SDL</span><span>R 717.00</span></div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
        <div style="font-weight:600;margin-bottom:6px;">Headcount</div>
        <div style="display:flex;justify-content:space-between;"><span>Paid employees</span><span>3</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Cash excluded</span><span>0</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Exceptions</span><span>0</span></div>
      </div>
    </div>
    <p style="margin-top:16px;font-size:0.9em;color:#6b7280;">
      This preview uses the same report chrome as Downloads and Print from the Reports library.
      Change paper size, header toggles, and font size to see the page update live.
    </p>
  `.trim();
}
