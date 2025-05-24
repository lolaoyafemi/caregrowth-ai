import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle } from 'lucide-react';
import AddTeamMemberDialog from '@/components/team/AddTeamMemberDialog';

const TeamManagementPage = () => {
  const { user, hasPermission } = useUser();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Only agency admins can access this page
  if (!hasPermission(['agency_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>
            Add and manage users for your agency. As the Agency Admin, you have full control over your team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">AO</div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Agency Owner</div>
                        <div className="text-sm text-gray-500">agency@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Just now
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">CW</div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Content Writer</div>
                        <div className="text-sm text-gray-500">content@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      Content Writer
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    2 hours ago
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">CL</div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Collaborator</div>
                        <div className="text-sm text-gray-500">collab@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Collaborator
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    1 day ago
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understand what each role can access within your agency dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-l-4 border-l-blue-500 pl-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Admin</span>
                Administrator
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Full access to all tools and team management. Can add, remove, and edit team members. Has access to all AI tools including social media posts, document search, and Q&A assistant.
              </p>
              <ul className="text-xs text-gray-500 mt-2 ml-4 list-disc">
                <li>Team management (add/remove/edit members)</li>
                <li>Social media content generation</li>
                <li>Document search and analysis</li>
                <li>Q&A assistant</li>
                <li>Agency settings and billing</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-l-green-500 pl-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Collaborator</span>
                Collaborator
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Responsible for document management and Q&A assistance. Can upload documents, search through them, and use the Q&A assistant to help clients.
              </p>
              <ul className="text-xs text-gray-500 mt-2 ml-4 list-disc">
                <li>Document upload and management</li>
                <li>Document search and analysis</li>
                <li>Q&A assistant</li>
                <li>View team information (read-only)</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-l-purple-500 pl-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Content Writer</span>
                Content Writer
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Specializes in creating engaging social media content. Has access to AI-powered social media post generation tools to boost client engagement.
              </p>
              <ul className="text-xs text-gray-500 mt-2 ml-4 list-disc">
                <li>Social media content generation</li>
                <li>Content calendar management</li>
                <li>Post scheduling and planning</li>
                <li>View team information (read-only)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddTeamMemberDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
};

export default TeamManagementPage;
