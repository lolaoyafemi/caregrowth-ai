
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrandStyle } from '@/hooks/useBrandStyle';

interface BrandStyleSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (style: Partial<Omit<BrandStyle, 'id' | 'user_id'>>) => Promise<any>;
  initialValues?: Partial<BrandStyle>;
  onComplete?: () => void;
}

const TEMPLATES = [
  {
    value: 'quote_card',
    name: 'The Bold Statement',
    audience: 'Best for agencies that want strong, confident posts.',
    description: 'Large headline. Clean background. Strong contrast.',
    detail: 'Perfect for quotes, advice, and thought-provoking posts that stop the scroll.',
    explanation: 'This style turns your ideas into bold, shareable statements.',
    exampleHeadline: 'Caregiving should not cost you your life.',
    exampleSub: 'Families deserve support too.',
  },
  {
    value: 'minimalist',
    name: 'The Clean Professional',
    audience: 'Best for agencies that want a calm, trustworthy look.',
    description: 'Minimal design. Lots of breathing space. Professional and polished.',
    detail: 'Great for educational posts and thoughtful insights.',
    explanation: 'This style feels professional, calm, and trustworthy.',
    exampleHeadline: "You don't have to do this alone.",
    exampleSub: 'Support exists.\nYou just need the right team.',
  },
  {
    value: 'dark_mode',
    name: 'The Story Card',
    audience: 'Best for emotional storytelling.',
    description: 'Short story highlight. Warm tone. Designed to pull readers into the caption.',
    detail: 'This style highlights real moments and emotional impact.',
    explanation: 'This style highlights real moments and emotional impact.',
    exampleHeadline: 'Last month…',
    exampleSub: 'A husband had his first night off in years.\nThat\'s what support looks like.',
  },
];

const PRESET_COLORS = [
  '#1a56db', '#7c3aed', '#059669', '#dc2626',
  '#ea580c', '#0891b2', '#4f46e5', '#be185d',
];

const BrandStyleSetup: React.FC<BrandStyleSetupProps> = ({
  open,
  onOpenChange,
  onSave,
  initialValues,
  onComplete,
}) => {
  const [step, setStep] = useState<'template' | 'colors' | 'done'>('template');
  const [theme, setTheme] = useState(initialValues?.selected_template_theme || '');
  const [primaryColor, setPrimaryColor] = useState(initialValues?.brand_primary_color || '#1a56db');
  const [accentColor, setAccentColor] = useState(initialValues?.brand_accent_color || '#7c3aed');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        selected_template_theme: theme || 'quote_card',
        brand_primary_color: primaryColor,
        brand_accent_color: accentColor,
        brand_font_style: 'modern',
        brand_display_name: null,
        optional_logo_url: null,
      });
      setStep('done');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (step === 'done') {
      onComplete?.();
    }
    onOpenChange(false);
    // Reset for next open
    setTimeout(() => setStep('template'), 300);
  };

  const renderTemplatePreview = (t: typeof TEMPLATES[0], selected: boolean) => {
    if (t.value === 'quote_card') {
      return (
        <div className="w-full aspect-square rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-5 text-center"
          style={{ background: selected ? `linear-gradient(135deg, ${primaryColor}, ${accentColor})` : 'linear-gradient(135deg, #1a56db, #7c3aed)' }}>
          <p className="text-white font-bold text-sm leading-tight">{t.exampleHeadline}</p>
          <p className="text-white/70 text-[10px] mt-1.5">{t.exampleSub}</p>
          <p className="text-white/30 text-[7px] mt-3 tracking-[0.2em] uppercase">Your Brand</p>
        </div>
      );
    }
    if (t.value === 'minimalist') {
      return (
        <div className="w-full aspect-square rounded-xl overflow-hidden relative flex flex-col justify-center p-5 bg-[#fafafa]">
          <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: selected ? primaryColor : '#1a56db' }} />
          <p className="text-gray-900 font-bold text-sm leading-tight">{t.exampleHeadline}</p>
          <p className="text-gray-500 text-[10px] mt-1.5 whitespace-pre-line">{t.exampleSub}</p>
          <p className="text-gray-300 text-[7px] mt-3 tracking-[0.2em] uppercase">Your Brand</p>
        </div>
      );
    }
    // dark_mode / story card
    return (
      <div className="w-full aspect-square rounded-xl overflow-hidden relative flex flex-col justify-center p-5 bg-[#0a0a0a]">
        <div className="absolute top-3 right-3 w-12 h-12 rounded-full opacity-15 blur-lg" style={{ backgroundColor: selected ? accentColor : '#7c3aed' }} />
        <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: selected ? primaryColor : '#1a56db' }} />
        <p className="text-white font-bold text-sm leading-tight">{t.exampleHeadline}</p>
        <p className="text-[10px] mt-1.5 whitespace-pre-line" style={{ color: selected ? accentColor : '#7c3aed', opacity: 0.8 }}>{t.exampleSub}</p>
        <p className="text-white/30 text-[7px] mt-3 tracking-[0.2em] uppercase">Your Brand</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-0 bg-background">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Template Selection ── */}
          {step === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="p-6 sm:p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Choose the Instagram look that feels like your brand.
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {TEMPLATES.map((t) => {
                  const selected = theme === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={cn(
                        "group relative rounded-2xl border-2 p-4 text-left transition-all duration-200",
                        selected
                          ? "border-primary ring-2 ring-primary/20 shadow-lg"
                          : "border-border hover:border-muted-foreground/40 hover:shadow-md"
                      )}
                    >
                      {/* Checkmark */}
                      {selected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md z-10">
                          <Check size={14} className="text-primary-foreground" />
                        </div>
                      )}

                      {/* Preview */}
                      {renderTemplatePreview(t, selected)}

                      {/* Text */}
                      <div className="mt-4 space-y-1.5">
                        <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t.audience}</p>
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-2">{t.description}</p>
                        <p className="text-[11px] text-muted-foreground/60 italic">{t.detail}</p>
                      </div>

                      {/* Explanation pill */}
                      <div className={cn(
                        "mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed transition-colors",
                        selected
                          ? "bg-primary/5 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {t.explanation}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end mt-8">
                <Button
                  onClick={() => setStep('colors')}
                  disabled={!theme}
                  className="gap-2 px-6"
                  size="lg"
                >
                  Continue <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Brand Colors ── */}
          {step === 'colors' && (
            <motion.div
              key="colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="p-6 sm:p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Let's match your brand colors.
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  These colors will be used on your Instagram posts automatically.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-8">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
                      placeholder="#1a56db"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPrimaryColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                          primaryColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer p-0.5"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-sm"
                      placeholder="#7c3aed"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setAccentColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                          accentColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Live preview of selected template with chosen colors */}
                <div className="pt-4">
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Sparkles size={14} /> Live Preview
                  </Label>
                  <div className="max-w-[220px] mx-auto">
                    {renderTemplatePreview(TEMPLATES.find(t => t.value === theme) || TEMPLATES[0], true)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep('template')} className="gap-2">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 px-6"
                  size="lg"
                >
                  {saving ? 'Saving…' : 'Save Brand Style'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-8 sm:p-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                Nice. Your Instagram now has a signature look.
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Every post will be rendered with your brand colors and chosen template automatically.
              </p>

              {/* 3 mini preview cards */}
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
                {['Caregiving matters.', 'You deserve rest.', 'Support is here.'].map((text, i) => {
                  const t = TEMPLATES.find(t => t.value === theme) || TEMPLATES[0];
                  const bg = theme === 'dark_mode'
                    ? '#0a0a0a'
                    : theme === 'minimalist'
                      ? '#fafafa'
                      : `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;
                  const textColor = theme === 'minimalist' ? '#111827' : 'white';
                  return (
                    <div
                      key={i}
                      className="aspect-square rounded-xl flex items-center justify-center p-3 shadow-sm"
                      style={{ background: bg, color: textColor }}
                    >
                      <p className="text-[10px] font-bold text-center leading-tight">{text}</p>
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleClose} size="lg" className="px-8">
                Start Creating Posts
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default BrandStyleSetup;
