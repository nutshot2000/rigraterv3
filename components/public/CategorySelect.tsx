import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CategorySelectProps {
  categories: string[];
  value: string;
  onChange: (next: string) => void;
  label?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ categories, value, onChange, label = 'Category' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? categories.filter(c => c.toLowerCase().includes(q)) : categories;
    // Keep "All" at the top
    return list[0] === 'All' ? list : ['All', ...list.filter(c => c !== 'All')];
  }, [categories, query]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <button
        type="button"
        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-left text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        onClick={() => setOpen(o => !o)}
      >
        {value || 'All'}
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter..."
            className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="max-h-64 overflow-auto grid grid-cols-2 md:grid-cols-3 gap-2">
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setQuery(''); }}
                className={`px-3 py-2 rounded-md text-sm text-left border ${c === value ? 'bg-teal-600 border-teal-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;


