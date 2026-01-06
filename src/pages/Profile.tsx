"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";

type EmployeeContactFields = {
  phone_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
};

const emptyFields: EmployeeContactFields = {
  phone_number: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_contact_address: "",
  address_line1: "",
  address_line2: "",
  city: "",
  province: "",
  postal_code: "",
};

const Profile: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeFound, setEmployeeFound] = useState(false);
  const [fields, setFields] = useState<EmployeeContactFields>(emptyFields);

  const fetchMyEmployeeRecord = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // RLS policy expects employees.id to equal auth.uid() for staff
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, phone_number, emergency_contact_name, emergency_contact_number, emergency_contact_address, address_line1, address_line2, city, province, postal_code"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile: fetch employee error", error);
      setEmployeeFound(false);
      setLoading(false);
      return;
    }

    if (!data) {
      setEmployeeFound(false);
      setLoading(false);
      return;
    }

    setEmployeeFound(true);
    setFields({
      phone_number: data.phone_number ?? "",
      emergency_contact_name: data.emergency_contact_name ?? "",
      emergency_contact_number: data.emergency_contact_number ?? "",
      emergency_contact_address: data.emergency_contact_address ?? "",
      address_line1: data.address_line1 ?? "",
      address_line2: data.address_line2 ?? "",
      city: data.city ?? "",
      province: data.province ?? "",
      postal_code: data.postal_code ?? "",
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      fetchMyEmployeeRecord();
    }
  }, [isLoadingAuth, isAuthenticated, fetchMyEmployeeRecord]);

  const onChange = (key: keyof EmployeeContactFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({
        phone_number: fields.phone_number || null,
        emergency_contact_name: fields.emergency_contact_name || null,
        emergency_contact_number: fields.emergency_contact_number || null,
        emergency_contact_address: fields.emergency_contact_address || null,
        address_line1: fields.address_line1 || null,
        address_line2: fields.address_line2 || null,
        city: fields.city || null,
        province: fields.province || null,
        postal_code: fields.postal_code || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      console.error("Profile: save error", error);
      showError("Failed to save your contact details.");
      return;
    }
    showSuccess("Your contact details have been updated.");
    fetchMyEmployeeRecord();
  };

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            My Profile
          </CardTitle>
          <CardDescription>View and update your contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !employeeFound ? (
            <div className="p-4 rounded-lg bg-yellow-50 text-yellow-800">
              <p className="font-semibold mb-1">No employee record linked to your account.</p>
              <p className="text-sm">
                We could not find an employee profile associated with your login. Please contact your administrator to link your account to your employee record.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" value={fields.phone_number ?? ""} onChange={onChange("phone_number")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" value={fields.address_line1 ?? ""} onChange={onChange("address_line1")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" value={fields.address_line2 ?? ""} onChange={onChange("address_line2")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={fields.city ?? ""} onChange={onChange("city")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="province">Province</Label>
                <Input id="province" value={fields.province ?? ""} onChange={onChange("province")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input id="postal_code" value={fields.postal_code ?? ""} onChange={onChange("postal_code")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input id="emergency_contact_name" value={fields.emergency_contact_name ?? ""} onChange={onChange("emergency_contact_name")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                <Input id="emergency_contact_number" value={fields.emergency_contact_number ?? ""} onChange={onChange("emergency_contact_number")} className="mt-1" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="emergency_contact_address">Emergency Contact Address</Label>
                <Input id="emergency_contact_address" value={fields.emergency_contact_address ?? ""} onChange={onChange("emergency_contact_address")} className="mt-1" />
              </div>

              <div className="md:col-span-2">
                <Button onClick={onSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Access scope</h3>
        <p className="text-sm">
          Your profile page is limited to your own employee record. Administrators and managers can access organization-wide records from their respective pages.
        </p>
      </div>
    </div>
  );
};

export default Profile;