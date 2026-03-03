
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Zap, Target, Check, ChevronRight, X } from 'lucide-react';

type Mode = null | 'intensity' | 'intention';

interface WizardResult {
  mode: 'intensity' | 'intention';
  days: number;
  platforms: string[];
  frequency: number; // posts per day per platform
  campaignName?: string;
  campaignGoal?: string;
}

interface StartEngineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number;
  onDeploy: (result: WizardResult) => void;
}

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X' },
];

const StartEngineWizard: React.FC<StartEngineWizardProps> = ({
  open,
  onOpenChange,
  credits,
  onDeploy,
}) => {
  const [mode, setMode] = useState<Mode>(null);
  const [step, setStep] = useState(0); // 0 = mode select

  // Shared state
  const [days, setDays] = useState(14);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(1);

  // Intention mode state
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('Launch');
  const [intensity, setIntensity] = useState<'steady' | 'ramp_up' | 'aggressive'>('steady');

  const intensityToFrequency = { steady: 1, ramp_up: 2, aggressive: 3 };

  const effectiveFrequency = mode === 'intention' ? intensityToFrequency[intensity] : frequency;

  const totalPosts = useMemo(() => {
    return days * platforms.length * effectiveFrequency;
  }, [days, platforms.length, effectiveFrequency]);

  const reset = () => {
    setMode(null);
    setStep(0);
    setDays(14);
    setPlatforms([]);
    setFrequency(1);
    setCampaignName('');
    setCampaignGoal('Launch');
    setIntensity('steady');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const togglePlatform = (key: string) => {
    setPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleDeploy = () => {
    onDeploy({
      mode: mode!,
      days,
      platforms,
      frequency: effectiveFrequency,
      campaignName: mode === 'intention' ? campaignName : undefined,
      campaignGoal: mode === 'intention' ? campaignGoal : undefined,
    });
  };

  // ── Mode selection card ──
  const ModeCard = ({ id, icon: Icon, title, description, color }: {
    id: 'intensity' | 'intention';
    icon: React.ElementType;
    title: string;
    description: string;
    color: 'blue' | 'orange';
  }) => {
    const isBlue = color === 'blue';
    return (
      <button
        onClick={() => { setMode(id); setStep(1); }}
        className={cn(
          "w-full text-left p-5 rounded-lg border-2 transition-all hover:shadow-md",
          isBlue
            ? "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50"
            : "border-orange-200 hover:border-orange-400 hover:bg-orange-50/50"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <Icon size={22} className={isBlue ? "text-blue-600" : "text-orange-600"} />
          <span className={cn("font-bold text-lg", isBlue ? "text-blue-700" : "text-orange-700")}>
            {title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </button>
    );
  };

  // ── Selectable option ──
  const OptionCard = ({ label, selected, onClick, color = 'blue' }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    color?: 'blue' | 'orange';
  }) => {
    const isBlue = color === 'blue';
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center justify-between",
          selected
            ? isBlue
              ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold"
              : "border-orange-400 bg-orange-50 text-orange-700 font-semibold"
            : "border-border hover:border-muted-foreground/40 text-foreground"
        )}
      >
        <span>{label}</span>
        {selected && <Check size={18} className={isBlue ? "text-blue-600" : "text-orange-600"} />}
      </button>
    );
  };

  const accentColor = mode === 'intention' ? 'orange' : 'blue';
  const isBlue = accentColor === 'blue';

  // ── Step header ──
  const StepHeader = ({ title }: { title: string }) => (
    <div className="mb-6">
      {mode && (
        <div className={cn(
          "flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-2",
          isBlue ? "text-blue-600" : "text-orange-600"
        )}>
          {isBlue ? <Zap size={14} /> : <Target size={14} />}
          {mode === 'intensity' ? 'INTENSITY MODE' : 'INTENTION BASED MODE'}
        </div>
      )}
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
    </div>
  );

  const ContinueButton = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-12 text-base font-semibold gap-2 mt-4",
        isBlue
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "bg-orange-500 hover:bg-orange-600 text-white"
      )}
    >
      {label || 'Continue'} <ChevronRight size={18} />
    </Button>
  );

  // ── Platform grid (shared) ──
  const PlatformGrid = () => (
    <div className="grid grid-cols-2 gap-3">
      {PLATFORMS.map(p => (
        <OptionCard
          key={p.key}
          label={p.label}
          selected={platforms.includes(p.key)}
          onClick={() => togglePlatform(p.key)}
          color={accentColor}
        />
      ))}
    </div>
  );

  // ── Duration selector (shared) ──
  const DurationSelector = () => (
    <div className="grid grid-cols-3 gap-3">
      {[7, 14, 30].map(d => (
        <OptionCard
          key={d}
          label={`${d} days`}
          selected={days === d}
          onClick={() => setDays(d)}
          color={accentColor}
        />
      ))}
    </div>
  );

  // ═══════════════════════════════════════
  // RENDER STEPS
  // ═══════════════════════════════════════

  const renderContent = () => {
    // Step 0: Mode selection
    if (step === 0) {
      return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Start the Engine</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose your deployment mode.</p>
          </div>
          <div className="space-y-4">
            <ModeCard
              id="intensity"
              icon={Zap}
              title="Intensity Mode"
              description="Ongoing visibility stacking. Build presence consistently over time."
              color="blue"
            />
            <ModeCard
              id="intention"
              icon={Target}
              title="Intention Based Mode"
              description="Event-driven, product-driven bursts. Deploy with intent."
              color="orange"
            />
          </div>
        </div>
      );
    }

    // ── INTENSITY MODE STEPS ──
    if (mode === 'intensity') {
      if (step === 1) {
        return (
          <div>
            <StepHeader title="Select Duration" />
            <DurationSelector />
            <ContinueButton onClick={() => setStep(2)} />
          </div>
        );
      }
      if (step === 2) {
        return (
          <div>
            <StepHeader title="Select Platforms" />
            <PlatformGrid />
            <ContinueButton onClick={() => setStep(3)} disabled={platforms.length === 0} />
          </div>
        );
      }
      if (step === 3) {
        return (
          <div>
            <StepHeader title="Posting Frequency" />
            <div className="space-y-3">
              <OptionCard label="Random spread" selected={frequency === 0} onClick={() => setFrequency(1)} color="blue" />
              <OptionCard label="1 per day" selected={frequency === 1} onClick={() => setFrequency(1)} color="blue" />
              <OptionCard label="2 per day" selected={frequency === 2} onClick={() => setFrequency(2)} color="blue" />
              <OptionCard label="3 per day" selected={frequency === 3} onClick={() => setFrequency(3)} color="blue" />
            </div>
            <ContinueButton onClick={handleDeploy} disabled={totalPosts === 0 || credits < totalPosts} label="Deploy the Stack" />
          </div>
        );
      }
    }

    // ── INTENTION BASED MODE STEPS ──
    if (mode === 'intention') {
      if (step === 1) {
        return (
          <div>
            <StepHeader title="Name Your Campaign" />
            <div>
              <Label className="text-sm font-medium mb-2 block">Campaign Name</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Product launch"
                className="h-12 text-base"
              />
            </div>
            <ContinueButton onClick={() => setStep(2)} disabled={!campaignName.trim()} />
          </div>
        );
      }
      if (step === 2) {
        return (
          <div>
            <StepHeader title="Campaign Goal" />
            <div className="space-y-3">
              {['Launch', 'Event', 'Promotion', 'Seasonal', 'Announcement'].map(goal => (
                <OptionCard
                  key={goal}
                  label={goal}
                  selected={campaignGoal === goal}
                  onClick={() => setCampaignGoal(goal)}
                  color="orange"
                />
              ))}
            </div>
            <ContinueButton onClick={() => setStep(3)} />
          </div>
        );
      }
      if (step === 3) {
        return (
          <div>
            <StepHeader title="Select Platforms" />
            <PlatformGrid />
            <div className="mt-4">
              <Label className="text-sm font-medium mb-3 block">Duration</Label>
              <DurationSelector />
            </div>
            <ContinueButton onClick={() => setStep(4)} disabled={platforms.length === 0} />
          </div>
        );
      }
      if (step === 4) {
        return (
          <div>
            <StepHeader title="Posting Intensity" />
            <div className="space-y-3">
              <OptionCard label="Steady" selected={intensity === 'steady'} onClick={() => setIntensity('steady')} color="orange" />
              <OptionCard label="Ramp Up" selected={intensity === 'ramp_up'} onClick={() => setIntensity('ramp_up')} color="orange" />
              <OptionCard label="Aggressive" selected={intensity === 'aggressive'} onClick={() => setIntensity('aggressive')} color="orange" />
            </div>
            <ContinueButton onClick={handleDeploy} disabled={totalPosts === 0 || credits < totalPosts} label="Launch the Campaign" />
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className="p-6 pb-2">
          {renderContent()}
        </div>

        {/* ── Credit counter (always visible once a mode is selected) ── */}
        {mode && platforms.length > 0 && (
          <div className={cn(
            "px-6 py-3 border-t text-sm text-center",
            isBlue ? "bg-blue-50/50 border-blue-100" : "bg-orange-50/50 border-orange-100"
          )}>
            <span className="text-muted-foreground">
              This will generate <span className="font-bold text-foreground">{totalPosts}</span> posts using{' '}
              <span className="font-bold text-foreground">{totalPosts}</span> credits.{' '}
              You have <span className={cn("font-bold", credits >= totalPosts ? "text-emerald-600" : "text-destructive")}>{credits}</span> available.
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartEngineWizard;
