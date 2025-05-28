
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessDetailsFormProps {
  onClose: () => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  location: string | null;
  core_service: string | null;
  services: string | null;
  ideal_client: string | null;
  main_offer: string | null;
  big_promise: string | null;
  audience_problems: string | null;
  pain_points: string[] | null;
  objections: string[] | null;
  differentiator: string | null;
  testimonial: string | null;
  created_at: string;
  updated_at: string;
}

const BusinessDetailsForm = ({ onClose }: BusinessDetailsFormProps) => {
  const [formData, setFormData] = useState({
    businessName: '',
    location: '',
    coreService: '',
    idealClient: '',
    mainOffer: '',
    bigPromise: '',
    audienceProblems: '',
    objections: '',
    differentiator: '',
    testimonials: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing profile data when component mounts
  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        const typedProfile = profile as UserProfile;
        setFormData({
          businessName: typedProfile.business_name || '',
          location: typedProfile.location || '',
          coreService: typedProfile.core_service || '',
          idealClient: typedProfile.ideal_client || '',
          mainOffer: typedProfile.main_offer || '',
          bigPromise: typedProfile.big_promise || '',
          audienceProblems: typedProfile.audience_problems || '',
          objections: typedProfile.objections?.join(', ') || '',
          differentiator: typedProfile.differentiator || '',
          testimonials: typedProfile.testimonial || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Check if required fields are filled
    if (!formData.businessName || !formData.location || !formData.coreService) {
      toast.error("Please fill in at least the business name, location, and core service.");
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // Prepare data for database
      const profileData = {
        user_id: user.id,
        business_name: formData.businessName,
        location: formData.location,
        core_service: formData.coreService,
        services: formData.coreService, // Keep for backward compatibility
        ideal_client: formData.idealClient,
        main_offer: formData.mainOffer,
        big_promise: formData.bigPromise,
        audience_problems: formData.audienceProblems,
        pain_points: formData.audienceProblems ? [formData.audienceProblems] : [],
        objections: formData.objections ? formData.objections.split(',').map(item => item.trim()) : [],
        differentiator: formData.differentiator,
        testimonial: formData.testimonials,
        updated_at: new Date().toISOString()
      };

      // Try to update first, then insert if not exists
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (updateError) {
        // If update failed, try to insert
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([profileData]);

        if (insertError) {
          throw insertError;
        }
      }

      toast.success("Business details saved successfully!");
      onClose();
    } catch (error) {
      console.error('Error saving business details:', error);
      toast.error("Failed to save business details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">More About My Business</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-8">
            {/* Section 1: About Your Business */}
            <div>
              <h3 className="text-lg font-semibold text-caregrowth-blue mb-4">Section 1: About Your Business</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="businessName">1. What's the name of your home care business? *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Graceful Aging Home Care"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">2. Where is your agency based? *</Label>
                  <Input
                    id="location"
                    placeholder="City and state"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="coreService">3. What core service do you offer? *</Label>
                  <Input
                    id="coreService"
                    placeholder="e.g., companion care, dementia care, live-in care, respite"
                    value={formData.coreService}
                    onChange={(e) => handleInputChange('coreService', e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="idealClient">4. Who is your ideal client?</Label>
                  <Textarea
                    id="idealClient"
                    placeholder="Tell us about them in 2–3 sentences. Who do you serve best?"
                    value={formData.idealClient}
                    onChange={(e) => handleInputChange('idealClient', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="mainOffer">5. What is the main offer or package you want to promote?</Label>
                  <Textarea
                    id="mainOffer"
                    placeholder="e.g., 24/7 live-in care plans for families with aging parents"
                    value={formData.mainOffer}
                    onChange={(e) => handleInputChange('mainOffer', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="bigPromise">6. What is the big promise you make to clients?</Label>
                  <Textarea
                    id="bigPromise"
                    placeholder="What result or outcome do people get when they work with you?"
                    value={formData.bigPromise}
                    onChange={(e) => handleInputChange('bigPromise', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Audience Pains + Beliefs */}
            <div>
              <h3 className="text-lg font-semibold text-caregrowth-blue mb-4">Section 2: Audience Pains + Beliefs</h3>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="audienceProblems">7. What are the top 3–5 problems your audience is dealing with every day?</Label>
                  <Textarea
                    id="audienceProblems"
                    placeholder="Think of the stress, guilt, or confusion they feel before they reach out to you"
                    value={formData.audienceProblems}
                    onChange={(e) => handleInputChange('audienceProblems', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="objections">8. What objections do people usually have before hiring your agency?</Label>
                  <Textarea
                    id="objections"
                    placeholder="e.g., cost, trust, letting a stranger into their home, etc."
                    value={formData.objections}
                    onChange={(e) => handleInputChange('objections', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="differentiator">9. What's one thing that makes your agency different from others?</Label>
                  <Textarea
                    id="differentiator"
                    placeholder="What sets you apart, even if it's small?"
                    value={formData.differentiator}
                    onChange={(e) => handleInputChange('differentiator', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Content Preferences */}
            <div>
              <h3 className="text-lg font-semibold text-caregrowth-blue mb-4">Section 3: Your Content Preferences</h3>
              <div>
                <Label htmlFor="testimonials">10. Do you have any testimonials, client wins, or feedback you'd like us to include in your content?</Label>
                <Textarea
                  id="testimonials"
                  placeholder="Paste a few short lines or key phrases from happy clients"
                  value={formData.testimonials}
                  onChange={(e) => handleInputChange('testimonials', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-caregrowth-blue"
            >
              {isSaving ? "Saving..." : "Save Business Details"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BusinessDetailsForm;
