import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Share, ExternalLink } from 'lucide-react';
import { GoogleDriveConnection } from './GoogleDriveConnection';
import { GoogleFolderSharing } from './GoogleFolderSharing';

export const GoogleDriveOptions: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'connect' | 'share'>('share');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Integration</CardTitle>
          <CardDescription>
            Choose how you want to integrate Google Drive with your AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedOption} onValueChange={(value) => setSelectedOption(value as 'connect' | 'share')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="share" className="flex items-center gap-2">
                <Share className="h-4 w-4" />
                Folder Sharing
              </TabsTrigger>
              <TabsTrigger value="connect" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Full Access
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="share" className="mt-6">
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                        Recommended: Folder Sharing
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        More secure and private. You share only specific folders without giving full Drive access.
                        No OAuth permissions needed.
                      </p>
                    </div>
                  </div>
                </div>
                <GoogleFolderSharing />
              </div>
            </TabsContent>
            
            <TabsContent value="connect" className="mt-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                        Full Drive Access
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Connects your entire Google Drive account. Provides more features but requires OAuth permissions.
                        Use this if you need to browse and select from all your Drive content.
                      </p>
                    </div>
                  </div>
                </div>
                <GoogleDriveConnection />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};