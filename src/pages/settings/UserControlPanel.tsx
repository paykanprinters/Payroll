"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
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
import UserFormDialog, { UserFormValues } from "@/components/settings/UserFormDialog"; // Import the new dialog

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Staff" | "Viewer";
  status: "Active" | "Inactive";
}

const initialMockUsers: UserData[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active" },
  { id: "2", name: "Manager Smith", email: "manager@example.com", role: "Manager", status: "Active" },
  { id: "3", name: "Staff Johnson", email: "staff@example.com", role: "Staff", status: "Active" },
  { id: "4", name: "Viewer Brown", email: "viewer@example.com", role: "Viewer", status: "Active" },
  { id: "5", name: "Inactive User", email: "inactive@example.com", role: "Staff", status: "Inactive" },
];

const UserControlPanel: React.FC = () => {
  const [users, setUsers] = React.useState<UserData[]>(initialMockUsers);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("All");

  const [isUserFormOpen, setIsUserFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserFormValues | null>(null);
  const [isUserDeleteDialogOpen, setIsUserDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserData | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "All" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleAddUserClick = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUserClick = (user: UserData) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleDeleteUserClick = (user: UserData) => {
    setUserToDelete(user);
    setIsUserDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userToDelete.id));
      setIsUserDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleSaveUser = (userData: UserFormValues) => {
    if (userData.id) {
      // Update existing user
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === userData.id ? { ...user, ...userData } : user
      ));
    } else {
      // Add new user
      const newId = (Math.max(...prevUsers.map(u => parseInt(u.id))) + 1).toString();
      setUsers(prevUsers => [...prevUsers, { ...userData, id: newId }]);
    }
    setIsUserFormOpen(false);
    setEditingUser(null);
  };

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
            <Button onClick={handleAddUserClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
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
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-role">Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
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
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-center items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUserClick(user)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUserClick(user)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
          This is a mock-up of a user control panel. In a real application, user data would be fetched from a backend database, and actions like adding, editing, or deleting users would involve API calls to manage user accounts and roles securely.
        </p>
      </div>

      <UserFormDialog
        isOpen={isUserFormOpen}
        onClose={() => setIsUserFormOpen(false)}
        onSave={handleSaveUser}
        initialUser={editingUser}
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