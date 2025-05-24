
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, 
  User, 
  ChartBar, 
  CircleDollarSign, 
  Users, 
  BadgeDollarSign,
  CircleUser,
  BellRing,
  Shield,
  Wallet
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SettingsPage = () => {
  const { user } = useUser();
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgencyAdmin = user?.role === 'agency_admin';

  // Sample data for performance monitoring
  const performanceData = {
    tokensThisMonth: 2345678,
    monthlyRevenue: 14785.50,
    quarterlyRevenue: 43250.75,
    lifetimeRevenue: 197630.25,
    topAgencies: [
      { name: "Healthcare Solutions Ltd", spend: 4350.75, usage: 678500 },
      { name: "CarePlus Agency", spend: 3275.25, usage: 498700 },
      { name: "WellBeing Services", spend: 2980.50, usage: 425300 }
    ]
  };

  // Sample data for super admin team
  const adminTeam = [
    { name: "Jane Smith", email: "jane@caregrowth.ai", role: "Owner" },
    { name: "Mark Johnson", email: "mark@caregrowth.ai", role: "Admin" },
    { name: "Sarah Wilson", email: "sarah@caregrowth.ai", role: "Developer" }
  ];
  
  // Sample data for agency team members
  const agencyTeamMembers = [
    { name: "John Doe", email: "john@agency.com", role: "Admin", status: "Active" },
    { name: "Emma White", email: "emma@agency.com", role: "Editor", status: "Active" },
    { name: "Michael Brown", email: "michael@agency.com", role: "Viewer", status: "Inactive" }
  ];

  const renderAgencyAdminSettings = () => {
    if (!isAgencyAdmin && !isSuperAdmin) return null;

    return (
      <>
        {/* Team Permissions */}
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
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-between mt-6">
              <Button className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Invite New Member
              </Button>
              <Button variant="outline">Manage Roles</Button>
            </div>
          </CardContent>
        </Card>

        {/* Token Limits */}
        <Card className="shadow-md border-t-4 border-t-caregrowth-blue transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <Wallet className="h-6 w-6 text-caregrowth-blue" />
            <div>
              <CardTitle>Token Limits & Allocation</CardTitle>
              <CardDescription>
                Manage how tokens are distributed across your team
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-caregrowth-lightblue/30 p-4 rounded-md">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Monthly Token Budget</h3>
                    <p className="text-2xl font-bold text-caregrowth-blue">150,000</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Used This Month</h3>
                    <p className="text-2xl font-bold text-gray-700">124,567</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Remaining</h3>
                    <p className="text-2xl font-bold text-green-600">25,433</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Auto-renew monthly allocation</p>
                    <p className="text-sm text-gray-500">Automatically purchase tokens when low</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Low token alerts</p>
                    <p className="text-sm text-gray-500">Get notified when tokens are below 20%</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Per-user allocation</p>
                    <p className="text-sm text-gray-500">Set token limits for individual users</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Switch />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enable to set individual token limits for each team member</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <Button className="mt-6">Update Token Settings</Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderSuperAdminSettings = () => {
    if (!isSuperAdmin) return null;

    return (
      <>
        {/* Performance Monitoring Panel */}
        <Card className="shadow-md border-t-4 border-t-caregrowth-blue">
          <CardHeader className="flex flex-row items-center gap-2">
            <ChartBar className="h-6 w-6 text-caregrowth-blue" />
            <div>
              <CardTitle>Performance Monitoring</CardTitle>
              <CardDescription>
                Platform usage metrics and revenue insights
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-caregrowth-lightblue p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Total Tokens (This Month)</span>
                <div className="flex items-center mt-1">
                  <BadgeDollarSign className="h-5 w-5 mr-2 text-caregrowth-blue" />
                  <span className="text-2xl font-semibold">{performanceData.tokensThisMonth.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-caregrowth-lightgreen p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Monthly Revenue</span>
                <div className="flex items-center mt-1">
                  <CircleDollarSign className="h-5 w-5 mr-2 text-caregrowth-green" />
                  <span className="text-2xl font-semibold">${performanceData.monthlyRevenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-caregrowth-lightblue p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Lifetime Revenue</span>
                <div className="flex items-center mt-1">
                  <CircleDollarSign className="h-5 w-5 mr-2 text-caregrowth-blue" />
                  <span className="text-2xl font-semibold">${performanceData.lifetimeRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-caregrowth-blue" />
              Top Performing Agencies
            </h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Monthly Spend</TableHead>
                  <TableHead>Token Usage</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.topAgencies.map((agency, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>${agency.spend.toLocaleString()}</TableCell>
                    <TableCell>{agency.usage.toLocaleString()}</TableCell>
                    <TableCell>
                      <Switch defaultChecked={index < 2} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Super Admin Team */}
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
      </>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Platform Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold mt-3 flex items-center">
          <Settings className="mr-2 h-6 w-6" /> Settings
        </h1>
      </div>
      
      <div className="space-y-6">
        {/* Account Settings */}
        <Card className="shadow-md border-t-4 border-t-gray-400 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <CircleUser className="h-6 w-6 text-gray-700" />
            <div>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Update your personal information and preferences.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" defaultValue={user?.email} readOnly />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="password">Change Password</Label>
                <Input id="password" type="password" placeholder="Enter new password" />
              </div>
            </div>
            <Button className="mt-6 transition-all duration-200 hover:shadow">Save Changes</Button>
          </CardContent>
        </Card>
        
        {/* Notification Settings */}
        <Card className="shadow-md border-t-4 border-t-gray-400 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <BellRing className="h-6 w-6 text-gray-700" />
            <div>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Control when and how you receive notifications.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive important updates via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Usage Alerts</p>
                  <p className="text-sm text-gray-500">Get notified when approaching usage limits</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Team Member Notifications</p>
                  <p className="text-sm text-gray-500">Receive alerts when new users join</p>
                </div>
                <Switch defaultChecked={isAgencyAdmin || isSuperAdmin} />
              </div>
            </div>
            <Button className="mt-6 transition-all duration-200 hover:shadow">Save Preferences</Button>
          </CardContent>
        </Card>
        
        {/* Agency admin specific settings */}
        {renderAgencyAdminSettings()}
        
        {/* Super Admin specific settings */}
        {renderSuperAdminSettings()}
      </div>
    </div>
  );
};

export default SettingsPage;
