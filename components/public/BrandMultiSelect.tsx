import React, { useEffect, useMemo, useRef, useState } from 'react';

interface BrandMultiSelectProps {
  brands: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

const BrandMultiSelect: React.FC<BrandMultiSelectProps> = ({ brands, selected, onChange, placeholder = 'Select brands' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const unique = useMemo(() => Array.from(new Set(brands.filter(Boolean))).sort(), [brands]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return unique;
    return unique.filter(b => b.toLowerCase().includes(q));
  }, [unique, query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (brand: string) => {
    const active = selected.includes(brand);
    const next = active ? selected.filter(x => x !== brand) : [...selected, brand];
    onChange(next);
  };

  const clearAll = () => onChange([]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-left focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition flex items-center justify-between"
      >
        <span className="truncate text-slate-200">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="z-20 mt-2 w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
          <div className="p-2 border-b border-gray-700">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands..."
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No results</div>
            ) : filtered.map(b => {
              const active = selected.includes(b);
              return (
                <label key={b} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(b)}
                    className="accent-teal-500"
                  />
                  <span className="truncate">{b}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between p-2 border-t border-gray-700 text-xs">
            <button type="button" onClick={clearAll} className="text-gray-400 hover:text-white">Clear</button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded">Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandMultiSelect;


