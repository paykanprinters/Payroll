"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import UserFormDialog, { UserFormValues } from "@/components/settings/UserFormDialog";
import AdminPolicyBadge from "@/components/settings/AdminPolicyBadge";
import LinkEmployeeDialog from "@/components/settings/LinkEmployeeDialog";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePayrollProcessor } from "@/context/PayrollDataContext"; // Import usePayrollProcessor

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Staff" | "Viewer";
  status: "Active" | "Inactive";
}

const initialMockUsersForSeeding = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active", password: "password" },
  { id: "2", name: "Manager Smith", email: "manager@example.com", role: "Manager", status: "Active", password: "password" },
  { id: "3", name: "Staff Johnson", email: "staff@example.com", role: "Staff", status: "Active", password: "password" },
  { id: "4", name: "Viewer Brown", email: "viewer@example.com", role: "Viewer", status: "Active", password: "password" },
  { id: "5", name: "Inactive User", email: "inactive@example.com", role: "Staff", status: "Inactive", password: "password" },
];

const UserControlPanel: React.FC = () => {
  const [users, setUsers] = React.useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("All");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const [isUserFormOpen, setIsUserFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserFormValues | null>(null);
  const [isUserDeleteDialogOpen, setIsUserDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserData | null>(null);

  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [linkTargetUser, setLinkTargetUser] = React.useState<UserData | null>(null);
  const [linkedMap, setLinkedMap] = React.useState<Record<string, { id: string; name: string; customId: string } | null>>({}); // userId -> employee summary

  const { user: currentUser, isAuthenticated } = useAuth();
  const { isMockDataEnabled, employees } = usePayrollProcessor(); // Get mock data status & employees

  const fetchUsers = React.useCallback(async () => {
    if (isMockDataEnabled) {
      setUsers([]);
      setLinkedMap({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });

    if (error) {
      console.error("Error fetching users:", error);
      showError("Failed to load users.");
      setUsers([]);
      setLinkedMap({});
    } else {
      const fetched = data as UserData[];
      setUsers(fetched);

      const { data: empRows, error: empErr } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, custom_employee_id');

      if (empErr) {
        console.error("Error fetching employees for link mapping:", empErr);
        setLinkedMap({});
      } else {
        const map: Record<string, { id: string; name: string; customId: string } | null> = {};
        fetched.forEach(u => { map[u.id] = null; });
        (empRows || []).forEach((row: any) => {
          if (row.user_id) {
            map[row.user_id] = {
              id: row.id,
              name: `${row.first_name} ${row.last_name}`,
              customId: row.custom_employee_id ?? "",
            };
          }
        });
        setLinkedMap(map);
      }
    }
    setIsLoading(false);
  }, [isMockDataEnabled]);

  const seedInitialUsers = React.useCallback(async () => {
    if (isMockDataEnabled) {
      showError("Cannot seed users to Supabase when mock data is enabled.");
      return;
    }
    setIsSeeding(true);
    try {
      const response = await supabase.functions.invoke('seed-users', {
        body: JSON.stringify({ users: initialMockUsersForSeeding }),
      });

      if (response.error) {
        console.error('Error seeding users via Edge Function:', response.error);
        showError('Failed to seed initial users.');
      } else {
        console.log('Seed users Edge Function response:', response.data);
        showSuccess('Initial users seeded successfully!');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error invoking seed-users Edge Function:', error);
      showError('Failed to invoke user seeding process.');
    } finally {
      setIsSeeding(false);
    }
  }, [fetchUsers, isMockDataEnabled]);

  React.useEffect(() => {
    if (isAuthenticated && !isMockDataEnabled) { // Only fetch if authenticated and not using mock data
      fetchUsers();
    } else if (isMockDataEnabled) {
      setUsers([]); // Clear users if mock data is enabled
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchUsers, isMockDataEnabled]);

  React.useEffect(() => {
    const checkAndSeed = async () => {
      if (isAuthenticated && !isLoading && users.length === 0 && !isSeeding && !isMockDataEnabled) {
        const { count, error } = await supabase.from('users').select('id', { count: 'exact' });
        if (error) {
          console.error('Error checking user count for seeding:', error);
          return;
        }
        if (count === 0) {
          console.log('No users found in database, initiating seeding process...');
          seedInitialUsers();
        }
      }
    };
    checkAndSeed();
  }, [isAuthenticated, isLoading, users.length, isSeeding, seedInitialUsers, isMockDataEnabled]);


  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "All" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleAddUserClick = () => {
    if (isMockDataEnabled) {
      showError("Cannot add users to Supabase when mock data is enabled.");
      return;
    }
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUserClick = (user: UserData) => {
    if (isMockDataEnabled) {
      showError("Cannot edit users in Supabase when mock data is enabled.");
      return;
    }
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleDeleteUserClick = (user: UserData) => {
    if (isMockDataEnabled) {
      showError("Cannot delete users from Supabase when mock data is enabled.");
      return;
    }
    setUserToDelete(user);
    setIsUserDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || isMockDataEnabled) return;

    setIsLoading(true);
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userToDelete.id);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      showError("Failed to delete user profile.");
      setIsLoading(false);
      return;
    }

    showSuccess(`User ${userToDelete.name} deleted successfully!`);
    fetchUsers();
    setIsUserDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleSaveUser = async (userData: UserFormValues) => {
    if (isMockDataEnabled) {
      showError("Cannot save user to Supabase when mock data is enabled.");
      return;
    }
    setIsLoading(true);
    if (userData.id) {
      const { error } = await supabase
        .from('users')
        .update({ name: userData.name, email: userData.email, role: userData.role, status: userData.status })
        .eq('id', userData.id);

      if (error) {
        console.error("Error updating user:", error);
        showError("Failed to update user.");
      } else {
        showSuccess(`User ${userData.name} updated successfully!`);
        fetchUsers();
      }

      const resMeta = await supabase.functions.invoke('update-user-metadata', {
        body: JSON.stringify({
          userId: userData.id,
          metadata: { name: userData.name, role: userData.role, status: userData.status },
        }),
      });

      if (resMeta.error) {
        console.error("Error updating user metadata via Edge Function:", resMeta.error);
        const serverMsgMeta = typeof resMeta.error?.message === 'string' ? resMeta.error.message : (resMeta.data as any)?.error;
        showError(serverMsgMeta || "Failed to update user display name in Auth system.");
      } else {
        console.log("User metadata updated:", resMeta.data);
      }

      if (userData.password) {
        const res = await supabase.functions.invoke('update-user-password', {
          body: JSON.stringify({ userId: userData.id, newPassword: userData.password }),
        });
        if (res.error) {
          console.error("Error updating user password via Edge Function:", res.error);
          const serverMsg = typeof res.error?.message === 'string' ? res.error.message : (res.data as any)?.error;
          showError(serverMsg || "Failed to update user password.");
        } else {
          showSuccess("User password updated successfully!");
        }
      }

    } else {
      // The signup trigger creates the profile row with a forced 'Staff' role
      // (role is never read from metadata). The admin then sets the intended
      // role with a direct update, which RLS only permits for Admins.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password!,
        options: {
          data: {
            name: userData.name,
          },
        },
      });

      if (authError) {
        console.error("Error signing up new user:", authError);
        showError(authError.message);
      } else if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            name: userData.name,
            role: userData.role,
            status: userData.status,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error("Error updating new user profile:", profileError);
          showError("Failed to set role on the new user profile.");
        } else {
          showSuccess(`User ${userData.name} added successfully!`);
          fetchUsers();
        }
      }
    }
    setIsUserFormOpen(false);
    setEditingUser(null);
    setIsLoading(false);
  };

  const canManageUsers = currentUser?.role === 'Admin';

  const openLinkDialog = (user: UserData) => {
    if (isMockDataEnabled) {
      showError("Cannot link employees when mock data is enabled.");
      return;
    }
    setLinkTargetUser(user);
    setIsLinkDialogOpen(true);
  };

  const refreshLinkedForUser = (userId: string) => {
    supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, custom_employee_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setLinkedMap(prev => ({
          ...prev,
          [userId]: data
            ? { id: data.id, name: `${data.first_name} ${data.last_name}`, customId: data.custom_employee_id ?? "" }
            : null
        }));
      });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <Card className="border-red-500 bg-red-50 text-red-800">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have the necessary permissions to view or manage user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Only users with the 'Admin' role can access the User Control Panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Control Panel</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and access permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">All Users</h3>
            <Button onClick={handleAddUserClick} disabled={isSeeding || isMockDataEnabled}>
              {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isSeeding ? "Seeding..." : "Add New User"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-2">
              <Label htmlFor="search-users">Search Users</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-users"
                  placeholder="Search by name or email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isMockDataEnabled}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-role">Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole} disabled={isMockDataEnabled}>
                <SelectTrigger id="filter-role" className="mt-1">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Linked Employee</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AdminPolicyBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        {linkedMap[user.id] ? (
                          <span className="text-sm">
                            {linkedMap[user.id]?.name}
                            {linkedMap[user.id]?.customId ? ` (${linkedMap[user.id]?.customId})` : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-center items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUserClick(user)} disabled={isMockDataEnabled}>Edit</Button>
                        <Button variant="secondary" size="sm" onClick={() => openLinkDialog(user)} disabled={isMockDataEnabled}>Link Employee</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUserClick(user)} disabled={isMockDataEnabled}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">User Management Notes:</h3>
        <p className="text-sm">
          This user control panel now interacts with a Supabase backend. User data is fetched from the `public.users` table, and actions like adding, editing, or deleting users involve API calls to manage user accounts and roles securely. Initial mock users are seeded automatically if the database is empty.
        </p>
      </div>

      <UserFormDialog
        isOpen={isUserFormOpen}
        onClose={() => setIsUserFormOpen(false)}
        onSave={handleSaveUser}
        initialUser={editingUser}
      />

      <LinkEmployeeDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        user={linkTargetUser ? { id: linkTargetUser.id, email: linkTargetUser.email, name: linkTargetUser.name } : null}
        employees={employees}
        currentLinkedEmployeeId={linkTargetUser ? linkedMap[linkTargetUser.id]?.id ?? null : null}
        onLinkedChange={(linkedId) => {
          if (linkTargetUser) {
            refreshLinkedForUser(linkTargetUser.id);
          }
        }}
      />

      <AlertDialog open={isUserDeleteDialogOpen} onOpenChange={setIsUserDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user{" "}
              <span className="font-semibold">{userToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserControlPanel;