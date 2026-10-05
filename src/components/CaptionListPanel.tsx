import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Replace,
  Sparkles,
  RefreshCw,
  Plus,
  Play,
  Scissors,
  GitMerge,
  Copy,
  Trash2,
  Clock,
  User,
  ChevronDown,
  Check,
} from 'lucide-react';
import { CaptionItem } from '../types';
import { formatTime, formatDisplayTime } from '../utils/subtitles';

interface CaptionListPanelProps {
  captions: CaptionItem[];
  selectedCaptionId: string | null;
  currentTime: number;
  onSelectCaption: (id: string) => void;
  onSeek: (time: number) => void;
  onUpdateCaptionText: (id: string, text: string) => void;
  onUpdateCaptionSpeaker: (id: string, speaker: string) => void;
  onUpdateCaptionTimestamps: (id: string, start: number, end: number) => void;
  onSplitCaption: (id: string) => void;
  onMergeWithNext: (id: string) => void;
  onDuplicateCaption: (id: string) => void;
  onDeleteCaption: (id: string) => void;
  onAddCaption: () => void;
  onImproveCaptions: (action: 'clean_up' | 'concise' | 'grammar' | 'remove_filler') => Promise<void>;
  onAutoSync: () => Promise<void>;
  isAiProcessing: boolean;
}

export const CaptionListPanel: React.FC<CaptionListPanelProps> = ({
  captions,
  selectedCaptionId,
  currentTime,
  onSelectCaption,
  onSeek,
  onUpdateCaptionText,
  onUpdateCaptionSpeaker,
  onUpdateCaptionTimestamps,
  onSplitCaption,
  onMergeWithNext,
  onDuplicateCaption,
  onDeleteCaption,
  onAddCaption,
  onImproveCaptions,
  onAutoSync,
  isAiProcessing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);

  const activeItemRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active caption during playback
  useEffect(() => {
    if (activeItemRef.current && listContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime]);

  // Filter captions by search query
  const filteredCaptions = searchQuery.trim()
    ? captions.filter((c) =>
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.speaker && c.speaker.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : captions;

  const handleFindReplace = (replaceAll = false) => {
    if (!findText) return;
    if (replaceAll) {
      const regex = new RegExp(findText, 'gi');
      captions.forEach((cap) => {
        if (regex.test(cap.text)) {
          const updated = cap.text.replace(regex, replaceText);
          onUpdateCaptionText(cap.id, updated);
        }
      });
    } else {
      // Replace first occurrence found
      const target = captions.find((c) =>
        c.text.toLowerCase().includes(findText.toLowerCase())
      );
      if (target) {
        const regex = new RegExp(findText, 'i');
        const updated = target.text.replace(regex, replaceText);
        onUpdateCaptionText(target.id, updated);
        onSelectCaption(target.id);
        onSeek(target.startTime);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800 text-slate-100 select-none">
      {/* Header Controls */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Captions ({captions.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto-Sync button */}
            <button
              onClick={() => onAutoSync()}
              disabled={isAiProcessing}
              title="Auto-sync caption timings and gaps"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>Auto-Sync</span>
            </button>

            {/* AI Improve Captions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={isAiProcessing}
                className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>AI Improve</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAiMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    AI Caption Cleanup
                  </div>
                  <button
                    onClick={() => {
                      setShowAiMenu(false);
                      onImproveCaptions('clean_up');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-white">Clean Up</span>
                    <span className="text-[10px] text-slate-400">Fix typos, punctuation & phrasing</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAiMenu(false);
                      onImproveCaptions('concise');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-white">Make More Concise</span>
                    <span className="text-[10px] text-slate-400">Tighten dialogue for readability</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAiMenu(false);
                      onImproveCaptions('grammar');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-white">Fix Grammar</span>
                    <span className="text-[10px] text-slate-400">Correct grammatical syntax & casing</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAiMenu(false);
                      onImproveCaptions('remove_filler');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex flex-col cursor-pointer"
                  >
                    <span className="font-semibold text-white">Remove Filler Words</span>
                    <span className="text-[10px] text-slate-400">Remove um, uh, like, you know</span>
                  </button>
                </div>
              )}
            </div>

            {/* + Add Caption */}
            <button
              onClick={onAddCaption}
              className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Add new caption"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search captions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            title="Find & Replace"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showFindReplace
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Replace className="w-4 h-4" />
          </button>
        </div>

        {/* Find & Replace Expandable Panel (Section 21) */}
        {showFindReplace && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Find text..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleFindReplace(false)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] cursor-pointer"
              >
                Replace One
              </button>
              <button
                onClick={() => handleFindReplace(true)}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] cursor-pointer"
              >
                Replace All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Caption Rows List */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 select-text"
      >
        {filteredCaptions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            {searchQuery ? 'No captions match your search.' : 'No captions yet. Click + Add Caption to start.'}
          </div>
        ) : (
          filteredCaptions.map((cap, index) => {
            const isSelected = selectedCaptionId === cap.id;
            const isActive = currentTime >= cap.startTime && currentTime <= cap.endTime;

            return (
              <div
                key={cap.id}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSelectCaption(cap.id)}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : isActive
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Meta row: Timestamps & Speaker */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(cap.startTime);
                      }}
                      className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-300 hover:text-indigo-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                      title="Jump to caption start time"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{formatTime(cap.startTime, true)}</span>
                      <span className="text-slate-600">→</span>
                      <span>{formatTime(cap.endTime, true)}</span>
                    </button>

                    {/* Speaker Tag */}
                    {editingSpeakerId === cap.id ? (
                      <input
                        type="text"
                        defaultValue={cap.speaker || 'Speaker 1'}
                        onBlur={(e) => {
                          setEditingSpeakerId(null);
                          onUpdateCaptionSpeaker(cap.id, e.target.value.trim() || 'Speaker 1');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingSpeakerId(null);
                            onUpdateCaptionSpeaker(cap.id, (e.target as any).value.trim() || 'Speaker 1');
                          }
                        }}
                        autoFocus
                        className="bg-slate-900 border border-indigo-500 text-indigo-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none w-20"
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSpeakerId(cap.id);
                        }}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 cursor-pointer flex items-center gap-1"
                        title="Click to rename speaker"
                      >
                        <User className="w-2.5 h-2.5" />
                        <span>{cap.speaker || 'Speaker 1'}</span>
                      </button>
                    )}
                  </div>

                  {/* Actions for this caption */}
                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSplitCaption(cap.id);
                      }}
                      title="Split caption into two"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>

                    {index < captions.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergeWithNext(cap.id);
                        }}
                        title="Merge with next caption"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateCaption(cap.id);
                      }}
                      title="Duplicate caption"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCaption(cap.id);
                      }}
                      title="Delete caption"
                      className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Textarea (Editable inline) */}
                <textarea
                  rows={2}
                  value={cap.text}
                  onChange={(e) => onUpdateCaptionText(cap.id, e.target.value)}
                  className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-100 focus:outline-none resize-none leading-relaxed transition-colors"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
