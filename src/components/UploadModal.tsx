import React, { useState, useRef } from 'react';
import {
  Upload,
  Link2,
  FileVideo,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Film,
  Play,
  Languages,
} from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideo } from '../utils/sampleVideos';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'upload' | 'url' | 'sample';
  onStartUpload: (file: File, language: string, projectName: string) => Promise<void>;
  onStartUrlImport: (url: string, language: string, projectName: string) => Promise<void>;
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect Language (Default)' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'lg', name: 'Luganda' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'upload',
  onStartUpload,
  onStartUrlImport,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'sample'>(initialTab);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setUploadProgress(0);
      setIsSubmitting(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext) && !file.type.startsWith('video/')) {
      setErrorMessage('This video format is not supported. Please upload MP4, MOV, WebM, AVI or MKV.');
      return;
    }

    setSelectedFile(file);
    if (!projectName) {
      setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Try reading duration in client
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        setFileDuration(v.duration);
        URL.revokeObjectURL(url);
      };
      v.onerror = () => URL.revokeObjectURL(url);
      v.src = url;
    } catch (_) {}
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'upload') {
        if (!selectedFile) {
          setErrorMessage('Please select a video file.');
          setIsSubmitting(false);
          return;
        }
        await onStartUpload(selectedFile, selectedLanguage, projectName || selectedFile.name);
      } else {
        if (!videoUrl || !videoUrl.startsWith('http')) {
          setErrorMessage('Please enter a valid video URL (e.g. https://example.com/video.mp4).');
          setIsSubmitting(false);
          return;
        }
        const name = projectName || 'Imported Video';
        await onStartUrlImport(videoUrl, selectedLanguage, name);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start processing. Please try again.');
      setIsSubmitting(false);
    }
  };

  const selectSample = (sample: SampleVideo) => {
    setVideoUrl(sample.url);
    setProjectName(sample.title);
    setActiveTab('url');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-400" />
              <span>Create New Caption Project</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Full-length AI transcription with synchronized timestamps.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video File</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Paste Video URL</span>
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sample'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sample Videos</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-indigo-500/60 bg-indigo-950/20'
                    : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/40 bg-slate-950/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mkv,.avi,.mp4,.mov,.webm,.m4v"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>

                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? 'Change selected video' : 'Drag & drop your video here, or click to browse'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports MP4, MOV, WebM, AVI, MKV, M4V (up to 500 MB)
                </p>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatFileSize(selectedFile.size)}</span>
                        <span>•</span>
                        <span>{selectedFile.name.split('.').pop()?.toUpperCase()}</span>
                        {fileDuration !== null && (
                          <>
                            <span>•</span>
                            <span>{formatSecs(fileDuration)} duration</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Video URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Direct Video URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <Link2 className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Direct MP4 or WebM video stream URLs. Must be publicly accessible.
                </p>
              </div>

              {/* Quick Pick Samples in URL Tab */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Or load a sample video URL:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_VIDEOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSample(s)}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 block truncate">
                        {s.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.duration}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Sample Videos */}
          {activeTab === 'sample' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Pick a ready-made video with authentic speech dialogue to test the complete full-length transcription pipeline immediately:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_VIDEOS.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSample(s)}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-950 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-slate-900">
                      <img
                        src={s.thumbnail}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white">
                        {s.duration}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 line-clamp-1">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {s.description}
                    </span>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-indigo-400 flex items-center justify-between">
                      <span>Use this video</span>
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                placeholder="e.g. Product Demo Captions"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                <span>Audio Language</span>
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !videoUrl)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed hover:shadow-indigo-600/50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Captions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
