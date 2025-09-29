"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

// Define the schema for form validation
const biometricDeviceSchema = z.object({
  areaName: z.string().min(1, "Area Name is required"),
  ipAddress: z.string().ip({ message: "Invalid IP Address format" }).min(1, "IP Address is required"),
  portNumber: z.string().regex(/^\d+$/, "Port Number must be a number").min(1, "Port Number is required"),
});

type BiometricDeviceFormValues = z.infer<typeof biometricDeviceSchema>;

const BiometricDevices: React.FC = () => {
  const form = useForm<BiometricDeviceFormValues>({
    resolver: zodResolver(biometricDeviceSchema),
    defaultValues: {
      areaName: "",
      ipAddress: "",
      portNumber: "",
    },
  });

  const handleTestConnectivity = async () => {
    const { areaName, ipAddress, portNumber } = form.getValues();
    if (!areaName || !ipAddress || !portNumber) {
      showError("Please enter Area Name, IP Address, and Port Number to test connectivity.");
      return;
    }

    const toastId = showLoading(`Testing connectivity to device at ${ipAddress}:${portNumber} in ${areaName}...`);
    console.log(`Attempting to test connectivity to device at IP: ${ipAddress}, Port: ${portNumber}, Area: ${areaName}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success or failure
    const isConnected = Math.random() > 0.5; // 50% chance of success

    dismissToast(toastId);
    if (isConnected) {
      showSuccess(`Successfully connected to device at ${ipAddress}:${portNumber} in ${areaName}!`);
    } else {
      showError(`Failed to connect to device at ${ipAddress}:${portNumber} in ${areaName}. Please check settings.`);
    }
  };

  const onSubmit = async (data: BiometricDeviceFormValues) => {
    const toastId = showLoading("Adding biometric device...");
    console.log("Adding biometric device:", data);

    // Simulate API call to add device
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success or failure
    const isAdded = Math.random() > 0.5; // 50% chance of success

    dismissToast(toastId);
    if (isAdded) {
      showSuccess(`Biometric device in ${data.areaName} (${data.ipAddress}:${data.portNumber}) added successfully!`);
      form.reset(); // Clear form after successful addition
    } else {
      showError(`Failed to add biometric device in ${data.areaName}. Please try again.`);
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
            <h3 className="text-lg font-semibold">Device Connection Details</h3>
            <div>
              <Label htmlFor="areaName">Area Name</Label>
              <Input
                id="areaName"
                {...form.register("areaName")}
                className="mt-1"
                placeholder="e.g., Main Office, Factory Floor, Branch A"
              />
              {form.formState.errors.areaName && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.areaName.message}</p>
              )}
            </div>
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
              Actual communication with physical biometric devices typically requires a backend service or specialized browser APIs (like WebUSB or WebSerial) for security and hardware interaction. This interface provides the UI for configuration, but the underlying connection logic would need to be implemented on the server-side.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BiometricDevices;