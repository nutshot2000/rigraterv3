import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { trackEvent } from '../services/analytics';

const DealsPage: React.FC = () => {
  const { deals } = useApp();

  const now = new Date();
  const activeDeals = useMemo(
    () =>
      deals.filter(d => {
        if (d.isActive === false) return false;
        if (d.expiresAt) {
          const exp = new Date(d.expiresAt);
          if (!Number.isNaN(exp.getTime()) && exp < now) return false;
        }
        return true;
      }),
    [deals, now],
  );

  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'discount'>('newest');

  const tags = useMemo(() => {
    const set = new Set<string>();
    activeDeals.forEach(d => {
      if (d.tag) set.add(d.tag);
    });
    return ['All', ...Array.from(set)];
  }, [activeDeals]);

  const parseDiscount = (label?: string): number => {
    if (!label) return 0;
    const m = label.match(/(-?\d{1,3})%\s*/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const visibleDeals = useMemo(() => {
    let list = activeDeals;
    if (selectedTag !== 'All') {
      list = list.filter(d => d.tag === selectedTag);
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'discount') {
        return parseDiscount(b.priceLabel) - parseDiscount(a.priceLabel);
      }
      // newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted;
  }, [activeDeals, selectedTag, sortBy]);

  const dealsCount = visibleDeals.length;
  const lastUpdated =
    activeDeals.length > 0
      ? new Date(
          Math.max(...activeDeals.map(d => new Date(d.createdAt).getTime())),
        ).toLocaleDateString()
      : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RIGRATER PC Hardware Deals',
    itemListElement: visibleDeals.map((deal, index) => ({
      '@type': 'Offer',
      position: index + 1,
      name: deal.title,
      url: deal.url,
      description: deal.description || deal.priceLabel || undefined,
      seller: deal.merchant ? { '@type': 'Organization', name: deal.merchant } : undefined,
    })),
  };

  return (
    <>
      <Helmet>
        <title>PC Hardware Black Friday Deals | RIGRATER</title>
        <meta
          name="description"
          content="Live PC hardware deals on motherboards, GPUs, CPUs, cases and more. Curated Black Friday and seasonal offers hand-picked by RIGRATER."
        />
        <link rel="canonical" href="https://www.rigrater.com/deals" />
        <meta property="og:title" content="PC Hardware Black Friday Deals | RIGRATER" />
        <meta
          property="og:description"
          content="Live PC hardware deals on motherboards, GPUs, CPUs, cases and more. Curated Black Friday and seasonal offers hand-picked by RIGRATER."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.rigrater.com/deals" />
        <meta property="og:image" content="https://www.rigrater.com/og/rigrater-deals.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PC Hardware Black Friday Deals | RIGRATER" />
        <meta
          name="twitter:description"
          content="Live PC hardware deals on motherboards, GPUs, CPUs, cases and more. Curated Black Friday and seasonal offers hand-picked by RIGRATER."
        />
        {dealsCount > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>

      <div className="space-y-6">
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Black Friday Deals</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Hand-picked offers on PC cases, GPUs, CPUs and more. Updated whenever we spot a strong deal worth sharing.
          </p>
          {lastUpdated && (
            <p className="text-xs text-slate-500 mt-1">
              Last updated: <span className="font-semibold">{lastUpdated}</span>
            </p>
          )}
        </div>

        {visibleDeals.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filter by tag:</span>
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="input-blueprint px-2 py-1 text-xs sm:text-sm w-auto"
              >
                {tags.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={e =>
                  setSortBy(e.target.value as 'newest' | 'discount')
                }
                className="input-blueprint px-2 py-1 text-xs sm:text-sm w-auto"
              >
                <option value="newest">Newest first</option>
                <option value="discount">Biggest % off</option>
              </select>
            </div>
          </div>
        )}

        {visibleDeals.length === 0 ? (
          <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            No deals published yet. Check back soon – or log in to the admin panel to add your first offers.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDeals.map(deal => (
              <a
                key={deal.id}
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 hover:border-amber-400/70 hover:bg-slate-900/80 transition-colors"
                onClick={() =>
                  trackEvent('deal_click', {
                    id: deal.id,
                    title: deal.title,
                    url: deal.url,
                    tag: deal.tag,
                  })
                }
              >
                {deal.imageUrl && (
                  <div className="w-full bg-slate-900/80 aspect-[21/9] flex items-center justify-center overflow-hidden">
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(deal.imageUrl)}`}
                      alt={deal.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-white text-sm sm:text-base leading-snug">
                      {deal.title}
                    </h2>
                    {deal.tag && (
                      <span className="inline-flex whitespace-nowrap items-center rounded-full bg-amber-500/10 border border-amber-400/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                        {deal.tag}
                      </span>
                    )}
                  </div>
                  {deal.description && (
                    <p className="text-xs text-slate-400 line-clamp-3">
                      {deal.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {deal.priceLabel && (
                      <span className="text-[13px] font-semibold text-emerald-300">
                        {deal.priceLabel}
                      </span>
                    )}
                    {deal.merchant && (
                      <span className="text-[11px] text-slate-400">
                        {deal.merchant}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <span className="inline-flex items-center text-[11px] font-semibold text-amber-300 group-hover:text-amber-200">
                    View deal <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DealsPage;


