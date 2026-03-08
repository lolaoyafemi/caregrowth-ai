import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Building2, Briefcase, Sparkles, FileUp, Share2, Rocket,
  Check, ChevronRight, ChevronLeft, SkipForward, Globe,
  Facebook, Instagram, Linkedin, Twitter, Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import FolderUpload from '@/components/upload/FolderUpload';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGES = [
  { id: 'basics', label: 'Agency Basics', icon: Building2 },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'personality', label: 'Personality', icon: Sparkles },
  { id: 'knowledge', label: 'Knowledge', icon: FileUp },
  { id: 'connect', label: 'Platforms', icon: Share2 },
  { id: 'activate', label: 'Activate', icon: Rocket },
] as const;

const SERVICE_OPTIONS = [
  { id: 'personal-care', label: 'Personal Care' },
  { id: 'companion-care', label: 'Companion Care' },
  { id: 'dementia-care', label: 'Dementia Care' },
  { id: 'respite-care', label: 'Respite Care' },
  { id: 'post-hospital-care', label: 'Post-Hospital Care' },
  { id: 'live-in-care', label: 'Live-In Care' },
];

const PERSONALITY_OPTIONS = [
  { id: 'reassured', label: 'Reassured', desc: '"Everything is going to be okay."' },
  { id: 'supported', label: 'Supported', desc: '"You\'re not doing this alone."' },
  { id: 'informed', label: 'Informed', desc: '"Here\'s what you need to know."' },
  { id: 'encouraged', label: 'Encouraged', desc: '"You\'re making a great choice."' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AgencySetupPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());

  // Stage 1 — Basics
  const [agencyName, setAgencyName] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [website, setWebsite] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Stage 2 — Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Stage 3 — Personality
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);

  // Load existing data
  useEffect(() => {
    const load = async () => {
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
          if (profile.services_offered?.length) setSelectedServices(profile.services_offered);
          if (profile.caregiving_focus?.length) setSelectedPersonality(profile.caregiving_focus);
        }
      }

      const { data: up } = await supabase
        .from('user_profiles')
        .select('business_name, service_area')
        .eq('user_id', user.id)
        .maybeSingle();
      if (up) {
        if (!agencyName && up.business_name) setAgencyName(up.business_name);
        if (!serviceArea && up.service_area) setServiceArea(up.service_area);
      }
    };
    load();
  }, [user?.id]);

  const totalStages = STAGES.length;
  const progressPercent = Math.round((completedStages.size / totalStages) * 100);

  const markComplete = (i: number) => setCompletedStages(prev => new Set([...prev, i]));
  const goNext = () => setCurrentStage(prev => Math.min(prev + 1, totalStages - 1));
  const goBack = () => setCurrentStage(prev => Math.max(prev - 1, 0));

  /* ---------- Website extraction ---------- */
  const handleExtractFromWebsite = async () => {
    if (!website.trim()) return;
    setExtracting(true);
    try {
      // Try calling our edge function that uses Lovable AI to extract info
      const { data, error } = await supabase.functions.invoke('extract-agency-info', {
        body: { url: website },
      });
      if (error) throw error;
      if (data?.services?.length) {
        setSelectedServices(prev => [...new Set([...prev, ...data.services])]);
        toast.success('We found some services on your website and pre-selected them.');
      }
      if (data?.serviceArea && !serviceArea) {
        setServiceArea(data.serviceArea);
      }
    } catch {
      // Silent fail — extraction is a bonus, not required
      toast.info('We couldn\'t extract info automatically. No worries — you can fill it in below.');
    } finally {
      setExtracting(false);
    }
  };

  /* ---------- Save handlers ---------- */
  const handleSaveBasics = async () => {
    if (!user?.id) return;
    try {
      let agencyId: string;
      const { data: existing } = await supabase
        .from('agencies').select('id').eq('admin_user_id', user.id).maybeSingle();

      if (existing) {
        agencyId = existing.id;
        await supabase.from('agencies').update({ name: agencyName }).eq('id', agencyId);
      } else {
        const { data: n, error } = await supabase
          .from('agencies').insert({ name: agencyName, admin_user_id: user.id }).select('id').single();
        if (error) throw error;
        agencyId = n.id;
      }

      // Ensure agency_profiles row exists
      const { data: ep } = await supabase
        .from('agency_profiles').select('id').eq('agency_id', agencyId).maybeSingle();
      const pData = { agency_name: agencyName, service_area: serviceArea };
      if (ep) {
        await supabase.from('agency_profiles').update(pData).eq('id', ep.id);
      } else {
        await supabase.from('agency_profiles').insert({ ...pData, agency_id: agencyId });
      }

      await supabase.from('user_profiles').update({ business_name: agencyName, service_area: serviceArea }).eq('user_id', user.id);

      toast.success('Agency basics saved!');
      markComplete(0);
      goNext();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleSaveServices = async () => {
    if (!user?.id) return;
    try {
      const { data: agency } = await supabase
        .from('agencies').select('id').eq('admin_user_id', user.id).maybeSingle();
      if (agency) {
        await supabase.from('agency_profiles')
          .update({ services_offered: selectedServices })
          .eq('agency_id', agency.id);
      }
      await supabase.from('user_profiles')
        .update({ services: selectedServices.join(', ') })
        .eq('user_id', user.id);
      toast.success('Services saved!');
      markComplete(1);
      goNext();
    } catch {
      toast.error('Failed to save services');
    }
  };

  const handleSavePersonality = async () => {
    if (!user?.id) return;
    try {
      const { data: agency } = await supabase
        .from('agencies').select('id').eq('admin_user_id', user.id).maybeSingle();
      if (agency) {
        await supabase.from('agency_profiles')
          .update({ caregiving_focus: selectedPersonality, tone_preference: selectedPersonality[0] || null })
          .eq('agency_id', agency.id);
      }
      await supabase.from('user_profiles')
        .update({ tone_preference: selectedPersonality[0] || null })
        .eq('user_id', user.id);
      toast.success('Personality saved!');
      markComplete(2);
      goNext();
    } catch {
      toast.error('Failed to save personality');
    }
  };

  const handleActivate = () => {
    markComplete(5);
    navigate('/dashboard/content-calendar');
  };

  /* ---------- Toggle helper ---------- */
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  /* ---------- Selection card ---------- */
  const SelectionCard = ({ id, label, desc, selected, onToggle }: {
    id: string; label: string; desc?: string; selected: boolean; onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-muted-foreground/30 hover:bg-accent/30"
      )}
    >
      <div className={cn(
        "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
        selected ? "border-primary bg-primary" : "border-muted-foreground/40"
      )}>
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </button>
  );

  /* ---------- Render stages ---------- */
  const renderStage = () => {
    switch (currentStage) {
      /* Stage 1 — Agency Basics */
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Let's start with the basics</h2>
              <p className="text-muted-foreground mt-1">Tell us a little about your agency so we can personalize everything.</p>
            </div>
            <div className="grid gap-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="name">Agency Name</Label>
                <Input id="name" placeholder="e.g., Sunshine Home Care" value={agencyName} onChange={e => setAgencyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Service Area</Label>
                <Input id="area" placeholder="e.g., Greater Austin, TX" value={serviceArea} onChange={e => setServiceArea(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="web">Website (optional)</Label>
                <div className="flex gap-2">
                  <Input id="web" placeholder="https://youragency.com" value={website} onChange={e => setWebsite(e.target.value)} className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractFromWebsite}
                    disabled={!website.trim() || extracting}
                    className="shrink-0"
                  >
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    <span className="ml-1.5 hidden sm:inline">{extracting ? 'Scanning…' : 'Auto-fill'}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">If provided, we'll try to extract your services automatically.</p>
              </div>
            </div>
            <Button onClick={handleSaveBasics} disabled={!agencyName.trim()}>
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      /* Stage 2 — Services */
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">What services does your agency offer?</h2>
              <p className="text-muted-foreground mt-1">Select all that apply. This helps us create accurate, relevant content.</p>
            </div>
            <div className="grid gap-3 max-w-lg">
              {SERVICE_OPTIONS.map(s => (
                <SelectionCard
                  key={s.id}
                  id={s.id}
                  label={s.label}
                  selected={selectedServices.includes(s.id)}
                  onToggle={() => setSelectedServices(prev => toggle(prev, s.id))}
                />
              ))}
            </div>
            <Button onClick={handleSaveServices} disabled={selectedServices.length === 0}>
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      /* Stage 3 — Personality */
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">How do you want families to feel when they read your content?</h2>
              <p className="text-muted-foreground mt-1">Pick one or two. This shapes the voice behind everything we write.</p>
            </div>
            <div className="grid gap-3 max-w-lg">
              {PERSONALITY_OPTIONS.map(p => (
                <SelectionCard
                  key={p.id}
                  id={p.id}
                  label={p.label}
                  desc={p.desc}
                  selected={selectedPersonality.includes(p.id)}
                  onToggle={() => setSelectedPersonality(prev => toggle(prev, p.id))}
                />
              ))}
            </div>
            <Button onClick={handleSavePersonality} disabled={selectedPersonality.length === 0}>
              Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      /* Stage 4 — Upload Knowledge */
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Upload your knowledge base</h2>
              <p className="text-muted-foreground mt-1">
                Service brochures, policies, caregiver guides, FAQs — anything that helps us answer questions about your agency.
              </p>
            </div>
            <FolderUpload onUploadComplete={() => {
              markComplete(3);
              toast.success('Documents uploaded! They'll be processed shortly.');
            }} />
            <Button onClick={() => { markComplete(3); goNext(); }}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      /* Stage 5 — Connect Platforms */
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
              ].map(p => (
                <Card key={p.name} className="flex items-center justify-between p-4 border-border">
                  <div className="flex items-center gap-3">
                    <p.icon className={cn("h-5 w-5", p.color)} />
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/content-calendar')}>
                    Connect
                  </Button>
                </Card>
              ))}
            </div>
            <Button onClick={() => { markComplete(4); goNext(); }}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        );

      /* Stage 6 — Activate Marketing */
      case 5:
        return (
          <div className="space-y-6 text-center max-w-md mx-auto py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">You're ready to go!</h2>
            <p className="text-muted-foreground">
              Let's prepare your first week of posts. We'll use everything you've shared to generate content that sounds like your agency.
            </p>
            <Button size="lg" onClick={handleActivate}>
              <Rocket className="mr-2 h-4 w-4" /> Generate 7-Day Content Plan
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Agency Setup</h1>
        <p className="text-muted-foreground mt-1">Let's configure CareGrowth for your agency. Skip any step and come back anytime.</p>
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
          {renderStage()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={goBack} disabled={currentStage === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          variant="ghost"
          onClick={goNext}
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
