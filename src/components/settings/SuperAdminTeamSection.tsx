
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, User, CircleUser } from 'lucide-react';

interface SuperAdminTeamSectionProps {
  isVisible: boolean;
}

const SuperAdminTeamSection = ({ isVisible }: SuperAdminTeamSectionProps) => {
  // Sample data for super admin team
  const adminTeam = [
    { name: "Jane Smith", email: "jane@caregrowth.ai", role: "Owner" },
    { name: "Mark Johnson", email: "mark@caregrowth.ai", role: "Admin" },
    { name: "Sarah Wilson", email: "sarah@caregrowth.ai", role: "Developer" }
  ];

  if (!isVisible) return null;

  return (
    <Card className="shadow-md border-t-4 border-t-purple-500">
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="h-6 w-6 text-purple-600" />
        <div>
          <CardTitle>Super Admin Roles &amp; Permissions</CardTitle>
          <CardDescription>
            Manage platform administrator access and privileges
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminTeam.map((admin, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CircleUser className="h-5 w-5 text-gray-500" />
                    {admin.name}
                  </div>
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    admin.role === 'Owner' ? 'bg-purple-100 text-purple-800' : 
                    admin.role === 'Admin' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {admin.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="ml-2">Edit</Button>
                  {admin.role !== 'Owner' && (
                    <Button variant="ghost" size="sm" className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50">Remove</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <Button className="mt-6">
          <User className="mr-2 h-4 w-4" />
          Add New Admin
        </Button>
      </CardContent>
    </Card>
  );
};

export default SuperAdminTeamSection;
