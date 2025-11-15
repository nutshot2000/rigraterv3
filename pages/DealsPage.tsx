import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';

const DealsPage: React.FC = () => {
  const { deals } = useApp();

  const dealsCount = deals.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RIGRATER PC Hardware Deals',
    itemListElement: deals.map((deal, index) => ({
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
        </div>

        {deals.length === 0 ? (
          <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            No deals published yet. Check back soon – or log in to the admin panel to add your first offers.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map(deal => (
              <a
                key={deal.id}
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 hover:border-amber-400/70 hover:bg-slate-900/80 transition-colors"
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


