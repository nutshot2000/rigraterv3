import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PromoButtonConfig } from '../../types';

const AdminSettings: React.FC = () => {
  const { promoButton, setPromoButton } = useApp();

  const [form, setForm] = useState<PromoButtonConfig>(() => ({
    enabled: promoButton?.enabled ?? false,
    label: promoButton?.label ?? 'Deals',
    url: promoButton?.url ?? '/deals',
    size: promoButton?.size ?? 'md',
    color: promoButton?.color ?? 'amber',
    position: promoButton?.position ?? 'center',
    animation: promoButton?.animation ?? 'glow',
  }));

  const handleChange = (field: keyof PromoButtonConfig, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setPromoButton({
      enabled: form.enabled,
      label: form.label.trim() || 'Deals',
      url: form.url.trim() || '/deals',
      size: form.size ?? 'md',
      color: form.color ?? 'amber',
      position: form.position ?? 'center',
      animation: form.animation ?? 'glow',
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-2">Site Settings</h1>
        <p className="text-slate-400 text-sm mb-6">
          Configure global UI elements like the header promo / deals button.
        </p>

        <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Header Promo Button</h2>
          <p className="text-slate-400 text-sm">
            Control the optional button that appears in the top navigation (for example, Black Friday
            deals, Christmas bundles, or featured guides).
          </p>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => handleChange('enabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-200">Show promo button in header</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Button text</label>
            <input
              type="text"
              value={form.label}
              onChange={e => handleChange('label', e.target.value)}
              className="input-blueprint w-full"
              placeholder="e.g., Black Friday Deals"
              disabled={!form.enabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Button link</label>
            <input
              type="text"
              value={form.url}
              onChange={e => handleChange('url', e.target.value)}
              className="input-blueprint w-full"
              placeholder="e.g., /blog/black-friday-deals or https://example.com/deals"
              disabled={!form.enabled}
            />
            <p className="text-xs text-slate-500 mt-1">
              Use a relative path to link inside your site (like <code>/blog/my-deals-post</code>), or a full
              URL to link out to another site.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Size</label>
              <select
                value={form.size ?? 'md'}
                onChange={e => handleChange('size', e.target.value as PromoButtonConfig['size'])}
                className="input-blueprint w-full"
                disabled={!form.enabled}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Colour</label>
              <select
                value={form.color ?? 'amber'}
                onChange={e => handleChange('color', e.target.value as PromoButtonConfig['color'])}
                className="input-blueprint w-full"
                disabled={!form.enabled}
              >
                <option value="amber">Gold / Deals</option>
                <option value="sky">Sky Blue</option>
                <option value="emerald">Green</option>
                <option value="rose">Red / Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Position</label>
              <select
                value={form.position ?? 'center'}
                onChange={e => handleChange('position', e.target.value as PromoButtonConfig['position'])}
                className="input-blueprint w-full"
                disabled={!form.enabled}
              >
                <option value="center">Centre of header</option>
                <option value="right">Right with nav</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Animation</label>
              <select
                value={form.animation ?? 'glow'}
                onChange={e => handleChange('animation', e.target.value as PromoButtonConfig['animation'])}
                className="input-blueprint w-full"
                disabled={!form.enabled}
              >
                <option value="none">None</option>
                <option value="pulse">Soft pulse</option>
                <option value="bounce">Bounce</option>
                <option value="glow">Glow</option>
                <option value="wiggle">Wiggle</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Animations are subtle and only applied to the promo button so it grabs attention without being annoying.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="btn-blueprint btn-blueprint--primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;


