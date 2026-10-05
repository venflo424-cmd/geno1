import React, { useState } from 'react';
import {
  Upload,
  Link2,
  Sparkles,
  Play,
  Pause,
  Clock,
  Palette,
  FileCheck2,
  CheckCircle2,
  Sliders,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideo } from '../utils/sampleVideos';

interface LandingPageProps {
  onOpenUpload: (tab?: 'upload' | 'url' | 'sample') => void;
  onSelectSample: (sample: SampleVideo) => void;
  onViewProjects: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenUpload,
  onSelectSample,
  onViewProjects,
}) => {
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoTime, setDemoTime] = useState(2.4);

  // Demo caption text simulation
  const demoCaptions = [
    { start: 0, end: 3.2, text: 'Welcome to CaptionCraft AI Studio.' },
    { start: 3.2, end: 6.8, text: 'Full-length video captions synchronized from start to finish.' },
    { start: 6.8, end: 10.5, text: 'Customized typography, word-pop animations, and instant export.' },
  ];

  const activeDemoCaption =
    demoCaptions.find((c) => demoTime >= c.start && demoTime <= c.end) || demoCaptions[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-16 max-w-7xl mx-auto w-full text-center">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Feature badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Full-Length Processing • Never Cuts Off After A Few Seconds</span>
        </div>

        {/* Spec Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          AI-Powered Video Captions,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300">
            Automatically.
          </span>
        </h1>

        {/* Spec Subheading */}
        <p className="mt-5 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Upload a video or paste a video URL and generate accurate, perfectly synchronized captions in minutes.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => onOpenUpload('upload')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={() => onOpenUpload('url')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:border-slate-600"
          >
            <Link2 className="w-4 h-4 text-indigo-400" />
            <span>Paste Video URL</span>
          </button>
        </div>

        {/* Secondary text */}
        <p className="mt-4 text-xs font-medium text-slate-400">
          Fast transcription • Accurate timestamps • Custom caption styles • Easy export
        </p>

        {/* Visual Demonstration of Caption Editor */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/80 overflow-hidden text-left backdrop-blur-xl">
          {/* Editor Header Simulation */}
          <div className="h-11 border-b border-slate-800 bg-slate-950/60 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-medium text-slate-400">
                Interactive Studio Preview · Live Subtitle Renderer
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full Video Synchronized
              </span>
            </div>
          </div>

          {/* Interactive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Left: Video Canvas Simulation */}
            <div className="lg:col-span-7 bg-black p-4 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-800">
              {/* Fake Video Content */}
              <div className="relative w-full aspect-video rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=1000&auto=format&fit=crop&q=80"
                  alt="Video frame"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />

                {/* Subtitle Overlay rendered live */}
                <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center text-center pointer-events-none">
                  <div className="inline-block px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 shadow-xl max-w-[85%]">
                    <p className="text-white text-base sm:text-lg font-bold tracking-wide">
                      {activeDemoCaption.text}
                    </p>
                  </div>
                </div>

                {/* Center Play Button */}
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="w-14 h-14 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer z-10"
                >
                  {isPlayingDemo ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
              </div>

              {/* Video Player Scrub bar */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">
                  00:0{Math.floor(demoTime)}:0{Math.floor((demoTime % 1) * 60)}
                </span>
                <input
                  type="range"
                  min="0"
                  max="10.5"
                  step="0.1"
                  value={demoTime}
                  onChange={(e) => setDemoTime(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                />
                <span className="text-xs font-mono text-slate-400">00:10:30</span>
              </div>
            </div>

            {/* Right: Caption Timeline & Text List */}
            <div className="lg:col-span-5 p-4 flex flex-col justify-between bg-slate-950/40">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Synchronized Captions
                </span>
                <span className="text-xs text-indigo-400 font-medium">3 Segments</span>
              </div>

              {/* Caption items */}
              <div className="space-y-2.5 my-3 flex-1 overflow-y-auto">
                {demoCaptions.map((cap, i) => {
                  const isActive = demoTime >= cap.start && demoTime <= cap.end;
                  return (
                    <div
                      key={i}
                      onClick={() => setDemoTime(cap.start + 0.1)}
                      className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-950/50 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>
                          00:0{cap.start.toFixed(1)} → 00:0{cap.end.toFixed(1)}
                        </span>
                        {isActive && <span className="text-indigo-400 font-semibold">Active</span>}
                      </div>
                      <p className="font-medium text-slate-200">{cap.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Quick try sample CTA */}
              <button
                onClick={() => onOpenUpload('sample')}
                className="w-full py-2.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Try Instant Demo with Sample Video</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Curated Sample Videos Shelf for 1-Click Instant Testing */}
        <div className="mt-16 text-left max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Instant Test Videos</h3>
              <p className="text-xs text-slate-400">
                Don't have a video on hand? Test the full pipeline with one click.
              </p>
            </div>
            <button
              onClick={() => onOpenUpload('sample')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              View all samples →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_VIDEOS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className="group p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-2.5">
                  <img
                    src={sample.thumbnail}
                    alt={sample.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                    {sample.duration}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {sample.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
                  <span>Transcribe Clip</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Architectural Pillars */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-5xl mx-auto">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Complete Video Coverage</h4>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Processes the entire video duration from 00:00 to the exact end timestamp with zero premature stoppage.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
              <Sliders className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Interactive Visual Timeline</h4>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Draggable boundary handles, zoomable time scales, live playhead scrubbing, split, and merge.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Palette className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Custom Styles & Presets</h4>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Modern, Social/Reels, Cinematic, Word-Pop animated karaoke highlights, custom typography and effects.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Multi-Format Export</h4>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Export standard SRT, VTT, TXT, ASS subtitles or render burned-in MP4 videos with server-side FFmpeg.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>CaptionCraft AI Studio · Professional Subtitle & Video Caption Generation</p>
      </footer>
    </div>
  );
};
