"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Plus } from "lucide-react"; // For the add button next to Zone Name

// Define the schema for form validation
const biometricDeviceSchema = z.object({
  deviceName: z.string().min(1, "Device Name is required"),
  zoneName: z.string().min(1, "Zone Name is required"),
  deviceType: z.enum(["Direct", "Indirect"], { message: "Device Type is required" }),
  deviceModel: z.string().min(1, "Device is required"), // Renamed from 'device' to 'deviceModel'
  deviceCategory: z.enum(["Attendance", "Access Control"], { message: "Device Category is required" }),
  punchType: z.enum(["IN/OUT", "IN", "OUT"], { message: "Punch Type is required" }),
  locationId: z.string().default("LOCAL"),
  enabled: z.boolean().default(true),
  ipAddress: z.string().ip({ message: "Invalid IP Address format" }).min(1, "IP Address is required"),
  portNumber: z.string().regex(/^\d+$/, "Port Number must be a number").min(1, "Port Number is required"),
});

type BiometricDeviceFormValues = z.infer<typeof biometricDeviceSchema>;

const BiometricDevices: React.FC = () => {
  const form = useForm<BiometricDeviceFormValues>({
    resolver: zodResolver(biometricDeviceSchema),
    defaultValues: {
      deviceName: "",
      zoneName: "",
      deviceType: "Direct",
      deviceModel: "ZKTeco",
      deviceCategory: "Attendance",
      punchType: "IN/OUT",
      locationId: "LOCAL",
      enabled: true,
      ipAddress: "",
      portNumber: "4370", // Default port number
    },
  });

  const handleTestConnectivity = async () => {
    const { deviceName, ipAddress, portNumber, zoneName } = form.getValues();
    if (!deviceName || !ipAddress || !portNumber || !zoneName) {
      showError("Please enter Device Name, Zone Name, IP Address, and Port Number to test connectivity.");
      return;
    }

    const toastId = showLoading(`Testing connectivity to device '${deviceName}' at ${ipAddress}:${portNumber} in ${zoneName}...`);
    console.log(`Attempting to test connectivity to device at IP: ${ipAddress}, Port: ${portNumber}, Device Name: ${deviceName}, Zone: ${zoneName}`);

    // Simulate API call to a backend service that would then communicate with the device
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success or failure
    const isConnected = Math.random() > 0.5; // 50% chance of success

    dismissToast(toastId);
    if (isConnected) {
      showSuccess(`Successfully connected to device '${deviceName}' at ${ipAddress}:${portNumber} in ${zoneName}!`);
    } else {
      showError(`Failed to connect to device '${deviceName}' at ${ipAddress}:${portNumber} in ${zoneName}. Please check settings.`);
    }
  };

  const onSubmit = async (data: BiometricDeviceFormValues) => {
    const toastId = showLoading("Adding biometric device...");
    console.log("Adding biometric device:", data);

    // Simulate API call to add device via a backend service
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success or failure
    const isAdded = Math.random() > 0.5; // 50% chance of success

    dismissToast(toastId);
    if (isAdded) {
      showSuccess(`Biometric device '${data.deviceName}' (${data.ipAddress}:${data.portNumber}) added successfully!`);
      form.reset(); // Clear form after successful addition
    } else {
      showError(`Failed to add biometric device '${data.deviceName}'. Please try again.`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biometric Devices</CardTitle>
        <CardDescription>
          Configure and manage connections to your biometric time-tracking devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add New Device</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  {...form.register("deviceName")}
                  className="mt-1"
                  placeholder="e.g., Chicago Main Gate"
                />
                {form.formState.errors.deviceName && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.deviceName.message}</p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="zoneName">Zone Name</Label>
                  <Input
                    id="zoneName"
                    {...form.register("zoneName")}
                    className="mt-1"
                    placeholder="e.g., Chicago"
                  />
                  {form.formState.errors.zoneName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.zoneName.message}</p>
                  )}
                </div>
                <Button type="button" variant="outline" size="icon" className="mb-1">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deviceType">Device Type</Label>
                <Select
                  onValueChange={(value) => form.setValue("deviceType", value as "Direct" | "Indirect")}
                  value={form.watch("deviceType")}
                >
                  <SelectTrigger id="deviceType" className="mt-1">
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="Indirect">Indirect</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.deviceType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.deviceType.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="deviceModel">Device</Label>
                <Select
                  onValueChange={(value) => form.setValue("deviceModel", value)}
                  value={form.watch("deviceModel")}
                >
                  <SelectTrigger id="deviceModel" className="mt-1">
                    <SelectValue placeholder="Select device model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZKTeco">ZKTeco</SelectItem>
                    <SelectItem value="Hikvision">Hikvision</SelectItem>
                    <SelectItem value="Suprema">Suprema</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.deviceModel && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.deviceModel.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deviceCategory">Device Category</Label>
                <Select
                  onValueChange={(value) => form.setValue("deviceCategory", value as "Attendance" | "Access Control")}
                  value={form.watch("deviceCategory")}
                >
                  <SelectTrigger id="deviceCategory" className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Attendance">Attendance</SelectItem>
                    <SelectItem value="Access Control">Access Control</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.deviceCategory && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.deviceCategory.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="punchType">Punch Type</Label>
                <Select
                  onValueChange={(value) => form.setValue("punchType", value as "IN/OUT" | "IN" | "OUT")}
                  value={form.watch("punchType")}
                >
                  <SelectTrigger id="punchType" className="mt-1">
                    <SelectValue placeholder="Select punch type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN/OUT">IN/OUT</SelectItem>
                    <SelectItem value="IN">IN</SelectItem>
                    <SelectItem value="OUT">OUT</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.punchType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.punchType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationId">Location Id</Label>
                <Input
                  id="locationId"
                  {...form.register("locationId")}
                  className="mt-1"
                  placeholder="e.g., LOCAL"
                />
                {form.formState.errors.locationId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.locationId.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-6 md:mt-0">
                <Checkbox
                  id="enabled"
                  checked={form.watch("enabled")}
                  onCheckedChange={(checked) => form.setValue("enabled", checked as boolean)}
                />
                <Label htmlFor="enabled">Enabled?</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">IP Address & Port Number</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  {...form.register("ipAddress")}
                  className="mt-1"
                  placeholder="e.g., 192.168.1.200"
                />
                {form.formState.errors.ipAddress && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.ipAddress.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="portNumber">Port Number</Label>
                <Input
                  id="portNumber"
                  {...form.register("portNumber")}
                  className="mt-1"
                  placeholder="e.g., 4370 (common for ZKTeco)"
                />
                {form.formState.errors.portNumber && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.portNumber.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button type="button" variant="outline" onClick={handleTestConnectivity} className="flex-1">
              Test Connectivity
            </Button>
            <Button type="submit" className="flex-1">
              Add Biometric Device
            </Button>
          </div>

          <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
            <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
            <p className="text-sm">
              Actual communication with physical biometric devices on a local network typically requires a dedicated backend service or a local agent application for security and hardware interaction. This interface provides the UI for configuration, but the underlying connection logic would need to be implemented on the server-side or a local service that the web app can communicate with (e.g., via WebSockets or a local API).
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BiometricDevices;