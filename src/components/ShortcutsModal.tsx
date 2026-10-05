import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video' },
    { key: '← / →', desc: 'Scrub backwards / forwards 1s' },
    { key: 'Shift + ← / →', desc: 'Scrub backwards / forwards 5s' },
    { key: 'S', desc: 'Split selected caption at current playhead' },
    { key: 'M', desc: 'Merge selected caption with next' },
    { key: 'Ctrl / ⌘ + Z', desc: 'Undo last edit' },
    { key: 'Ctrl / ⌘ + Shift + Z', desc: 'Redo last edit' },
    { key: 'Ctrl / ⌘ + S', desc: 'Force save project' },
    { key: 'Del / Backspace', desc: 'Delete selected caption (when not typing)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-indigo-300">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
