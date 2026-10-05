import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Play,
  Clock,
  Layers,
  Copy,
  Trash2,
  Download,
  MoreVertical,
  Edit2,
  FileVideo,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';
import { formatDisplayTime } from '../utils/subtitles';

interface DashboardViewProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onNewProject: () => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: (project: Project) => void;
  onRenameProject: (projectId: string, newName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onDuplicateProject,
  onDeleteProject,
  onExportProject,
  onRenameProject,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const startRename = (p: Project) => {
    setEditingId(p.id);
    setEditingName(p.name);
    setOpenMenuId(null);
  };

  const saveRename = (projectId: string) => {
    if (editingName.trim()) {
      onRenameProject(projectId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            <span>Projects Studio Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your captioned videos, export subtitles, or continue editing.
          </p>
        </div>

        <button
          onClick={onNewProject}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto hover:shadow-indigo-600/50"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="py-20 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 text-center max-w-lg mx-auto p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <FileVideo className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No video projects yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Upload a video or test with a sample to generate your first synchronized subtitle project.
          </p>
          <button
            onClick={onNewProject}
            className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
            >
              {/* Card Preview / Video Header */}
              <div
                onClick={() => onOpenProject(project.id)}
                className="relative aspect-video bg-black cursor-pointer overflow-hidden flex items-center justify-center"
              >
                <video
                  src={project.videoUrl}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  preload="metadata"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Duration Badge */}
                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatDisplayTime(project.duration)}</span>
                </span>

                {/* Status indicator */}
                <div className="absolute top-2.5 left-2.5">
                  {project.status === 'ready' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      Ready
                    </span>
                  ) : project.status === 'error' ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                      Failed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>{project.progress}%</span>
                    </span>
                  )}
                </div>

                {/* Hover Play Button */}
                <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-105 z-10">
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                </div>
              </div>

              {/* Card Meta & Title */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveRename(project.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(project.id)}
                        autoFocus
                        className="bg-slate-950 border border-indigo-500 text-white text-xs font-bold rounded px-2 py-1 focus:outline-none w-full"
                      />
                    ) : (
                      <h3
                        onClick={() => onOpenProject(project.id)}
                        className="text-sm font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer line-clamp-1"
                      >
                        {project.name}
                      </h3>
                    )}

                    {/* Context menu button */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === project.id ? null : project.id)
                        }
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                          <button
                            onClick={() => startRename(project)}
                            className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onDuplicateProject(project.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onDeleteProject(project.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata line */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Layers className="w-3 h-3" />
                      <span>{project.captionSegmentsCount || project.captions.length} captions</span>
                    </span>
                    <span>•</span>
                    <span className="capitalize">{project.language}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onExportProject(project)}
                      title="Quick Export Subtitles or Video"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenProject(project.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold cursor-pointer"
                    >
                      Open Studio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
