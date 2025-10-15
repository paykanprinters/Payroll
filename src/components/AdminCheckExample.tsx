"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const AdminCheckExample: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <p>Loading user authentication status...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-yellow-500 bg-yellow-50 text-yellow-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Not Authenticated</CardTitle>
          <CardDescription>You need to log in to view this content.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isAdmin = user?.role === 'Admin';

  return (
    <Card className={isAdmin ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isAdmin ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          User Role Check
        </CardTitle>
        <CardDescription>
          This card demonstrates how to check if the current user is an Admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">Hello, {user?.name}!</p>
        <p>Your email: {user?.email}</p>
        <p>Your role: <span className="font-bold">{user?.role}</span></p>
        {isAdmin ? (
          <p className="mt-4">You are an <span className="font-bold">Admin</span>. You have full access.</p>
        ) : (
          <p className="mt-4">You are <span className="font-bold">NOT an Admin</span>. Access might be restricted.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCheckExample;