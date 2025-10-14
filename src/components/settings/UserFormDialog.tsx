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
import { showSuccess } from "@/utils/toast";

// Define the schema for user form validation
const userSchema = z.object({
  id: z.string().optional(), // ID is optional for new users
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  role: z.enum(["Admin", "Manager", "Staff", "Viewer"], { message: "Role is required" }),
  status: z.enum(["Active", "Inactive"]).default("Active"),
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
    defaultValues: initialUser || {
      name: "",
      email: "",
      role: "Staff",
      status: "Active",
    },
  });

  React.useEffect(() => {
    if (initialUser) {
      form.reset(initialUser);
    } else {
      form.reset({
        name: "",
        email: "",
        role: "Staff",
        status: "Active",
      });
    }
  }, [initialUser, form]);

  const onSubmit = (data: UserFormValues) => {
    onSave(data);
    onClose();
    showSuccess(initialUser ? "User updated successfully!" : "User added successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialUser ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {initialUser ? "Make changes to user details here." : "Fill in the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (<p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (<p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value) => form.setValue("role", value as "Admin" | "Manager" | "Staff" | "Viewer")} value={form.watch("role")}>
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
            <Select onValueChange={(value) => form.setValue("status", value as "Active" | "Inactive")} value={form.watch("status")}>
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
          <DialogFooter>
            <Button type="submit">{initialUser ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;