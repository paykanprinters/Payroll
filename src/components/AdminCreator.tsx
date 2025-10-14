"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const AdminCreator: React.FC = () => {
  const [isCreating, setIsCreating] = React.useState(false);

  const createAdminUser = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-initial-admin', {
        body: {
          fullName: "Mogamat Shafiek Christian",
          email: "info@compu-e.co.za",
          role: "Admin",
          password: "B@t00l$h@f13k"
        }
      });

      if (error) {
        console.error('Error invoking function:', error);
        showError(`Error creating user: ${error.message}`);
      } else {
        console.log('User creation successful:', data);
        showSuccess('Admin user "Mogamat Shafiek Christian" created successfully! You can now log in with this account.');
      }
    } catch (err: any) {
      console.error('Unhandled error:', err);
      showError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800 text-center">
      <p className="mb-2 text-sm">
        **Temporary Admin Creation Tool:** Use this button to create the specified admin user if you are locked out.
        **DELETE THIS COMPONENT AFTER USE.**
      </p>
      <Button onClick={createAdminUser} disabled={isCreating} className="w-full">
        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
        {isCreating ? "Creating Admin..." : "Create Admin User"}
      </Button>
    </div>
  );
};

export default AdminCreator;