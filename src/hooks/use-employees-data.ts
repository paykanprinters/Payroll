import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { MockEmployee } from "@/lib/mock-data-interfaces";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type UseEmployeesDataProps = {
  isMockDataEnabled: boolean;
  companyName: string;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
};

function mapRowToMock(row: any): MockEmployee {
  return {
    id: row.id,
    customEmployeeId: row.custom_employee_id ?? row.id,
    personalId: row.personal_id ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    jobTitle: row.job_title,
    salary: row.salary ?? undefined,
    hourlyRate: row.hourly_rate ?? undefined,
    startDate: row.start_date,
    idNumber: row.id_number ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactNumber: row.emergency_contact_number ?? undefined,
    emergencyContactAddress: row.emergency_contact_address ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    city: row.city ?? undefined,
    province: row.province ?? undefined,
    postalCode: row.postal_code ?? undefined,
    taxReferenceNumber: row.tax_reference_number ?? undefined,
    uifNumber: row.uif_number ?? undefined,
    bankName: row.bank_name ?? undefined,
    bankAccountHolder: row.bank_account_holder ?? undefined,
    accountNumber: row.account_number ?? undefined,
    branchCode: row.branch_code ?? undefined,
    bankAccountType: row.bank_account_type ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    gender: row.gender ?? undefined,
    department: row.department ?? undefined,
    workLocation: row.work_location ?? undefined,
    dateOfConfirmation: row.date_of_confirmation ?? undefined,
    originCountry: row.origin_country ?? undefined,
    employmentType: row.employment_type ?? undefined,
    portalAccess: row.portal_access ?? undefined,
    fathersName: row.fathers_name ?? undefined,
    molId: row.mol_id ?? undefined,
    permanentAddress: row.permanent_address ?? undefined,
    paymentMode: row.payment_mode ?? undefined,
    payFrequency: row.pay_frequency ?? undefined,
    standardDailyHours: row.standard_daily_hours ?? undefined,
    ignoredIncompleteFields: row.ignored_incomplete_fields ?? undefined,
  };
}

function mapMockToRow(input: Partial<MockEmployee>): any {
  const r: any = {};
  if (input.id) r.id = input.id;
  if (input.customEmployeeId) r.custom_employee_id = input.customEmployeeId;
  if (input.personalId) r.personal_id = input.personalId;
  if (input.firstName) r.first_name = input.firstName;
  if (input.lastName) r.last_name = input.lastName;
  if (input.email) r.email = input.email;
  if (input.jobTitle) r.job_title = input.jobTitle;
  if (input.salary !== undefined) r.salary = input.salary;
  if (input.hourlyRate !== undefined) r.hourly_rate = input.hourlyRate;
  if (input.startDate) r.start_date = input.startDate;
  if (input.idNumber) r.id_number = input.idNumber;
  if (input.phoneNumber) r.phone_number = input.phoneNumber;
  if (input.emergencyContactName) r.emergency_contact_name = input.emergencyContactName;
  if (input.emergencyContactNumber) r.emergency_contact_number = input.emergencyContactNumber;
  if (input.emergencyContactAddress) r.emergency_contact_address = input.emergencyContactAddress;
  if (input.addressLine1) r.address_line1 = input.addressLine1;
  if (input.addressLine2) r.address_line2 = input.addressLine2;
  if (input.city) r.city = input.city;
  if (input.province) r.province = input.province;
  if (input.postalCode) r.postal_code = input.postalCode;
  if (input.taxReferenceNumber) r.tax_reference_number = input.taxReferenceNumber;
  if (input.uifNumber) r.uif_number = input.uifNumber;
  if (input.bankName) r.bank_name = input.bankName;
  if (input.bankAccountHolder) r.bank_account_holder = input.bankAccountHolder;
  if (input.accountNumber) r.account_number = input.accountNumber;
  if (input.branchCode) r.branch_code = input.branchCode;
  if (input.bankAccountType) r.bank_account_type = input.bankAccountType;
  if (input.dateOfBirth) r.date_of_birth = input.dateOfBirth;
  if (input.gender) r.gender = input.gender;
  if (input.department) r.department = input.department;
  if (input.workLocation) r.work_location = input.workLocation;
  if (input.dateOfConfirmation) r.date_of_confirmation = input.dateOfConfirmation;
  if (input.originCountry) r.origin_country = input.originCountry;
  if (input.employmentType) r.employment_type = input.employmentType;
  if (input.portalAccess !== undefined) r.portal_access = input.portalAccess;
  if (input.fathersName) r.fathers_name = input.fathersName;
  if (input.molId) r.mol_id = input.molId;
  if (input.permanentAddress) r.permanent_address = input.permanentAddress;
  if (input.paymentMode) r.payment_mode = input.paymentMode;
  if (input.payFrequency) r.pay_frequency = input.payFrequency;
  if (input.standardDailyHours !== undefined) r.standard_daily_hours = input.standardDailyHours;
  if (input.ignoredIncompleteFields) r.ignored_incomplete_fields = input.ignoredIncompleteFields;
  return r;
}

export function useEmployeesData({ isMockDataEnabled, companyName, isAuthenticated, isLoadingAuth }: UseEmployeesDataProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isMutatingEmployee, setIsMutatingEmployee] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (isMockDataEnabled) {
      const stored = localStorage.getItem("mockEmployees");
      setEmployees(stored ? (JSON.parse(stored) as MockEmployee[]) : []);
      setIsLoadingEmployees(false);
      return;
    }
    if (!isAuthenticated || isLoadingAuth) {
      setEmployees([]);
      setIsLoadingEmployees(false);
      return;
    }
    setIsLoadingEmployees(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("last_name", { ascending: true });
    if (error) {
      toast({ title: "Failed to load employees", description: error.message, variant: "destructive" });
      setEmployees([]);
    } else {
      setEmployees((data || []).map(mapRowToMock));
    }
    setIsLoadingEmployees(false);
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addOrUpdateEmployee = useCallback(async (formValues: any) => {
    setIsMutatingEmployee(true);
    try {
      if (isMockDataEnabled) {
        setEmployees(prev => {
          let updated: MockEmployee[];
          const existsIdx = prev.findIndex(e => e.id === formValues.id);
          if (existsIdx !== -1) {
            updated = prev.map((e, i) => (i === existsIdx ? { ...e, ...formValues } : e));
          } else {
            const id = formValues.id ?? crypto.randomUUID();
            const customEmployeeId = formValues.customEmployeeId ?? `${(companyName || "ACME").slice(0, 3).toUpperCase()}-${String(prev.length + 1).padStart(4, "0")}`;
            updated = [...prev, { ...formValues, id, customEmployeeId }];
          }
          localStorage.setItem("mockEmployees", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("employeesUpdated"));
          return updated;
        });
        return;
      }
      const row = mapMockToRow(formValues);
      const { data, error } = await supabase
        .from("employees")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .maybeSingle();
      if (error) {
        toast({ title: "Failed to save employee", description: error.message, variant: "destructive" });
      } else if (data) {
        setEmployees(prev => {
          const mapped = mapRowToMock(data);
          const idx = prev.findIndex(e => e.id === mapped.id);
          const next = idx !== -1 ? prev.map((e, i) => (i === idx ? mapped : e)) : [...prev, mapped];
          window.dispatchEvent(new CustomEvent("employeesUpdated"));
          return next;
        });
      }
    } finally {
      setIsMutatingEmployee(false);
    }
  }, [isMockDataEnabled, companyName, toast]);

  const deleteEmployee = useCallback(async (id: string, _displayName?: string) => {
    setIsMutatingEmployee(true);
    try {
      if (isMockDataEnabled) {
        setEmployees(prev => {
          const updated = prev.filter(e => e.id !== id);
          localStorage.setItem("mockEmployees", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("employeesUpdated"));
          return updated;
        });
        return;
      }
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) {
        toast({ title: "Failed to delete employee", description: error.message, variant: "destructive" });
      } else {
        setEmployees(prev => {
          const updated = prev.filter(e => e.id !== id);
          window.dispatchEvent(new CustomEvent("employeesUpdated"));
          return updated;
        });
      }
    } finally {
      setIsMutatingEmployee(false);
    }
  }, [isMockDataEnabled, toast]);

  return {
    employees,
    isLoadingEmployees,
    isMutatingEmployee,
    addOrUpdateEmployee,
    deleteEmployee,
  };
}