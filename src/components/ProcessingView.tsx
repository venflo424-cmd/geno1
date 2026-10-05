import React from 'react';
import {
  Upload,
  Music,
  Cpu,
  FileText,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Project } from '../types';
import { formatDisplayTime } from '../utils/subtitles';

interface ProcessingViewProps {
  project: Project;
  onCancel: () => void;
  onOpenEditor: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  project,
  onCancel,
  onOpenEditor,
}) => {
  const steps = [
    {
      id: 'uploading',
      title: 'Step 1 — Uploading',
      desc: 'Ingesting and validating video metadata',
      icon: Upload,
      active: project.status === 'uploading',
      done: ['extracting_audio', 'transcribing', 'generating_captions', 'synchronizing', 'ready'].includes(
        project.status
      ),
    },
    {
      id: 'extracting_audio',
      title: 'Step 2 — Extracting Audio',
      desc: 'Extracting complete 16kHz audio track',
      icon: Music,
      active: project.status === 'extracting_audio',
      done: ['transcribing', 'generating_captions', 'synchronizing', 'ready'].includes(project.status),
    },
    {
      id: 'transcribing',
      title: 'Step 3 — Transcribing',
      desc:
        project.duration > 0
          ? `Transcribing ${formatDisplayTime(project.currentProcessingTime)} / ${formatDisplayTime(project.duration)}`
          : 'Processing complete audio segments with AI speech model',
      icon: Cpu,
      active: project.status === 'transcribing',
      done: ['generating_captions', 'synchronizing', 'ready'].includes(project.status),
    },
    {
      id: 'generating_captions',
      title: 'Step 4 — Generating Captions',
      desc: 'Formatting line lengths, punctuation, and word timestamps',
      icon: FileText,
      active: project.status === 'generating_captions',
      done: ['synchronizing', 'ready'].includes(project.status),
    },
    {
      id: 'synchronizing',
      title: 'Step 5 — Synchronizing',
      desc: 'Validating chronological timeline and aligning speech boundaries',
      icon: RefreshCw,
      active: project.status === 'synchronizing',
      done: ['ready'].includes(project.status),
    },
    {
      id: 'ready',
      title: 'Step 6 — Preparing Editor',
      desc: 'Finalizing subtitle tracks and opening caption studio',
      icon: Sliders,
      active: project.status === 'ready',
      done: project.status === 'ready',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      {/* Top Banner */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span>Processing Video Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing <span className="text-slate-200 font-semibold">{project.name}</span> across its entire duration.
          </p>
        </div>

        {project.status === 'ready' && (
          <button
            onClick={onOpenEditor}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer animate-pulse"
          >
            <span>Open Caption Studio</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Processing Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-8">
        {/* Progress Bar & Status Text */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300 flex items-center gap-2">
              {project.status !== 'ready' && project.status !== 'error' && (
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              )}
              <span>{project.statusMessage || 'Processing video...'}</span>
            </span>
            <span className="font-mono text-indigo-400 text-sm">{project.progress}%</span>
          </div>

          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(4, project.progress)}%` }}
            />
          </div>
        </div>

        {/* Live Processing Metrics (Spec Section 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Video Duration</span>
            </div>
            <p className="font-mono text-sm font-bold text-white">
              {project.duration > 0 ? formatDisplayTime(project.duration) : 'Detecting...'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Timestamp</span>
            </div>
            <p className="font-mono text-sm font-bold text-indigo-400">
              {formatDisplayTime(project.currentProcessingTime)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Captions Generated</span>
            </div>
            <p className="font-mono text-sm font-bold text-emerald-400">
              {project.captionSegmentsCount} segments
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Est. Remaining</span>
            </div>
            <p className="font-mono text-sm font-bold text-slate-300">
              {project.status === 'ready'
                ? 'Complete'
                : project.estimatedRemainingTime > 0
                ? `${project.estimatedRemainingTime}s`
                : 'A few seconds'}
            </p>
          </div>
        </div>

        {/* Error notification if any */}
        {project.status === 'error' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{project.error || 'An error occurred during transcription.'}</span>
            </div>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 6 Step Progression Pipeline */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pipeline Stages
          </h3>

          <div className="space-y-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    s.done
                      ? 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                      : s.active
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-white ring-1 ring-indigo-500/20'
                      : 'bg-slate-950/20 border-slate-800/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        s.done
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : s.active
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{s.title}</p>
                      <p className="text-[11px] text-slate-400">{s.desc}</p>
                    </div>
                  </div>

                  <div>
                    {s.done ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </span>
                    ) : s.active ? (
                      <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span>In Progress</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 font-medium">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation guarantee footer (Section 41) */}
        {project.status === 'ready' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                Transcript verified — complete video covered ({formatDisplayTime(project.duration)} duration).
              </span>
            </div>
            <button
              onClick={onOpenEditor}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all hover:scale-105"
            >
              Enter Studio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
