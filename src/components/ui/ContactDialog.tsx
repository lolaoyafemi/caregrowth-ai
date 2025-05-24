
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Instagram, Twitter, Mail } from 'lucide-react';

interface ContactDialogProps {
  children: React.ReactNode;
}

const ContactDialog = ({ children }: ContactDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const contactOptions = [
    {
      platform: 'Instagram',
      handle: '@caregrowth',
      link: 'https://instagram.com/caregrowth',
      icon: Instagram,
      color: 'text-pink-600'
    },
    {
      platform: 'Twitter',
      handle: '@caregrowth',
      link: 'https://twitter.com/caregrowth',
      icon: Twitter,
      color: 'text-blue-400'
    },
    {
      platform: 'WhatsApp',
      handle: '+2348068920166',
      link: 'https://wa.me/2348068920166',
      icon: () => (
        <img 
          src="https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=24&h=24&fit=crop&crop=center" 
          alt="WhatsApp" 
          className="w-6 h-6 rounded-full"
        />
      ),
      color: 'text-green-600'
    },
    {
      platform: 'Email',
      handle: 'app@caregrowth.ai',
      link: 'mailto:app@caregrowth.ai',
      icon: Mail,
      color: 'text-gray-600'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogDescription>
            Get in touch with us through any of these platforms. We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {contactOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <a
                key={option.platform}
                href={option.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className={`${option.color}`}>
                  <IconComponent />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{option.platform}</div>
                  <div className="text-sm text-gray-600">{option.handle}</div>
                </div>
              </a>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
