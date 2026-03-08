import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Building2, Heart, Mic2, FileUp, Share2, Rocket,
  Check, ChevronRight, ChevronLeft, SkipForward,
  Upload, Facebook, Instagram, Linkedin, Twitter
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import FolderUpload from '@/components/upload/FolderUpload';

const STAGES = [
  { id: 'profile', label: 'Agency Profile', icon: Building2 },
  { id: 'philosophy', label: 'Care Philosophy', icon: Heart },
  { id: 'voice', label: 'Brand Voice', icon: Mic2 },
  { id: 'knowledge', label: 'Upload Knowledge', icon: FileUp },
  { id: 'connect', label: 'Connect Platforms', icon: Share2 },
  { id: 'generate', label: 'First Content', icon: Rocket },
] as const;

const PHILOSOPHY_OPTIONS = [
  { id: 'family-centered', label: 'Family-Centered Care', desc: 'We put the whole family at the center of every care plan.' },
  { id: 'dementia', label: 'Dementia Specialists', desc: 'We specialize in memory care and cognitive support.' },
  { id: 'companionship', label: 'Companionship-Focused', desc: 'We believe connection and presence matter most.' },
  { id: 'hospital-discharge', label: 'Hospital Discharge Support', desc: 'We help families navigate the transition home.' },
  { id: 'respite', label: 'Respite Care Specialists', desc: 'We give family caregivers the rest they deserve.' },
];

const TONE_OPTIONS = [
  { id: 'warm', label: 'Warm & Compassionate', desc: 'Empathetic language that feels like a caring friend.' },
  { id: 'professional', label: 'Professional & Clinical', desc: 'Clear, authoritative, and trustworthy.' },
  { id: 'friendly', label: 'Friendly & Conversational', desc: 'Approachable and easy to connect with.' },
];

const AgencySetupPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());

  // Stage 1 — Agency Profile
  const [agencyName, setAgencyName] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [servicesOffered, setServicesOffered] = useState('');
  const [yearsOperating, setYearsOperating] = useState('');
  const [targetClient, setTargetClient] = useState('');

  // Stage 2 — Philosophy
  const [selectedPhilosophy, setSelectedPhilosophy] = useState<string[]>([]);

  // Stage 3 — Voice
  const [selectedTone, setSelectedTone] = useState('');

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('admin_user_id', user.id)
        .maybeSingle();

      if (agency) {
        setAgencyName(agency.name || '');
        const { data: profile } = await supabase
          .from('agency_profiles')
          .select('*')
          .eq('agency_id', agency.id)
          .maybeSingle();
        if (profile) {
          setServiceArea(profile.service_area || '');
          setServicesOffered(profile.services_offered?.join(', ') || '');
          setTargetClient(profile.ideal_client_type || '');
          setSelectedTone(profile.tone_preference || '');
          if (profile.caregiving_focus) setSelectedPhilosophy(profile.caregiving_focus);
        }
      }

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('business_name, service_area, services')
        .eq('user_id', user.id)
        .maybeSingle();
      if (userProfile) {
        if (!agencyName && userProfile.business_name) setAgencyName(userProfile.business_name);
        if (!serviceArea && userProfile.service_area) setServiceArea(userProfile.service_area);
        if (!servicesOffered && userProfile.services) setServicesOffered(userProfile.services);
      }
    };
    loadProfile();
  }, [user?.id]);

  const totalStages = STAGES.length;
  const progressPercent = Math.round(((completedStages.size) / totalStages) * 100);

  const markComplete = (stageIndex: number) => {
    setCompletedStages(prev => new Set([...prev, stageIndex]));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      // Upsert agency
      let agencyId: string;
      const { data: existing } = await supabase
        .from('agencies')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle();

      if (existing) {
        agencyId = existing.id;
        await supabase.from('agencies').update({ name: agencyName }).eq('id', agencyId);
      } else {
        const { data: newAgency, error } = await supabase
          .from('agencies')
          .insert({ name: agencyName, admin_user_id: user.id })
          .select('id')
          .single();
        if (error) throw error;
        agencyId = newAgency.id;
      }

      // Upsert agency profile
      const services = servicesOffered.split(',').map(s => s.trim()).filter(Boolean);
      const { data: existingProfile } = await supabase
        .from('agency_profiles')
        .select('id')
        .eq('agency_id', agencyId)
        .maybeSingle();

      const profileData = {
        agency_name: agencyName,
        service_area: serviceArea,
        services_offered: services,
        ideal_client_type: targetClient,
      };

      if (existingProfile) {
        await supabase.from('agency_profiles').update(profileData).eq('id', existingProfile.id);
      } else {
        await supabase.from('agency_profiles').insert({ ...profileData, agency_id: agencyId });
      }

      // Update user profile
      await supabase.from('user_profiles').update({
        business_name: agencyName,
        service_area: serviceArea,
        services: servicesOffered,
      }).eq('user_id', user.id);

      toast.success('Agency profile saved!');
      markComplete(0);
      setCurrentStage(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    }
  };

  const handleSavePhilosophy = async () => {
    if (!user?.id) return;
    try {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle();
      if (agency) {
        await supabase.from('agency_profiles')
          .update({ caregiving_focus: selectedPhilosophy })
          .eq('agency_id', agency.id);
      }
      toast.success('Care philosophy saved!');
      markComplete(1);
      setCurrentStage(2);
    } catch {
      toast.error('Failed to save philosophy');
    }
  };

  const handleSaveVoice = async () => {
    if (!user?.id) return;
    try {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle();
      if (agency) {
        await supabase.from('agency_profiles')
          .update({ tone_preference: selectedTone })
          .eq('agency_id', agency.id);
      }
      await supabase.from('user_profiles')
        .update({ tone_preference: selectedTone })
        .eq('user_id', user.id);
      toast.success('Brand voice saved!');
      markComplete(2);
      setCurrentStage(3);
    } catch {
      toast.error('Failed to save voice');
    }
  };

  const handleGenerateContent = () => {
    markComplete(5);
    navigate('/dashboard/social-media');
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Tell us about your agency</h2>
              <p className="text-muted-foreground mt-1">This helps us tailor everything we create to your business.</p>
            </div>
            <div className="grid gap-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name</Label>
                <Input id="agencyName" placeholder="e.g., Sunshine Home Care" value={agencyName} onChange={e => setAgencyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Area</Label>
                <Input id="serviceArea" placeholder="e.g., Greater Austin, TX" value={serviceArea} onChange={e => setServiceArea(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Services Offered</Label>
                <Textarea id="services" placeholder="e.g., Personal care, companionship, dementia care, respite care" value={servicesOffered} onChange={e => setServicesOffered(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Years Operating</Label>
                <Input id="years" placeholder="e.g., 5" value={yearsOperating} onChange={e => setYearsOperating(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target Client Type</Label>
                <Input id="target" placeholder="e.g., Families caring for aging parents" value={targetClient} onChange={e => setTargetClient(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90">
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">What best describes your care philosophy?</h2>
              <p className="text-muted-foreground mt-1">Select all that apply. This shapes the tone and themes of your content.</p>
            </div>
            <div className="grid gap-3 max-w-lg">
              {PHILOSOPHY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedPhilosophy(prev => 
                    prev.includes(opt.id) ? prev.filter(p => p !== opt.id) : [...prev, opt.id]
                  )}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                    selectedPhilosophy.includes(opt.id)
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedPhilosophy.includes(opt.id) ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {selectedPhilosophy.includes(opt.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={handleSavePhilosophy} disabled={selectedPhilosophy.length === 0} className="bg-primary hover:bg-primary/90">
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">How should your brand sound?</h2>
              <p className="text-muted-foreground mt-1">Pick the tone that feels most like your agency.</p>
            </div>
            <div className="grid gap-3 max-w-lg">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedTone(opt.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                    selectedTone === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedTone === opt.id ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {selectedTone === opt.id && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={handleSaveVoice} disabled={!selectedTone} className="bg-primary hover:bg-primary/90">
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Upload your knowledge base</h2>
              <p className="text-muted-foreground mt-1">
                Service brochures, policy manuals, training materials, FAQ documents — anything that helps us answer questions about your agency.
              </p>
            </div>
            <FolderUpload onUploadComplete={() => {
              markComplete(3);
              toast.success('Documents uploaded! They'll be processed shortly.');
            }} />
            <div className="flex gap-3">
              <Button onClick={() => { markComplete(3); setCurrentStage(4); }} className="bg-primary hover:bg-primary/90">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Connect your social platforms</h2>
              <p className="text-muted-foreground mt-1">Link the accounts where you'd like to publish content.</p>
            </div>
            <div className="grid gap-3 max-w-lg">
              {[
                { name: 'Facebook Page', icon: Facebook, color: 'text-blue-600' },
                { name: 'Instagram Business', icon: Instagram, color: 'text-pink-500' },
                { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
                { name: 'X (optional)', icon: Twitter, color: 'text-foreground' },
              ].map(platform => (
                <Card key={platform.name} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <platform.icon className={cn("h-5 w-5", platform.color)} />
                    <span className="font-medium text-foreground">{platform.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/content-calendar')}>
                    Connect
                  </Button>
                </Card>
              ))}
            </div>
            <Button onClick={() => { markComplete(4); setCurrentStage(5); }} className="bg-primary hover:bg-primary/90">
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center max-w-md mx-auto py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">You're all set!</h2>
            <p className="text-muted-foreground">
              Let's prepare your first week of posts. We'll use everything you've told us to generate content that sounds like your agency.
            </p>
            <Button size="lg" onClick={handleGenerateContent} className="bg-primary hover:bg-primary/90">
              <Rocket className="mr-2 h-4 w-4" /> Generate 7-Day Content Plan
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Agency Setup</h1>
        <p className="text-muted-foreground mt-1">Let's configure CareGrowth for your agency. You can skip steps and come back anytime.</p>
      </div>

      {/* Progress tracker */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Setup Progress</span>
          <span className="text-sm font-medium text-primary">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2 mb-4 bg-muted [&>div]:bg-primary" />
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage, i) => {
            const isComplete = completedStages.has(i);
            const isCurrent = i === currentStage;
            return (
              <button
                key={stage.id}
                onClick={() => setCurrentStage(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  isComplete
                    ? "bg-primary/10 text-primary border-primary/20"
                    : isCurrent
                    ? "bg-accent text-accent-foreground border-border"
                    : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : <stage.icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage content */}
      <Card className="border-border">
        <CardContent className="p-6 sm:p-8">
          {renderStageContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={() => setCurrentStage(Math.max(0, currentStage - 1))}
          disabled={currentStage === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          variant="ghost"
          onClick={() => setCurrentStage(Math.min(totalStages - 1, currentStage + 1))}
          disabled={currentStage === totalStages - 1}
          className="text-muted-foreground"
        >
          <SkipForward className="mr-1 h-4 w-4" /> Skip this step
        </Button>
      </div>
    </div>
  );
};

export default AgencySetupPage;
