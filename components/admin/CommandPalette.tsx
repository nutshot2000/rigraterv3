import React, { useEffect, useMemo, useState } from 'react';

export type CommandItem = {
    id: string;
    title: string;
    shortcut?: string;
    run: () => void;
};

const CommandPalette: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    commands: CommandItem[];
}> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return commands;
        return commands.filter(c => c.title.toLowerCase().includes(q));
    }, [commands, query]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70]" onClick={onClose} data-testid="cmd-modal">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative mx-auto mt-24 w-full max-w-xl rounded-lg border border-gray-700 bg-gray-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-3 border-b border-gray-700">
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type a command..."
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        data-testid="cmd-input"
                        aria-label="Command input"
                    />
                </div>
                <ul className="max-h-80 overflow-auto">
                    {filtered.map(cmd => (
                        <li key={cmd.id}>
                            <button
                                onClick={() => { cmd.run(); onClose(); }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white flex justify-between"
                                data-testid={`cmd-item-${cmd.id}`}
                            >
                                <span>{cmd.title}</span>
                                {cmd.shortcut && <span className="text-xs text-gray-400">{cmd.shortcut}</span>}
                            </button>
                        </li>
                    ))}
                    {filtered.length === 0 && (
                        <li className="px-4 py-3 text-gray-400 text-sm">No commands</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandPalette;


