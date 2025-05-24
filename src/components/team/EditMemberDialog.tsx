
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  currentRole: string;
}

const EditMemberDialog = ({ open, onOpenChange, memberName, currentRole }: EditMemberDialogProps) => {
  const [selectedRole, setSelectedRole] = useState(currentRole);

  const roles = [
    { value: 'Admin', label: 'Admin', description: 'Full access to all tools and team management' },
    { value: 'Editor', label: 'Editor', description: 'Can edit content and access most tools' },
    { value: 'Viewer', label: 'Viewer', description: 'Read-only access to content and reports' }
  ];

  const handleSave = () => {
    console.log(`Updating ${memberName} role to ${selectedRole}`);
    // TODO: Implement actual role update logic
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team Member Role</DialogTitle>
          <DialogDescription>
            Change the role for {memberName}. This will affect their access permissions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label className="text-base font-medium">Select Role</Label>
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="mt-3">
            {roles.map((role) => (
              <div key={role.value} className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value={role.value} id={role.value} className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor={role.value} className="text-sm font-medium cursor-pointer">
                    {role.label}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {role.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
