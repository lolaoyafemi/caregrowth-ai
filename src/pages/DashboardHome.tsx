
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const DashboardHome = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to CareGrowthAI</h1>
        <p className="text-gray-600 mt-2">Your AI-powered agency growth assistant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Social Media Content</CardTitle>
            <CardDescription>Posts generated this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24/50</div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
              <div className="h-full bg-caregrowth-blue rounded-full" style={{ width: '48%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Document Search</CardTitle>
            <CardDescription>Documents uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3/5</div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
              <div className="h-full bg-caregrowth-green rounded-full" style={{ width: '60%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Q&A Assistant</CardTitle>
            <CardDescription>Queries used this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">62/100</div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
              <div className="h-full bg-caregrowth-blue rounded-full" style={{ width: '62%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-caregrowth-blue">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle>Social Media Content</CardTitle>
            <CardDescription>Generate engaging social posts for multiple platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/social-media">
              <Button className="w-full bg-caregrowth-blue">
                Create Content
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightgreen mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-caregrowth-green">
                <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle>Document Search</CardTitle>
            <CardDescription>Upload and search through your documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/document-search">
              <Button className="w-full bg-caregrowth-green">
                Search Documents
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-caregrowth-blue">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 13.5C12 12.6716 12.6716 12 13.5 12C14.3284 12 15 11.3284 15 10.5C15 9.67157 14.3284 9 13.5 9H12C11.1716 9 10.5 9.67157 10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle>Q&A Assistant</CardTitle>
            <CardDescription>Get instant answers to your questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/qa-assistant">
              <Button className="w-full bg-caregrowth-blue">
                Ask Questions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
