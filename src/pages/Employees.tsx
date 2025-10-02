"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PlusCircle, Edit, Trash2, Download } from "lucide-react"; // Import Download icon
import EmployeeFormDialog, { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Updated import
import { generateEmployeeProfileReportContent } from "@/lib/report-generators"; // Import new report generator
import html2pdf from 'html2pdf.js'; // Import html2pdf

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [jobTitleDistribution, setJobTitleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [averageSalaryByJobTitle, setAverageSalaryByJobTitle] = useState<{ name: string; salary: number }[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MockEmployee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<MockEmployee | null>(null);
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null); // State for company details

  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadEmployees = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      const loadedEmployees: MockEmployee[] = JSON.parse(storedEmployees);
      setEmployees(loadedEmployees);

      // Calculate job title distribution
      const jobTitleMap = new Map<string, number>();
      loadedEmployees.forEach((emp) => {
        jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
      });
      setJobTitleDistribution(
        Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Calculate average salary by job title
      const salarySumByJobTitle = new Map<string, { sum: number; count: number }>();
      loadedEmployees.forEach((emp) => {
        const current = salarySumByJobTitle.get(emp.jobTitle) || { sum: 0, count: 0 };
        salarySumByJobTitle.set(emp.jobTitle, {
          sum: current.sum + (emp.salary || 0) + (emp.hourlyRate ? emp.hourlyRate * 160 : 0), // Estimate monthly for hourly
          count: current.count + 1,
        });
      });
      setAverageSalaryByJobTitle(
        Array.from(salarySumByJobTitle.entries()).map(([name, data]) => ({
          name,
          salary: data.sum / data.count,
        }))
      );
    } else {
      setEmployees([]);
      setJobTitleDistribution([]);
      setAverageSalaryByJobTitle([]);
    }
  };

  const loadCompanyDetails = () => {
    const storedCompanyDetails = localStorage.getItem("companyLegalName")
      ? {
          companyLegalName: localStorage.getItem('companyLegalName') || "",
          companyTradingName: localStorage.getItem('companyTradingName') || "",
          companyRegistrationNumber: localStorage.getItem('companyRegistrationNumber') || "",
          companyTaxNumber: localStorage.getItem('companyTaxNumber') || "",
          vatRegistrationNumber: localStorage.getItem('vatRegistrationNumber') || "",
          industry: localStorage.getItem('industry') || "",
          payeReferenceNumber: localStorage.getItem('payeReferenceNumber') || "",
          uifReferenceNumber: localStorage.getItem('uifReferenceNumber') || "",
          sdlReferenceNumber: localStorage.getItem('sdlReferenceNumber') || "",
          coidaRegistrationNumber: localStorage.getItem('coidaRegistrationNumber') || "",
          physicalAddress: localStorage.getItem('physicalAddress') || "",
          postalAddress: localStorage.getItem('postalAddress') || "",
          mainContactNumber: localStorage.getItem('mainContactNumber') || "",
          alternativeContactNumber: localStorage.getItem('alternativeContactNumber') || "",
          companyEmail: localStorage.getItem('companyEmail') || "",
          companyWebsite: localStorage.getItem('companyWebsite') || "",
          bankName: localStorage.getItem('bankName') || "",
          accountHolderName: localStorage.getItem('accountHolderName') || "",
          accountNumber: localStorage.getItem('accountNumber') || "",
          branchCode: localStorage.getItem('branchCode') || "",
          accountType: (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque",
          logoUrl: localStorage.getItem('companyLogoUrl') || '',
          logoSize: parseFloat(localStorage.getItem('companyLogoSize') || '40'),
          // For report design settings, we'll use defaults or load from specific keys
          defaultReportPaperSize: (localStorage.getItem('reportDesignPaperSize') as "Letter" | "A4" | "A5") || "A4",
          includeCompanyLogo: localStorage.getItem('reportDesignIncludeLogo') === 'true',
          includeCompanyDetails: localStorage.getItem('reportDesignIncludeDetails') === 'true',
          reportContentFontSize: parseFloat(localStorage.getItem('reportDesignFontSize') || '14'),
        }
      : null;
    setCompanyDetails(storedCompanyDetails as MockCompanyDetails);
  };

  useEffect(() => {
    loadEmployees();
    loadCompanyDetails();
    window.addEventListener('mockDataUpdated', loadEmployees);
    window.addEventListener('companyDetailsUpdated', loadCompanyDetails); // Listen for company detail updates
    return () => {
      window.removeEventListener('mockDataUpdated', loadEmployees);
      window.removeEventListener('companyDetailsUpdated', loadCompanyDetails);
    };
  }, []);

  const handleAddEmployeeClick = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployeeClick = (employee: MockEmployee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployeeClick = (employee: MockEmployee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      const updatedEmployees = employees.filter(emp => emp.id !== employeeToDelete.id);
      setEmployees(updatedEmployees);
      localStorage.setItem("mockEmployees", JSON.stringify(updatedEmployees));
      showSuccess(`Employee ${employeeToDelete.firstName} ${employeeToDelete.lastName} removed.`);
      loadEmployees(); // Recalculate charts
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
    }
  };

  const handleSaveEmployee = (employeeData: EmployeeFormValues) => {
    let updatedEmployees: MockEmployee[];
    if (employeeData.id) {
      // Update existing employee
      updatedEmployees = employees.map(emp =>
        emp.id === employeeData.id ? { ...emp, ...employeeData } : emp
      );
    } else {
      // Add new employee
      const newId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
      updatedEmployees = [...employees, { ...employeeData, id: newId }];
    }
    setEmployees(updatedEmployees);
    localStorage.setItem("mockEmployees", JSON.stringify(updatedEmployees));
    loadEmployees(); // Recalculate charts
    setIsFormOpen(false);
    setEditingEmployee(null);
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
  };

  const handleDownloadProfile = (employee: MockEmployee) => {
    if (!companyDetails) {
      showError("Company details not loaded. Cannot generate profile.");
      return;
    }

    showSuccess(`Generating profile for ${employee.firstName} ${employee.lastName}...`);
    const profileHtml = generateEmployeeProfileReportContent(employee, companyDetails);

    html2pdf().from(profileHtml).set({
      margin: [10, 10, 10, 10],
      filename: `employee-profile-${employee.firstName}-${employee.lastName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  // Helper for PieChart legend formatter
  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalJobTitles = jobTitleDistribution.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Employees Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage all employee records, personal details, and employment information here.
      </p>
      
      <div className="flex justify-end">
        <Button onClick={handleAddEmployeeClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Employee
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Job Title</CardTitle>
            <CardDescription>Visual breakdown of employees across different roles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobTitleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60} // Added for Doughnut
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false} // Ensure no lines to labels
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {jobTitleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalJobTitles)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Salary by Job Title</CardTitle>
            <CardDescription>Comparison of average salaries across different job titles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averageSalaryByJobTitle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="salary" fill="#82ca9d" name="Average Salary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Salary/Rate</TableHead> {/* Updated header */}
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.id}</TableCell>
                      <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                      <TableCell>{employee.jobTitle}</TableCell>
                      <TableCell>{employee.department || "N/A"}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phoneNumber || "N/A"}</TableCell>
                      <TableCell>{employee.startDate}</TableCell>
                      <TableCell className="text-right">
                        {employee.salary ? `R ${employee.salary.toLocaleString('en-ZA')}` :
                         employee.hourlyRate ? `R ${employee.hourlyRate.toLocaleString('en-ZA')} / hr` : "N/A"}
                      </TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditEmployeeClick(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDownloadProfile(employee)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteEmployeeClick(employee)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employee data available. Please add employees using the button above or enable mock data in settings.
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the employee{" "}
              <span className="font-semibold">{employeeToDelete?.firstName} {employeeToDelete?.lastName}</span>{" "}
              and their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Employee Data Section</h3>
        <p className="text-sm">
          This section allows for full CRUD operations on employee records. In a real application, these actions would interact with a backend database.
        </p>
      </div>
    </div>
  );
};

export default Employees;