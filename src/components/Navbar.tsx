import React from 'react';
import { Subtitles, Plus, FolderKanban, Check, Sparkles, User, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentView: 'landing' | 'dashboard' | 'editor';
  onNavigate: (view: 'landing' | 'dashboard') => void;
  onNewProject: () => void;
  projectName?: string;
  onRenameProject?: (newName: string) => void;
  isSaving?: boolean;
  user: UserProfile;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onNewProject,
  projectName,
  onRenameProject,
  isSaving,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState(projectName || '');

  React.useEffect(() => {
    setTitleInput(projectName || '');
  }, [projectName]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && onRenameProject) {
      onRenameProject(titleInput.trim());
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Subtitles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-base text-slate-100 tracking-tight flex items-center gap-1.5">
              CaptionCraft <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">AI</span>
            </span>
          </div>
        </button>

        {/* Editor Project Title & Autosave status */}
        {currentView === 'editor' && projectName && (
          <div className="hidden md:flex items-center gap-3 pl-6 border-l border-slate-800">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="bg-slate-900 border border-indigo-500 text-slate-100 text-sm font-semibold rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[240px]"
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-semibold text-slate-200 hover:text-white truncate max-w-[260px] text-left hover:underline cursor-pointer"
                title="Click to rename project"
              >
                {projectName}
              </button>
            )}

            {/* Autosave Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">All changes saved</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-slate-800 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <span>My Projects</span>
        </button>

        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer hover:shadow-indigo-600/50"
        >
          <Plus className="w-4 h-4" />
          <span>New Video</span>
        </button>

        {/* User Account */}
        <div className="pl-3 border-l border-slate-800 flex items-center gap-2">
          {user.id === 'guest' ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300 hidden sm:inline-block">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
