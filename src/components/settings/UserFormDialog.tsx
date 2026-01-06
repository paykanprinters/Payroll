"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Eye, EyeOff, RefreshCcw, Mail, ShieldCheck } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  role: z.enum(["Admin", "Manager", "Staff", "Viewer"], { message: "Role is required" }),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
}).superRefine((data, ctx) => {
  if (!data.id && !data.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password is required for new users.",
      path: ["password"],
    });
  }
});

export type UserFormValues = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserFormValues) => void;
  initialUser?: UserFormValues | null;
}

const UserFormDialog: React.FC<UserFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialUser,
}) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: initialUser ? { ...initialUser, password: "" } : {
      name: "",
      email: "",
      role: "Staff",
      status: "Active",
      password: "",
    },
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const { isMockDataEnabled } = usePayrollProcessor();

  React.useEffect(() => {
    if (initialUser) {
      form.reset({ ...initialUser, password: "" });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "Staff",
        status: "Active",
        password: "",
      });
    }
  }, [initialUser, form]);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", newPassword, { shouldValidate: true });
    showSuccess("Password generated!");
  };

  const handleResendConfirmationEmail = async () => {
    if (isMockDataEnabled) {
      showError("Cannot resend confirmation email when mock data is enabled.");
      return;
    }
    if (!initialUser?.email) {
      showError("No email address available to resend confirmation.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: initialUser.email,
    });

    if (error) {
      console.error("Error resending confirmation email:", error);
      showError(`Failed to resend confirmation email: ${error.message}`);
    } else {
      showSuccess(`Confirmation email sent to ${initialUser.email}!`);
    }
  };

  const handleForceConfirmEmail = async () => {
    if (isMockDataEnabled) {
      showError("Cannot confirm email when mock data is enabled.");
      return;
    }
    if (!initialUser?.id) {
      showError("User ID not available.");
      return;
    }
    const res = await supabase.functions.invoke("confirm-user-email", {
      body: JSON.stringify({ userId: initialUser.id }),
    });
    if (res.error) {
      console.error("Force confirm email error:", res.error);
      const serverMsg = typeof res.error?.message === "string" ? res.error.message : (res.data as any)?.error;
      showError(serverMsg || "Failed to confirm user email.");
      return;
    }
    showSuccess("User email confirmed successfully.");
  };

  const onSubmit = (data: UserFormValues) => {
    if (isMockDataEnabled) {
      showError("Cannot save user to Supabase when mock data is enabled.");
      return;
    }
    onSave(data);
    onClose();
    showSuccess(initialUser ? "User updated successfully!" : "User added successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialUser ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {initialUser ? "Make changes to user details here." : "Fill in the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} disabled={isMockDataEnabled} />
            {form.formState.errors.name && (<p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} disabled={isMockDataEnabled} />
            {form.formState.errors.email && (<p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value) => form.setValue("role", value as "Admin" | "Manager" | "Staff" | "Viewer")} value={form.watch("role")} disabled={isMockDataEnabled}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (<p className="text-red-500 text-sm">{form.formState.errors.role.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => form.setValue("status", value as "Active" | "Inactive")} value={form.watch("status")} disabled={isMockDataEnabled}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (<p className="text-red-500 text-sm">{form.formState.errors.status.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password {initialUser && <span className="text-muted-foreground">(Leave blank to keep current)</span>}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
                className="pr-10"
                disabled={isMockDataEnabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isMockDataEnabled}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.password && (<p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>)}
            <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="mt-2 w-full" disabled={isMockDataEnabled}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Generate Password
            </Button>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            {initialUser && (
              <>
                <Button type="button" variant="outline" onClick={handleResendConfirmationEmail} disabled={isMockDataEnabled}>
                  <Mail className="mr-2 h-4 w-4" /> Resend Confirmation
                </Button>
                <Button type="button" variant="outline" onClick={handleForceConfirmEmail} disabled={isMockDataEnabled}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Force Confirm Email
                </Button>
              </>
            )}
            <Button type="submit" disabled={isMockDataEnabled}>{initialUser ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;