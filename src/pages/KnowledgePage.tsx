
import React from 'react';
import { Shield } from 'lucide-react';
import SharedDocumentManager from '@/components/admin/SharedDocumentManager';

const KnowledgePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-600" />
            Knowledge Base Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage shared knowledge documents available to Ask Jared for all users
          </p>
        </div>

        <SharedDocumentManager />
      </div>
    </div>
  );
};

export default KnowledgePage;
