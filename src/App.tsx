import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Undo,
  Redo,
  Save,
  Download,
  Sliders,
  Keyboard,
  Sparkles,
  ArrowLeft,
  FileText,
  Palette,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';
import {
  Project,
  CaptionItem,
  CaptionStyle,
  ExportJob,
  UserProfile,
} from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ProcessingView } from './components/ProcessingView';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { CaptionListPanel } from './components/CaptionListPanel';
import { StylePanel } from './components/StylePanel';
import { UploadModal } from './components/UploadModal';
import { ExportModal } from './components/ExportModal';
import { AuthModal } from './components/AuthModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { DEFAULT_STYLE } from './utils/presets';
import { SampleVideo } from './utils/sampleVideos';

export default function App() {
  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('captioncraft_user');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      id: 'guest',
      name: 'Guest Creator',
      email: 'guest@captioncraft.ai',
      createdAt: new Date().toISOString(),
    };
  });

  // Navigation View
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'processing' | 'editor'>('landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Recovery Prompt state
  const [recoveredProjectId, setRecoveredProjectId] = useState<string | null>(null);

  // Editor State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'captions' | 'style'>('captions');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<CaptionItem[][]>([]);
  const [redoStack, setRedoStack] = useState<CaptionItem[][]>([]);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'upload' | 'url' | 'sample'>('upload');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [activeExportJob, setActiveExportJob] = useState<ExportJob | null>(null);

  // Save user changes to localStorage
  useEffect(() => {
    localStorage.setItem('captioncraft_user', JSON.stringify(user));
  }, [user]);

  // Fetch Projects list from backend
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, [user.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Check last active project for crash recovery (Spec Section 31)
  useEffect(() => {
    try {
      const lastId = localStorage.getItem('captioncraft_last_project_id');
      if (lastId && currentView === 'landing' && !currentProjectId) {
        setRecoveredProjectId(lastId);
      }
    } catch (_) {}
  }, [currentView, currentProjectId]);

  // Load single project
  const loadProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      const proj: Project = data.project;

      setActiveProject(proj);
      setCurrentProjectId(proj.id);
      setDuration(proj.duration || 0);
      setCurrentTime(0);
      setIsPlaying(false);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedCaptionId(proj.captions?.[0]?.id || null);
      localStorage.setItem('captioncraft_last_project_id', proj.id);

      if (proj.status === 'ready') {
        setCurrentView('editor');
      } else {
        setCurrentView('processing');
      }
    } catch (err) {
      console.error('Load project error:', err);
    }
  };

  // Real-time polling for background processing status (Spec Section 6 & 7)
  useEffect(() => {
    if (!currentProjectId || (currentView !== 'processing' && activeProject?.status === 'ready')) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${currentProjectId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setActiveProject((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            progress: data.progress,
            statusMessage: data.statusMessage,
            currentProcessingTime: data.currentProcessingTime,
            duration: data.duration,
            captionSegmentsCount: data.captionSegmentsCount,
            estimatedRemainingTime: data.estimatedRemainingTime,
            captions: data.captions && data.captions.length > 0 ? data.captions : prev.captions,
            error: data.error,
          };
        });

        if (data.duration && data.duration > 0) {
          setDuration(data.duration);
        }

        if (data.status === 'ready') {
          clearInterval(interval);
          fetchProjects();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [currentProjectId, currentView, activeProject?.status, fetchProjects]);

  // Real-time polling for active Export Job (Spec Section 27 & 28)
  useEffect(() => {
    if (!activeExportJob || ['completed', 'failed'].includes(activeExportJob.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/export-jobs/${activeExportJob.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setActiveExportJob(data.job);
      } catch (err) {
        console.error('Export job polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeExportJob]);

  // Autosave captions and styles with debounce (Spec Section 30)
  const saveTimeoutRef = useRef<any>(null);

  const triggerAutosave = useCallback(
    (updatedCaptions?: CaptionItem[], updatedStyle?: CaptionStyle, updatedName?: string) => {
      if (!currentProjectId || !activeProject) return;

      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/projects/${currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              captions: updatedCaptions || activeProject.captions,
              style: updatedStyle || activeProject.style,
              name: updatedName || activeProject.name,
            }),
          });
        } catch (err) {
          console.error('Autosave error:', err);
        } finally {
          setIsSaving(false);
        }
      }, 800);
    },
    [currentProjectId, activeProject]
  );

  // Push to Undo stack before state change
  const pushUndo = (prevCaptions: CaptionItem[]) => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(prevCaptions))]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !activeProject) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(activeProject.captions))]);
    setUndoStack((prev) => prev.slice(0, -1));

    setActiveProject((prev) => (prev ? { ...prev, captions: previous } : null));
    triggerAutosave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !activeProject) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(activeProject.captions))]);
    setRedoStack((prev) => prev.slice(0, -1));

    setActiveProject((prev) => (prev ? { ...prev, captions: next } : null));
    triggerAutosave(next);
  };

  // Caption CRUD operations
  const updateCaptionText = (id: string, text: string) => {
    if (!activeProject) return;
    pushUndo(activeProject.captions);

    const updated = activeProject.captions.map((c) => (c.id === id ? { ...c, text } : c));
    setActiveProject({ ...activeProject, captions: updated });
    triggerAutosave(updated);
  };

  const updateCaptionSpeaker = (id: string, speaker: string) => {
    if (!activeProject) return;
    pushUndo(activeProject.captions);

    const updated = activeProject.captions.map((c) => (c.id === id ? { ...c, speaker } : c));
    setActiveProject({ ...activeProject, captions: updated });
    triggerAutosave(updated);
  };

  const updateCaptionTime = (id: string, newStart: number, newEnd: number) => {
    if (!activeProject) return;
    pushUndo(activeProject.captions);

    const updated = activeProject.captions.map((c) =>
      c.id === id ? { ...c, startTime: newStart, endTime: newEnd } : c
    );
    setActiveProject({ ...activeProject, captions: updated });
    triggerAutosave(updated);
  };

  const deleteCaption = (id: string) => {
    if (!activeProject) return;
    pushUndo(activeProject.captions);

    const updated = activeProject.captions.filter((c) => c.id !== id);
    setActiveProject({ ...activeProject, captions: updated });
    if (selectedCaptionId === id) {
      setSelectedCaptionId(updated[0]?.id || null);
    }
    triggerAutosave(updated);
  };

  const duplicateCaption = (id: string) => {
    if (!activeProject) return;
    const target = activeProject.captions.find((c) => c.id === id);
    if (!target) return;
    pushUndo(activeProject.captions);

    const copyDur = target.endTime - target.startTime;
    const newCap: CaptionItem = {
      ...target,
      id: `cap_dup_${Date.now()}`,
      startTime: Number(target.endTime.toFixed(2)),
      endTime: Number((target.endTime + copyDur).toFixed(2)),
      text: `${target.text} (copy)`,
    };

    const updated = [...activeProject.captions, newCap].sort((a, b) => a.startTime - b.startTime);
    setActiveProject({ ...activeProject, captions: updated });
    setSelectedCaptionId(newCap.id);
    triggerAutosave(updated);
  };

  // Split caption (Spec Section 23)
  const splitCaption = (id: string) => {
    if (!activeProject) return;
    const target = activeProject.captions.find((c) => c.id === id);
    if (!target) return;

    pushUndo(activeProject.captions);

    // Split at either currentTime or midpoint
    const splitTime =
      currentTime > target.startTime + 0.3 && currentTime < target.endTime - 0.3
        ? currentTime
        : target.startTime + (target.endTime - target.startTime) / 2;

    const words = target.text.trim().split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const firstText = words.slice(0, midWord).join(' ');
    const secondText = words.slice(midWord).join(' ') || firstText;

    const cap1: CaptionItem = {
      ...target,
      endTime: Number(splitTime.toFixed(2)),
      text: firstText,
    };

    const cap2: CaptionItem = {
      ...target,
      id: `cap_split_${Date.now()}`,
      startTime: Number((splitTime + 0.05).toFixed(2)),
      text: secondText,
    };

    const updated = activeProject.captions
      .map((c) => (c.id === id ? cap1 : c))
      .concat(cap2)
      .sort((a, b) => a.startTime - b.startTime);

    setActiveProject({ ...activeProject, captions: updated });
    setSelectedCaptionId(cap2.id);
    triggerAutosave(updated);
  };

  // Merge caption with next (Spec Section 23)
  const mergeWithNext = (id: string) => {
    if (!activeProject) return;
    const index = activeProject.captions.findIndex((c) => c.id === id);
    if (index === -1 || index >= activeProject.captions.length - 1) return;

    pushUndo(activeProject.captions);

    const cur = activeProject.captions[index];
    const next = activeProject.captions[index + 1];

    const merged: CaptionItem = {
      ...cur,
      endTime: next.endTime,
      text: `${cur.text.trim()} ${next.text.trim()}`,
      words: [...(cur.words || []), ...(next.words || [])],
    };

    const updated = activeProject.captions
      .filter((_, i) => i !== index + 1)
      .map((c) => (c.id === id ? merged : c));

    setActiveProject({ ...activeProject, captions: updated });
    triggerAutosave(updated);
  };

  // Add caption manually (Spec Section 22)
  const addCaptionAtCurrentTime = () => {
    if (!activeProject) return;
    pushUndo(activeProject.captions);

    const start = Number(currentTime.toFixed(2));
    const end = Number((currentTime + 3.0).toFixed(2));

    const newCap: CaptionItem = {
      id: `cap_man_${Date.now()}`,
      startTime: start,
      endTime: end,
      text: 'New subtitle text',
      speaker: 'Speaker 1',
    };

    const updated = [...activeProject.captions, newCap].sort((a, b) => a.startTime - b.startTime);
    setActiveProject({ ...activeProject, captions: updated });
    setSelectedCaptionId(newCap.id);
    triggerAutosave(updated);
  };

  // Style change
  const handleChangeStyle = (newStyle: CaptionStyle) => {
    if (!activeProject) return;
    setActiveProject({ ...activeProject, style: newStyle });
    triggerAutosave(undefined, newStyle);
  };

  // Rename project
  const handleRenameProject = async (projectId: string, newName: string) => {
    if (activeProject && activeProject.id === projectId) {
      setActiveProject({ ...activeProject, name: newName });
      triggerAutosave(undefined, undefined, newName);
    } else {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      fetchProjects();
    }
  };

  // AI improve captions (Spec Section 15)
  const handleImproveCaptions = async (
    action: 'clean_up' | 'concise' | 'grammar' | 'remove_filler'
  ) => {
    if (!activeProject) return;
    setIsAiProcessing(true);
    pushUndo(activeProject.captions);

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/improve-captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProject({ ...activeProject, captions: data.captions });
      }
    } catch (err) {
      console.error('Improve captions failed:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Auto-sync captions (Spec Section 24)
  const handleAutoSync = async () => {
    if (!activeProject) return;
    setIsAiProcessing(true);
    pushUndo(activeProject.captions);

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/auto-sync`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProject({ ...activeProject, captions: data.captions });
      }
    } catch (err) {
      console.error('Auto sync failed:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Start Video Upload handler
  const handleStartUpload = async (file: File, language: string, projectName: string) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('language', language);
    formData.append('name', projectName);
    formData.append('userId', user.id);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    setIsUploadModalOpen(false);
    loadProject(data.project.id);
  };

  // Start URL Import handler
  const handleStartUrlImport = async (url: string, language: string, projectName: string) => {
    const res = await fetch('/api/import-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        language,
        name: projectName,
        userId: user.id,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'URL import failed');
    }

    const data = await res.json();
    setIsUploadModalOpen(false);
    loadProject(data.project.id);
  };

  // Quick Start Sample handler from Landing Page
  const handleSelectSample = (sample: SampleVideo) => {
    handleStartUrlImport(sample.url, 'auto', sample.title).catch((e) =>
      console.error('Sample start failed:', e)
    );
  };

  // Start Video Export job (Spec Section 25 & 27)
  const handleStartVideoExport = async (
    resolution: 'original' | '1080p' | '720p',
    burnedIn: boolean
  ) => {
    if (!activeProject) throw new Error('No active project');

    const res = await fetch(`/api/projects/${activeProject.id}/export-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, burnedIn }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Export initiation failed');
    }

    const data = await res.json();
    setActiveExportJob(data.job);
    return data.job;
  };

  // Keyboard Shortcuts Listener (Spec Section 40)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      // Global Space to Play/Pause (when not typing in an input/textarea)
      if (e.code === 'Space' && !isInput && currentView === 'editor') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }

      // Arrows to scrub
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isInput && currentView === 'editor') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        if (e.key === 'ArrowLeft') {
          setCurrentTime((t) => Math.max(0, t - delta));
        } else {
          setCurrentTime((t) => Math.min(duration, t + delta));
        }
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }

      // Save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerAutosave();
      }

      // 'S' key to split selected caption at current time
      if (e.key.toLowerCase() === 's' && !isInput && !e.metaKey && !e.ctrlKey && selectedCaptionId) {
        splitCaption(selectedCaptionId);
      }

      // 'M' key to merge selected caption with next
      if (e.key.toLowerCase() === 'm' && !isInput && !e.metaKey && !e.ctrlKey && selectedCaptionId) {
        mergeWithNext(selectedCaptionId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Active caption lookup for live video display
  const activeCaption =
    activeProject?.captions?.find((c) => currentTime >= c.startTime && currentTime <= c.endTime) ||
    null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Studio Navigation Bar */}
      <Navbar
        currentView={currentView === 'editor' ? 'editor' : currentView === 'dashboard' ? 'dashboard' : 'landing'}
        onNavigate={(view) => {
          if (view === 'dashboard') {
            fetchProjects();
            setCurrentView('dashboard');
          } else {
            setCurrentView('landing');
          }
        }}
        onNewProject={() => {
          setUploadInitialTab('upload');
          setIsUploadModalOpen(true);
        }}
        projectName={activeProject?.name}
        onRenameProject={(newName) => {
          if (activeProject) handleRenameProject(activeProject.id, newName);
        }}
        isSaving={isSaving}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          setUser({
            id: 'guest',
            name: 'Guest Creator',
            email: 'guest@captioncraft.ai',
            createdAt: new Date().toISOString(),
          });
        }}
      />

      {/* Recovery Banner (Spec Section 31) */}
      {recoveredProjectId && currentView === 'landing' && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>You have an unfinished session from earlier.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRecoveredProjectId(null);
                loadProject(recoveredProjectId);
              }}
              className="font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Continue editing?
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('captioncraft_last_project_id');
                setRecoveredProjectId(null);
              }}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: LANDING PAGE */}
      {currentView === 'landing' && (
        <LandingPage
          onOpenUpload={(tab) => {
            setUploadInitialTab(tab || 'upload');
            setIsUploadModalOpen(true);
          }}
          onSelectSample={handleSelectSample}
          onViewProjects={() => {
            fetchProjects();
            setCurrentView('dashboard');
          }}
        />
      )}

      {/* VIEW 2: DASHBOARD */}
      {currentView === 'dashboard' && (
        <DashboardView
          projects={projects}
          onOpenProject={(id) => loadProject(id)}
          onNewProject={() => {
            setUploadInitialTab('upload');
            setIsUploadModalOpen(true);
          }}
          onDuplicateProject={async (id) => {
            await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
            fetchProjects();
          }}
          onDeleteProject={async (id) => {
            await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            fetchProjects();
          }}
          onExportProject={(p) => {
            setActiveProject(p);
            setIsExportModalOpen(true);
          }}
          onRenameProject={handleRenameProject}
        />
      )}

      {/* VIEW 3: PROCESSING PIPELINE SCREEN (Spec Section 6 & 7) */}
      {currentView === 'processing' && activeProject && (
        <ProcessingView
          project={activeProject}
          onCancel={() => {
            fetchProjects();
            setCurrentView('dashboard');
          }}
          onOpenEditor={() => setCurrentView('editor')}
        />
      )}

      {/* VIEW 4: CAPTION STUDIO EDITOR (Spec Section 10-24) */}
      {currentView === 'editor' && activeProject && (
        <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
          {/* Top Sub-Bar Controls */}
          <div className="h-11 border-b border-slate-800 bg-slate-900/50 px-4 flex items-center justify-between shrink-0">
            {/* Left: Back & Project Stats */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchProjects();
                  setCurrentView('dashboard');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </button>

              <div className="h-3.5 w-px bg-slate-800" />

              <span className="text-xs text-slate-400">
                {activeProject.captions.length} captions · {activeProject.language}
              </span>
            </div>

            {/* Center: Undo / Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <Undo className="w-4 h-4" />
              </button>

              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <Redo className="w-4 h-4" />
              </button>

              <div className="h-3.5 w-px bg-slate-800 mx-1" />

              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                title="Keyboard Shortcuts"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Export & Panel Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-indigo-600/50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Main Studio Workspace: Left Video Canvas, Right Panels */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT / CENTER: Video Player Canvas */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
              <div className="flex-1 relative flex items-center justify-center">
                <VideoPlayer
                  videoUrl={activeProject.videoUrl}
                  captions={activeProject.captions}
                  style={activeProject.style || DEFAULT_STYLE}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onPlayPause={() => setIsPlaying((p) => !p)}
                  onSeek={(t) => setCurrentTime(t)}
                  activeCaption={activeCaption}
                  onSelectCaption={(c) => {
                    setSelectedCaptionId(c.id);
                    setEditorTab('captions');
                  }}
                />
              </div>

              {/* BOTTOM: Horizontal Timeline Scrubber (Spec Section 12) */}
              <Timeline
                duration={duration}
                currentTime={currentTime}
                captions={activeProject.captions}
                selectedCaptionId={selectedCaptionId}
                onSeek={(t) => setCurrentTime(t)}
                onSelectCaption={(id) => {
                  setSelectedCaptionId(id);
                  setEditorTab('captions');
                }}
                onUpdateCaptionTime={updateCaptionTime}
                onSplitCaptionAtCurrentTime={() => {
                  if (selectedCaptionId) splitCaption(selectedCaptionId);
                }}
                onAddCaptionAtCurrentTime={addCaptionAtCurrentTime}
              />
            </div>

            {/* RIGHT: Tabbed Inspector Panel (Captions / Styling) */}
            <div className="w-80 lg:w-96 flex flex-col border-l border-slate-800 bg-slate-900 shrink-0">
              {/* Tabs */}
              <div className="h-10 border-b border-slate-800 flex items-center bg-slate-950/60 px-2 shrink-0">
                <button
                  onClick={() => setEditorTab('captions')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    editorTab === 'captions'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Captions</span>
                </button>

                <button
                  onClick={() => setEditorTab('style')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    editorTab === 'style'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Design & Styles</span>
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {editorTab === 'captions' ? (
                  <CaptionListPanel
                    captions={activeProject.captions}
                    selectedCaptionId={selectedCaptionId}
                    currentTime={currentTime}
                    onSelectCaption={setSelectedCaptionId}
                    onSeek={(t) => setCurrentTime(t)}
                    onUpdateCaptionText={updateCaptionText}
                    onUpdateCaptionSpeaker={updateCaptionSpeaker}
                    onUpdateCaptionTimestamps={updateCaptionTime}
                    onSplitCaption={splitCaption}
                    onMergeWithNext={mergeWithNext}
                    onDuplicateCaption={duplicateCaption}
                    onDeleteCaption={deleteCaption}
                    onAddCaption={addCaptionAtCurrentTime}
                    onImproveCaptions={handleImproveCaptions}
                    onAutoSync={handleAutoSync}
                    isAiProcessing={isAiProcessing}
                  />
                ) : (
                  <StylePanel
                    style={activeProject.style || DEFAULT_STYLE}
                    onChangeStyle={handleChangeStyle}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        initialTab={uploadInitialTab}
        onStartUpload={handleStartUpload}
        onStartUrlImport={handleStartUrlImport}
      />

      {activeProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={activeProject}
          onStartVideoExport={handleStartVideoExport}
          activeExportJob={activeExportJob}
          onRetryExport={() => {
            if (activeExportJob) {
              handleStartVideoExport(activeExportJob.resolution, activeExportJob.burnedIn);
            }
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={(loggedInUser) => setUser(loggedInUser)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
