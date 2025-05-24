
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Edit, Trash2 } from 'lucide-react';
import EditMemberDialog from '@/components/team/EditMemberDialog';
import DeleteMemberDialog from '@/components/team/DeleteMemberDialog';

interface TeamPermissionsSectionProps {
  isVisible: boolean;
}

const TeamPermissionsSection = ({ isVisible }: TeamPermissionsSectionProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  // Sample data for agency team members
  const agencyTeamMembers = [
    { name: "John Doe", email: "john@agency.com", role: "Admin", status: "Active" },
    { name: "Emma White", email: "emma@agency.com", role: "Editor", status: "Active" },
    { name: "Michael Brown", email: "michael@agency.com", role: "Viewer", status: "Inactive" }
  ];

  const handleEditMember = (member: { name: string; email: string; role: string }) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

  const handleDeleteMember = (member: { name: string; email: string; role: string }) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  if (!isVisible) return null;

  return (
    <>
      <Card className="shadow-md border-t-4 border-t-caregrowth-green transition-all duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="h-6 w-6 text-caregrowth-green" />
          <div>
            <CardTitle>Team Permissions</CardTitle>
            <CardDescription>
              Control access levels for your team members
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencyTeamMembers.map((member, index) => (
                <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === 'Admin' ? 'bg-blue-100 text-blue-800' : 
                      member.role === 'Editor' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {member.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditMember(member)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteMember(member)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedMember && (
        <>
          <EditMemberDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            memberName={selectedMember.name}
            currentRole={selectedMember.role}
          />
          <DeleteMemberDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            memberName={selectedMember.name}
            memberEmail={selectedMember.email}
          />
        </>
      )}
    </>
  );
};

export default TeamPermissionsSection;
