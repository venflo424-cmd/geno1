export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionItem {
  id: string;
  startTime: number; // in seconds, e.g. 3.250
  endTime: number;   // in seconds, e.g. 6.800
  text: string;
  speaker?: string;  // e.g. "Speaker 1"
  words?: CaptionWord[];
}

export type FontFamily = 'Plus Jakarta Sans' | 'Inter' | 'Impact' | 'JetBrains Mono' | 'Georgia';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export type BackgroundType = 'none' | 'box' | 'rounded' | 'semi-transparent';
export type CaptionPosition = 'bottom' | 'top' | 'center' | 'custom';
export type TextAlign = 'left' | 'center' | 'right';
export type TextEffect = 'none' | 'outline' | 'shadow' | 'glow';

export interface CaptionStyle {
  presetName?: string;
  fontFamily: FontFamily;
  fontSize: number;          // e.g. 28px
  fontWeight: FontWeight;
  textColor: string;          // hex, e.g. #FFFFFF
  textTransform: 'none' | 'uppercase';
  isItalic: boolean;
  backgroundType: BackgroundType;
  backgroundColor: string;    // hex
  backgroundOpacity: number;  // 0 to 1
  position: CaptionPosition;
  verticalPercent: number;    // 0% (top) to 100% (bottom), default 85%
  align: TextAlign;
  effect: TextEffect;
  outlineColor: string;       // hex, e.g. #000000
  wordHighlight: boolean;     // animated word highlight as spoken
  highlightColor: string;     // e.g. #FACC15 (amber yellow)
}

export type ProjectStatus =
  | 'uploading'
  | 'extracting_audio'
  | 'transcribing'
  | 'generating_captions'
  | 'synchronizing'
  | 'ready'
  | 'error';

export interface Project {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  videoUrl: string;
  audioUrl?: string;
  duration: number; // in seconds
  status: ProjectStatus;
  progress: number; // 0 to 100
  currentProcessingTime: number; // seconds processed so far
  statusMessage: string;
  captionSegmentsCount: number;
  estimatedRemainingTime: number; // in seconds
  language: string;
  captions: CaptionItem[];
  style: CaptionStyle;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface ExportJob {
  id: string;
  projectId: string;
  format: 'mp4' | 'srt' | 'vtt' | 'txt' | 'ass';
  resolution: 'original' | '1080p' | '720p';
  burnedIn: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
