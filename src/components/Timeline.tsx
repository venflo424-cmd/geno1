import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Scissors, GitMerge, Plus } from 'lucide-react';
import { CaptionItem } from '../types';
import { formatDisplayTime } from '../utils/subtitles';

interface TimelineProps {
  duration: number;
  currentTime: number;
  captions: CaptionItem[];
  selectedCaptionId: string | null;
  onSeek: (time: number) => void;
  onSelectCaption: (id: string) => void;
  onUpdateCaptionTime: (id: string, newStart: number, newEnd: number) => void;
  onSplitCaptionAtCurrentTime: () => void;
  onAddCaptionAtCurrentTime: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  captions,
  selectedCaptionId,
  onSeek,
  onSelectCaption,
  onUpdateCaptionTime,
  onSplitCaptionAtCurrentTime,
  onAddCaptionAtCurrentTime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 10x
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragState, setDragState] = useState<{
    type: 'start' | 'end' | 'move';
    captionId: string;
    origStart: number;
    origEnd: number;
    startX: number;
  } | null>(null);

  const totalDuration = Math.max(1, duration);

  // Time markers based on total duration & zoom
  const markerInterval = totalDuration > 1800 ? 120 : totalDuration > 600 ? 60 : totalDuration > 120 ? 15 : 5;
  const numMarkers = Math.ceil(totalDuration / markerInterval);
  const timeMarkers = Array.from({ length: numMarkers + 1 }, (_, i) => i * markerInterval);

  // Auto-scroll timeline to keep playhead in view when playing
  useEffect(() => {
    if (!containerRef.current || !trackRef.current || isDraggingPlayhead) return;
    const playheadPercent = currentTime / totalDuration;
    const scrollWidth = trackRef.current.scrollWidth;
    const clientWidth = containerRef.current.clientWidth;

    const playheadPx = playheadPercent * scrollWidth;
    const currentScrollLeft = containerRef.current.scrollLeft;

    if (playheadPx < currentScrollLeft || playheadPx > currentScrollLeft + clientWidth - 60) {
      containerRef.current.scrollLeft = Math.max(0, playheadPx - clientWidth / 3);
    }
  }, [currentTime, totalDuration, isDraggingPlayhead]);

  // Handle timeline track click to seek
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * totalDuration);
  };

  // Dragging handles logic
  const handleMouseDownHandle = (
    e: React.MouseEvent,
    type: 'start' | 'end' | 'move',
    cap: CaptionItem
  ) => {
    e.stopPropagation();
    onSelectCaption(cap.id);
    setDragState({
      type,
      captionId: cap.id,
      origStart: cap.startTime,
      origEnd: cap.endTime,
      startX: e.clientX,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        onSeek(pct * totalDuration);
        return;
      }

      if (!dragState || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const deltaPx = e.clientX - dragState.startX;
      const deltaSec = (deltaPx / rect.width) * totalDuration;

      const cap = captions.find((c) => c.id === dragState.captionId);
      if (!cap) return;

      if (dragState.type === 'start') {
        const newStart = Math.max(0, Math.min(cap.endTime - 0.3, dragState.origStart + deltaSec));
        onUpdateCaptionTime(cap.id, Number(newStart.toFixed(2)), cap.endTime);
      } else if (dragState.type === 'end') {
        const newEnd = Math.min(totalDuration, Math.max(cap.startTime + 0.3, dragState.origEnd + deltaSec));
        onUpdateCaptionTime(cap.id, cap.startTime, Number(newEnd.toFixed(2)));
      } else if (dragState.type === 'move') {
        const capDuration = dragState.origEnd - dragState.origStart;
        let newStart = dragState.origStart + deltaSec;
        let newEnd = dragState.origEnd + deltaSec;

        if (newStart < 0) {
          newStart = 0;
          newEnd = capDuration;
        } else if (newEnd > totalDuration) {
          newEnd = totalDuration;
          newStart = totalDuration - capDuration;
        }

        onUpdateCaptionTime(cap.id, Number(newStart.toFixed(2)), Number(newEnd.toFixed(2)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDragState(null);
    };

    if (isDraggingPlayhead || dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, dragState, captions, totalDuration, onSeek, onUpdateCaptionTime]);

  return (
    <div className="w-full bg-slate-950 border-t border-slate-800 flex flex-col select-none">
      {/* Timeline Controls Header */}
      <div className="h-10 px-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-mono text-indigo-400 font-bold">
            {formatDisplayTime(currentTime)}
          </span>
          <span className="text-slate-500 font-mono">/ {formatDisplayTime(totalDuration)}</span>

          <div className="h-3.5 w-px bg-slate-800" />

          {/* Quick Actions */}
          <button
            onClick={onSplitCaptionAtCurrentTime}
            title="Split selected caption at playhead (S)"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold hidden sm:inline">Split at Playhead</span>
          </button>

          <button
            onClick={onAddCaptionAtCurrentTime}
            title="Add new caption at playhead"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold hidden sm:inline">+ Add Caption</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
            disabled={zoomLevel <= 1}
            title="Zoom Out"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono font-semibold text-slate-300 w-8 text-center">
            {zoomLevel.toFixed(1)}x
          </span>

          <button
            onClick={() => setZoomLevel((z) => Math.min(8, z + 0.5))}
            disabled={zoomLevel >= 8}
            title="Zoom In"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoomLevel > 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Timeline Area */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden relative py-2 px-4 cursor-crosshair min-h-[140px] max-h-[170px]"
      >
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          className="relative h-28 bg-slate-900/50 rounded-xl border border-slate-800/80 overflow-hidden"
        >
          {/* Subtle Audio Waveform Simulation Background */}
          <div className="absolute inset-0 flex items-center opacity-15 pointer-events-none px-1">
            {Array.from({ length: 120 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: `${25 + (Math.sin(i * 0.4) * 20 + Math.cos(i * 0.8) * 30 + 35)}%`,
                }}
                className="flex-1 bg-indigo-400 mx-[1px] rounded-full"
              />
            ))}
          </div>

          {/* Time Ruler (top 20px) */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-slate-800/80 bg-slate-950/40 flex items-center pointer-events-none z-0">
            {timeMarkers.map((sec) => {
              const leftPercent = (sec / totalDuration) * 100;
              if (leftPercent > 100) return null;
              return (
                <div
                  key={sec}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between -translate-x-1/2"
                >
                  <span className="text-[9px] font-mono text-slate-500 font-medium px-1">
                    {formatDisplayTime(sec)}
                  </span>
                  <div className="h-1.5 w-px bg-slate-700 mx-auto" />
                </div>
              );
            })}
          </div>

          {/* Caption Blocks Track */}
          <div className="absolute top-7 bottom-1 left-0 right-0 px-0.5">
            {captions.map((cap) => {
              const leftPct = (cap.startTime / totalDuration) * 100;
              const widthPct = ((cap.endTime - cap.startTime) / totalDuration) * 100;
              const isSelected = selectedCaptionId === cap.id;
              const isActive = currentTime >= cap.startTime && currentTime <= cap.endTime;

              return (
                <div
                  key={cap.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCaption(cap.id);
                  }}
                  onMouseDown={(e) => handleMouseDownHandle(e, 'move', cap)}
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(0.5, widthPct)}%`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-lg border text-[11px] font-medium flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-shadow overflow-hidden group/block ${
                    isSelected
                      ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40 z-20'
                      : isActive
                      ? 'bg-indigo-950/90 border-indigo-500/80 text-white z-10'
                      : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }`}
                  title={`${cap.speaker ? cap.speaker + ': ' : ''}${cap.text} (${formatDisplayTime(cap.startTime)} - ${formatDisplayTime(cap.endTime)})`}
                >
                  {/* Left Resize Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownHandle(e, 'start', cap)}
                    className="absolute left-0 top-0 bottom-0 w-2.5 bg-indigo-400/0 hover:bg-indigo-400/60 cursor-ew-resize transition-colors flex items-center justify-center group-hover/block:bg-indigo-400/30"
                  >
                    <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                  </div>

                  {/* Caption Content Text */}
                  <div className="truncate px-1.5 flex items-center gap-1.5 pointer-events-none select-none">
                    {cap.speaker && (
                      <span className="text-[10px] font-bold text-indigo-300 uppercase">
                        {cap.speaker}:
                      </span>
                    )}
                    <span className="truncate">{cap.text}</span>
                  </div>

                  {/* Right Resize Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownHandle(e, 'end', cap)}
                    className="absolute right-0 top-0 bottom-0 w-2.5 bg-indigo-400/0 hover:bg-indigo-400/60 cursor-ew-resize transition-colors flex items-center justify-center group-hover/block:bg-indigo-400/30"
                  >
                    <div className="w-0.5 h-3 bg-white/70 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Red Playhead Line and Scrubber */}
          <div
            style={{
              left: `${Math.max(0, Math.min(100, (currentTime / totalDuration) * 100))}%`,
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none -translate-x-1/2"
          >
            {/* Scrubber Pin at top */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingPlayhead(true);
              }}
              className="w-3.5 h-4 bg-rose-500 text-white rounded-b-md shadow-md pointer-events-auto cursor-ew-resize -translate-x-1/2 flex items-center justify-center -top-0.5 absolute left-1/2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
