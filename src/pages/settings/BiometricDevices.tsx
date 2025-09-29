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
  devicePort: z.string().min(1, "Device Port is required"),
  deviceNumber: z.string().min(1, "Device Number is required"),
});

type BiometricDeviceFormValues = z.infer<typeof biometricDeviceSchema>;

const BiometricDevices: React.FC = () => {
  const form = useForm<BiometricDeviceFormValues>({
    resolver: zodResolver(biometricDeviceSchema),
    defaultValues: {
      devicePort: "",
      deviceNumber: "",
    },
  });

  const handleTestConnectivity = async () => {
    const { devicePort, deviceNumber } = form.getValues();
    if (!devicePort || !deviceNumber) {
      showError("Please enter both Device Port and Device Number to test connectivity.");
      return;
    }

    const toastId = showLoading("Testing connectivity...");
    console.log(`Attempting to test connectivity to device on port: ${devicePort}, number: ${deviceNumber}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success or failure
    const isConnected = Math.random() > 0.5; // 50% chance of success

    dismissToast(toastId);
    if (isConnected) {
      showSuccess(`Successfully connected to device on port ${devicePort}, number ${deviceNumber}!`);
    } else {
      showError(`Failed to connect to device on port ${devicePort}, number ${deviceNumber}. Please check settings.`);
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
      showSuccess(`Biometric device ${data.deviceNumber} added successfully!`);
      form.reset(); // Clear form after successful addition
    } else {
      showError(`Failed to add biometric device ${data.deviceNumber}. Please try again.`);
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
              <Label htmlFor="devicePort">Device Port</Label>
              <Input
                id="devicePort"
                {...form.register("devicePort")}
                className="mt-1"
                placeholder="e.g., COM1, /dev/ttyUSB0, 8080"
              />
              {form.formState.errors.devicePort && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.devicePort.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="deviceNumber">Device Number / ID</Label>
              <Input
                id="deviceNumber"
                {...form.register("deviceNumber")}
                className="mt-1"
                placeholder="e.g., 1, 101, ABC-123"
              />
              {form.formState.errors.deviceNumber && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.deviceNumber.message}</p>
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