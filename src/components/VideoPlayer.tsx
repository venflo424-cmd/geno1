import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
} from 'lucide-react';
import { CaptionItem, CaptionStyle } from '../types';
import { formatDisplayTime } from '../utils/subtitles';

interface VideoPlayerProps {
  videoUrl: string;
  captions: CaptionItem[];
  style: CaptionStyle;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (dur: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  activeCaption: CaptionItem | null;
  onSelectCaption: (caption: CaptionItem) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  captions,
  style,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  onSeek,
  activeCaption,
  onSelectCaption,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Sync isPlaying prop with HTML5 video
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync seek prop if difference is significant (> 0.25s)
  useEffect(() => {
    if (!videoRef.current) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.25) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    onTimeUpdate(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      onDurationChange(videoRef.current.duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Convert font style to CSS classes or inline style
  const getCaptionContainerStyle = (): React.CSSProperties => {
    let topPercent: number;
    if (style.position === 'top') topPercent = 12;
    else if (style.position === 'center') topPercent = 50;
    else if (style.position === 'bottom') topPercent = 86;
    else topPercent = style.verticalPercent ?? 85;

    return {
      top: `${topPercent}%`,
      transform: 'translateY(-50%)',
    };
  };

  const getCaptionTextStyle = (): React.CSSProperties => {
    const css: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      fontWeight:
        style.fontWeight === 'extrabold'
          ? 800
          : style.fontWeight === 'bold'
          ? 700
          : style.fontWeight === 'semibold'
          ? 600
          : 400,
      color: style.textColor,
      textTransform: style.textTransform === 'uppercase' ? 'uppercase' : 'none',
      fontStyle: style.isItalic ? 'italic' : 'normal',
      textAlign: style.align,
    };

    if (style.effect === 'outline') {
      css.textShadow = `-2px -2px 0 ${style.outlineColor}, 2px -2px 0 ${style.outlineColor}, -2px 2px 0 ${style.outlineColor}, 2px 2px 0 ${style.outlineColor}, 0 2px 4px rgba(0,0,0,0.8)`;
    } else if (style.effect === 'shadow') {
      css.textShadow = '2px 3px 6px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7)';
    } else if (style.effect === 'glow') {
      css.textShadow = `0 0 12px ${style.highlightColor}, 0 0 4px ${style.highlightColor}`;
    }

    return css;
  };

  // Background box style
  const getCaptionBoxStyle = (): React.CSSProperties => {
    if (style.backgroundType === 'none') {
      return {};
    }

    // Convert hex to rgba
    let hex = style.backgroundColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.substring(0, 2) || '0', 16);
    const g = parseInt(hex.substring(2, 4) || '0', 16);
    const b = parseInt(hex.substring(4, 6) || '0', 16);
    const bgRgba = `rgba(${r}, ${g}, ${b}, ${style.backgroundOpacity})`;

    return {
      backgroundColor: bgRgba,
      borderRadius:
        style.backgroundType === 'rounded'
          ? '9999px'
          : style.backgroundType === 'box'
          ? '8px'
          : '4px',
      padding: '6px 18px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    };
  };

  // Render words with live highlight if enabled
  const renderCaptionContent = () => {
    if (!activeCaption) return null;

    if (style.wordHighlight && activeCaption.words && activeCaption.words.length > 0) {
      return (
        <span className="inline">
          {activeCaption.words.map((w, idx) => {
            const isWordActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={idx}
                style={{
                  color: isWordActive ? style.highlightColor : style.textColor,
                  transform: isWordActive ? 'scale(1.08)' : 'scale(1)',
                  display: 'inline-block',
                  marginRight: '0.28em',
                  transition: 'all 0.1s ease',
                  fontWeight: isWordActive ? 800 : undefined,
                }}
              >
                {w.word}
              </span>
            );
          })}
        </span>
      );
    }

    return <span>{activeCaption.text}</span>;
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      className="relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden select-none group"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        onClick={onPlayPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => onSeek(0)}
        className="w-full h-full max-h-[68vh] object-contain cursor-pointer"
      />

      {/* Live Overlay Subtitle */}
      {activeCaption && (
        <div
          style={getCaptionContainerStyle()}
          className="absolute left-0 right-0 px-6 flex justify-center pointer-events-auto z-20"
        >
          <div
            onClick={() => onSelectCaption(activeCaption)}
            style={getCaptionBoxStyle()}
            className="max-w-[90%] text-center cursor-pointer hover:ring-2 hover:ring-indigo-400/50 transition-all backdrop-blur-[2px]"
          >
            <div style={getCaptionTextStyle()} className="leading-snug">
              {renderCaptionContent()}
            </div>
          </div>
        </div>
      )}

      {/* Custom Video Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Slider */}
        <div className="relative flex items-center mb-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 hover:accent-indigo-400 cursor-pointer h-1.5 bg-slate-700/80 rounded-lg transition-all"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Replay 5s */}
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              title="Back 5 seconds"
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-slate-300 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Forward 5s */}
            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              title="Forward 5 seconds"
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-slate-300 hover:text-white"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Time Display */}
            <div className="font-mono text-xs text-slate-300 ml-2">
              <span className="text-white font-semibold">{formatDisplayTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatDisplayTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Playback Speed */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-0.5">
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRateChange(r)}
                  className={`text-[10px] font-semibold px-1 rounded transition-colors cursor-pointer ${
                    playbackRate === r ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-indigo-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
