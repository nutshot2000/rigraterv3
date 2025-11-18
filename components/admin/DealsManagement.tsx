import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Deal } from '../../types';
import { AMAZON_TAG_UK, AMAZON_TAG_US } from '../../constants';
import { generateProductInfo } from '../../services/geminiService';

const emptyDeal: Omit<Deal, 'id' | 'createdAt'> = {
  title: '',
  url: '',
  description: '',
  merchant: '',
  priceLabel: '',
  tag: '',
  imageUrl: '',
  isActive: true,
  expiresAt: '',
};

const DealsManagement: React.FC = () => {
  const { deals, addDeal, updateDeal, deleteDeal } = useApp();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [draft, setDraft] = useState<Omit<Deal, 'id' | 'createdAt'>>(emptyDeal);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const ensureAffiliateUrl = (raw: string): string => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return trimmed;

    try {
      const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const u = new URL(withProto);
      const host = u.hostname.toLowerCase();

      // Only touch Amazon links
      if (!host.includes('amazon.')) return trimmed;

      const params = u.searchParams;
      const isUK = host.endsWith('.co.uk') || host.endsWith('.uk');
      const tag = isUK ? AMAZON_TAG_UK : AMAZON_TAG_US;

      if (tag) {
        params.set('tag', tag);
      }

      u.search = params.toString();
      return u.toString();
    } catch {
      return trimmed;
    }
  };

  const autoFillFromUrl = async () => {
    const raw = draft.url?.trim();
    if (!raw) return;

    setIsAnalyzing(true);
    try {
      const info = await generateProductInfo(raw);
      
      // Construct a price label if possible
      let label = '';
      if (info.price && info.price !== '$0.00') {
        label = info.price;
        if ((info as any).originalPrice) {
          label += ` (was ${(info as any).originalPrice}`;
          if ((info as any).discountPercentage) {
             label += `, -${(info as any).discountPercentage}%`;
          }
          label += ')';
        }
      }

      setDraft(prev => ({
        ...prev,
        title: prev.title || info.name || prev.title,
        merchant: prev.merchant || info.brand || prev.merchant,
        tag: prev.tag || info.category || 'Deal',
        imageUrl: prev.imageUrl || info.imageUrl || prev.imageUrl,
        description: prev.description || info.review || prev.description,
        priceLabel: prev.priceLabel || label || prev.priceLabel,
      }));
    } catch (e) {
      console.error('AI Auto-fill failed', e);
      // Fallback to basic regex
      fallbackAutoFill(raw);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fallbackAutoFill = (raw: string) => {
    try {
      const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
      const u = new URL(withProtocol);
      const host = u.hostname.replace(/^www\./i, '');

      let path = u.pathname || '';
      // Strip trailing slash
      if (path.endsWith('/')) path = path.slice(0, -1);

      let slug = path.split('/').filter(Boolean).pop() || '';

      // Amazon special-case: try to grab segment before /dp or /gp/
      const amazonMatch = path.match(/\/([^\/]+)\/dp\/|\/dp\/([^\/]+)/);
      if (amazonMatch) {
        slug = amazonMatch[1] || amazonMatch[2] || slug;
      }

      slug = decodeURIComponent(slug)
        .replace(/[_+]+/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const titleGuess = slug
        .split(' ')
        .map(w => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
        .join(' ');

      setDraft(prev => ({
        ...prev,
        title: prev.title || titleGuess || prev.title,
        merchant: prev.merchant || host,
        tag: prev.tag || 'Black Friday',
      }));
    } catch {}
  };

  const startCreate = () => {
    setEditing(null);
    setDraft(emptyDeal);
  };

  const startEdit = (deal: Deal) => {
    setEditing(deal);
    setDraft({
      title: deal.title,
      url: deal.url,
      description: deal.description || '',
      merchant: deal.merchant || '',
      priceLabel: deal.priceLabel || '',
      tag: deal.tag || '',
      imageUrl: deal.imageUrl || '',
      isActive: deal.isActive ?? true,
      expiresAt: deal.expiresAt || '',
    });
  };

  const handleChange = (field: keyof Omit<Deal, 'id' | 'createdAt'>, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = {
      ...draft,
      title: draft.title.trim(),
      url: ensureAffiliateUrl(draft.url),
      description: draft.description?.trim() || undefined,
      merchant: draft.merchant?.trim() || undefined,
      priceLabel: draft.priceLabel?.trim() || undefined,
      tag: draft.tag?.trim() || undefined,
      imageUrl: draft.imageUrl?.trim() || undefined,
       isActive: draft.isActive ?? true,
       expiresAt: draft.expiresAt || undefined,
    };
    if (!payload.title || !payload.url) return;

    if (editing) {
      updateDeal({ ...editing, ...payload });
    } else {
      addDeal(payload);
    }
    setEditing(null);
    setDraft(emptyDeal);
  };

  const handleDelete = (deal: Deal) => {
    if (window.confirm(`Remove deal "${deal.title}"?`)) {
      deleteDeal(deal.id);
    }
  };

  const isEditing = Boolean(editing);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Deals</h1>
            <p className="text-slate-400 text-sm">
              This feeds the <span className="font-semibold text-amber-300">BLACK FRIDAY DEALS</span> button in the header.
              Add all the offers you find and they will show on the public deals page.
            </p>
          </div>
          <button
            onClick={startCreate}
            className="btn-blueprint btn-blueprint--primary"
          >
            New Deal
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6">
          <div className="space-y-4">
            {deals.length === 0 && (
              <div className="border border-dashed border-slate-700 rounded-lg p-6 text-slate-400 text-sm">
                No deals yet. Click <span className="font-semibold text-sky-400">New Deal</span> to add your first Black Friday or Christmas offer.
              </div>
            )}
            {deals.map(deal => (
              <div
                key={deal.id}
                className="flex items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/70 rounded-lg px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{deal.title}</p>
                    {deal.tag && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-400/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-200">
                        {deal.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{deal.url}</p>
                  {deal.priceLabel && (
                    <p className="text-xs text-emerald-300 mt-1">{deal.priceLabel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(deal)}
                    className="btn-blueprint text-xs px-3 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(deal)}
                    className="btn-blueprint text-xs px-3 py-1 text-rose-300 border border-rose-500/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Edit deal' : 'New deal'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={e => handleChange('title', e.target.value)}
                  className="input-blueprint w-full"
                  placeholder="e.g. CORSAIR 2500X Black Friday bundle"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.url}
                    onChange={e => handleChange('url', e.target.value)}
                    className="input-blueprint flex-1"
                    placeholder="Paste your Amazon / retailer URL"
                  />
                  <button
                    type="button"
                    onClick={autoFillFromUrl}
                    disabled={isAnalyzing}
                    className="btn-blueprint text-xs whitespace-nowrap px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? 'Thinking...' : 'Magic Fill (AI)'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price / label</label>
                  <input
                    type="text"
                    value={draft.priceLabel}
                    onChange={e => handleChange('priceLabel', e.target.value)}
                    className="input-blueprint w-full"
                    placeholder="£149 (was £199)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tag</label>
                  <input
                    type="text"
                    value={draft.tag}
                    onChange={e => handleChange('tag', e.target.value)}
                    className="input-blueprint w-full"
                    placeholder="Black Friday / Christmas / GPU"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Merchant</label>
                <input
                  type="text"
                  value={draft.merchant}
                  onChange={e => handleChange('merchant', e.target.value)}
                  className="input-blueprint w-full"
                  placeholder="Amazon / Scan / Overclockers"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL (optional)</label>
                <input
                  type="text"
                  value={draft.imageUrl}
                  onChange={e => handleChange('imageUrl', e.target.value)}
                  className="input-blueprint w-full"
                  placeholder="Paste image URL or leave empty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Short description</label>
                <textarea
                  value={draft.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="input-blueprint w-full min-h-[80px]"
                  placeholder="Why this deal is good, key specs, etc."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.isActive ?? true}
                    onChange={e => handleChange('isActive', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Show this deal on the public deals page</span>
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expires (optional)</label>
                  <input
                    type="date"
                    value={draft.expiresAt ? draft.expiresAt.slice(0, 10) : ''}
                    onChange={e => handleChange('expiresAt', e.target.value)}
                    className="input-blueprint w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {isEditing && (
                <button
                  onClick={startCreate}
                  className="btn-blueprint text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                className="btn-blueprint btn-blueprint--primary text-sm"
                disabled={!draft.title.trim() || !draft.url.trim()}
              >
                {isEditing ? 'Save changes' : 'Add deal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealsManagement;


