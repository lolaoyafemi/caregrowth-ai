
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Palette, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandStyle } from '@/hooks/useBrandStyle';

interface BrandStyleSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (style: Partial<Omit<BrandStyle, 'id' | 'user_id'>>) => Promise<any>;
  initialValues?: Partial<BrandStyle>;
}

const TEMPLATE_OPTIONS = [
  {
    value: 'quote_card',
    label: 'Quote Card',
    description: 'Bold gradient background with centered text',
    preview: 'bg-gradient-to-br from-blue-600 to-purple-600',
  },
  {
    value: 'minimalist',
    label: 'Minimalist',
    description: 'Clean white background with sharp typography',
    preview: 'bg-gray-50 border-2 border-gray-200',
  },
  {
    value: 'dark_mode',
    label: 'Dark Mode',
    description: 'Dark background with accent glow',
    preview: 'bg-gray-900',
  },
];

const FONT_OPTIONS = [
  { value: 'modern', label: 'Modern', sample: "font-['Helvetica_Neue',Arial,sans-serif]" },
  { value: 'serif', label: 'Serif', sample: "font-serif" },
  { value: 'mono', label: 'Mono', sample: "font-mono" },
  { value: 'rounded', label: 'Rounded', sample: "font-sans" },
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
}) => {
  const [theme, setTheme] = useState(initialValues?.selected_template_theme || 'quote_card');
  const [primaryColor, setPrimaryColor] = useState(initialValues?.brand_primary_color || '#1a56db');
  const [accentColor, setAccentColor] = useState(initialValues?.brand_accent_color || '#7c3aed');
  const [fontStyle, setFontStyle] = useState(initialValues?.brand_font_style || 'modern');
  const [displayName, setDisplayName] = useState(initialValues?.brand_display_name || '');
  const [logoUrl, setLogoUrl] = useState(initialValues?.optional_logo_url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        selected_template_theme: theme,
        brand_primary_color: primaryColor,
        brand_accent_color: accentColor,
        brand_font_style: fontStyle,
        brand_display_name: displayName || null,
        optional_logo_url: logoUrl || null,
      });
      toast.success('Brand style saved! All future posts will use this look.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette size={22} className="text-primary" />
            Brand Style Setup
          </DialogTitle>
          <DialogDescription>
            Let's make your posts look like you. Choose a template, colors, and font style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Template Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Template Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "relative rounded-xl p-3 text-left border-2 transition-all",
                    theme === t.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn("w-full h-16 rounded-lg mb-2", t.preview)} />
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                  {theme === t.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="#1a56db"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      primaryColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="#7c3aed"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      accentColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Font Style */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Font Style</Label>
            <div className="grid grid-cols-4 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontStyle(f.value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-center transition-all",
                    fontStyle === f.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <p className={cn("text-lg font-bold", f.sample)}>Aa</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Brand Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your business name on images"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Logo URL <Badge variant="outline" className="ml-1 text-[10px]">Optional</Badge></Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1">
              <Sparkles size={14} /> Preview
            </Label>
            <div
              className="w-full aspect-square max-w-[200px] mx-auto rounded-xl flex flex-col items-center justify-center p-4 text-white relative overflow-hidden"
              style={{
                background: theme === 'dark_mode'
                  ? '#0a0a0a'
                  : theme === 'minimalist'
                    ? '#fafafa'
                    : `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                color: theme === 'minimalist' ? '#111827' : 'white',
              }}
            >
              <p className={cn(
                "text-sm font-bold text-center leading-tight",
                fontStyle === 'serif' && 'font-serif',
                fontStyle === 'mono' && 'font-mono',
              )}>
                Your Headline Here
              </p>
              <p className="text-[10px] mt-1 opacity-70 text-center">Supporting subheadline</p>
              <p className="text-[8px] mt-3 opacity-40 tracking-widest uppercase">
                {displayName || 'YOUR BRAND'}
              </p>
              {theme === 'dark_mode' && (
                <div
                  className="absolute top-2 right-2 w-16 h-16 rounded-full opacity-20 blur-xl"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Brand Style'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandStyleSetup;
