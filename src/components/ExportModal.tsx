import React, { useState } from 'react';
import {
  Download,
  FileText,
  Video,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Project, ExportJob } from '../types';
import {
  captionsToSRT,
  captionsToVTT,
  captionsToTXT,
  captionsToASS,
  triggerDownload,
} from '../utils/subtitles';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onStartVideoExport: (resolution: 'original' | '1080p' | '720p', burnedIn: boolean) => Promise<ExportJob>;
  activeExportJob: ExportJob | null;
  onRetryExport: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  onStartVideoExport,
  activeExportJob,
  onRetryExport,
}) => {
  const [activeTab, setActiveTab] = useState<'subtitles' | 'video'>('subtitles');
  const [resolution, setResolution] = useState<'original' | '1080p' | '720p'>('original');
  const [burnedIn, setBurnedIn] = useState(true);
  const [isStartingExport, setIsStartingExport] = useState(false);
  const [subtitlePreviewFormat, setSubtitlePreviewFormat] = useState<'srt' | 'vtt' | 'txt' | 'ass'>('srt');

  if (!isOpen) return null;

  const safeFilename = (project.name || 'subtitles').replace(/[^a-zA-Z0-9_-]/g, '_');

  const handleDownloadSubtitle = (format: 'srt' | 'vtt' | 'txt' | 'ass') => {
    let content = '';
    let mime = 'text/plain';

    if (format === 'srt') {
      content = captionsToSRT(project.captions);
    } else if (format === 'vtt') {
      content = captionsToVTT(project.captions);
      mime = 'text/vtt';
    } else if (format === 'txt') {
      content = captionsToTXT(project.captions);
    } else if (format === 'ass') {
      content = captionsToASS(project.captions, project.style);
    }

    triggerDownload(content, `${safeFilename}.${format}`, mime);
  };

  const handleStartRender = async () => {
    setIsStartingExport(true);
    try {
      await onStartVideoExport(resolution, burnedIn);
    } catch (err) {
      console.error('Export trigger failed:', err);
    } finally {
      setIsStartingExport(false);
    }
  };

  const getPreviewContent = () => {
    if (subtitlePreviewFormat === 'srt') return captionsToSRT(project.captions).slice(0, 800);
    if (subtitlePreviewFormat === 'vtt') return captionsToVTT(project.captions).slice(0, 800);
    if (subtitlePreviewFormat === 'txt') return captionsToTXT(project.captions).slice(0, 800);
    return captionsToASS(project.captions, project.style).slice(0, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              <span>Export Subtitles & Video</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Download standard subtitle files or render full-length captioned video.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'subtitles'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Subtitle Files (SRT, VTT, TXT, ASS)</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'video'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Render Captioned Video (MP4)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Subtitle Files */}
          {activeTab === 'subtitles' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'srt',
                    title: 'SRT',
                    desc: 'Standard SubRip subtitle track',
                  },
                  {
                    id: 'vtt',
                    title: 'WebVTT',
                    desc: 'Modern web player format (.vtt)',
                  },
                  {
                    id: 'txt',
                    title: 'Plain Text',
                    desc: 'Clean transcript with timestamps',
                  },
                  {
                    id: 'ass',
                    title: 'ASS',
                    desc: 'Advanced styled subtitles (.ass)',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleDownloadSubtitle(item.id as any)}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-400">
                          {item.title}
                        </span>
                        <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                    </div>
                    <span className="mt-3 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                      Download .{item.id}
                    </span>
                  </button>
                ))}
              </div>

              {/* Subtitle Live Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">File Output Preview</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                    {(['srt', 'vtt', 'txt', 'ass'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSubtitlePreviewFormat(fmt)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold transition-colors cursor-pointer ${
                          subtitlePreviewFormat === fmt
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed select-text">
                  {getPreviewContent()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Video MP4 Export */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              {/* If an export job is currently running or completed */}
              {activeExportJob ? (
                <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Server Video Rendering Job
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ID: {activeExportJob.id}
                        </p>
                      </div>
                    </div>

                    <div>
                      {activeExportJob.status === 'completed' ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ready for Download</span>
                        </span>
                      ) : activeExportJob.status === 'failed' ? (
                        <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Export Failed</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                          <span>Rendering...</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300">
                        {activeExportJob.status === 'completed'
                          ? 'Rendering finished successfully'
                          : activeExportJob.status === 'failed'
                          ? activeExportJob.error || 'FFmpeg encoding error'
                          : 'Encoding video frames with burned-in subtitles...'}
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {activeExportJob.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${activeExportJob.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {activeExportJob.status === 'failed' && (
                      <button
                        onClick={onRetryExport}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Export</span>
                      </button>
                    )}

                    {activeExportJob.status === 'completed' && activeExportJob.outputUrl && (
                      <a
                        href={activeExportJob.outputUrl}
                        download={`captioned_${safeFilename}.mp4`}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Captioned MP4</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Resolution Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">
                      Resolution
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'original', label: 'Original Resolution', desc: 'Preserves native quality' },
                        { id: '1080p', label: '1080p Full HD', desc: '1920x1080 standard' },
                        { id: '720p', label: '720p HD', desc: '1280x720 lightweight' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setResolution(r.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            resolution === r.id
                              ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold block">{r.label}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption Mode */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">
                      Caption Delivery Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBurnedIn(true)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          burnedIn
                            ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold block">Burned-In (Hardcoded)</span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Captions permanently embedded onto video frames. Best for TikTok, Reels & social.
                        </span>
                      </button>

                      <button
                        onClick={() => setBurnedIn(false)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          !burnedIn
                            ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold block">Clean Video Track</span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Exports video file with companion subtitle track so viewer can toggle CC.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Render Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleStartRender}
                      disabled={isStartingExport}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {isStartingExport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Dispatching FFmpeg Job...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Start Video Render</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
