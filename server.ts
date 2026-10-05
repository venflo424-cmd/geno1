import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { promisify } from 'util';
import dotenv from 'dotenv';
import {
  Project,
  CaptionItem,
  ExportJob,
  CaptionStyle
} from './src/types.js';
import { CAPTION_PRESETS } from './src/utils/presets.js';
import {
  captionsToSRT,
  captionsToVTT,
  captionsToTXT,
  captionsToASS
} from './src/utils/subtitles.js';

dotenv.config();

const execAsync = promisify(exec);

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

[DATA_DIR, UPLOADS_DIR, EXPORTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploads & exports statically for video playback and downloads
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/exports', express.static(EXPORTS_DIR));
app.use('/samples', express.static(path.resolve(process.cwd(), 'public', 'samples')));

// In-memory + persistent DB store
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const EXPORT_JOBS_FILE = path.join(DATA_DIR, 'export_jobs.json');

let projects: Record<string, Project> = {};
let exportJobs: Record<string, ExportJob> = {};

function loadData() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    }
    if (fs.existsSync(EXPORT_JOBS_FILE)) {
      exportJobs = JSON.parse(fs.readFileSync(EXPORT_JOBS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    fs.writeFileSync(EXPORT_JOBS_FILE, JSON.stringify(exportJobs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

loadData();

// Configure Multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId || `proj_${Date.now()}`;
    req.body.resolvedProjectId = projectId;
    const projectDir = path.join(UPLOADS_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `original${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('This video format is not supported. Please upload MP4, MOV, WebM, AVI, or MKV.'));
    }
  },
});

// Helper to get video metadata via ffprobe
async function getVideoMetadata(filePath: string): Promise<{ duration: number; width?: number; height?: number }> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration:stream=width,height -of json "${filePath}"`
    );
    const parsed = JSON.parse(stdout);
    const duration = parseFloat(parsed.format?.duration || '0');
    const stream = parsed.streams?.find((s: any) => s.width && s.height);
    return {
      duration: isNaN(duration) ? 0 : duration,
      width: stream?.width,
      height: stream?.height,
    };
  } catch (err) {
    console.error('ffprobe error:', err);
    return { duration: 0 };
  }
}

// Helper to extract complete audio from video
async function extractAudio(videoPath: string, outputPath: string): Promise<boolean> {
  try {
    // 16kHz mono 16-bit WAV is optimal for Gemini and speech-to-text
    await execAsync(`ffmpeg -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`);
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
  } catch (err) {
    console.error('Audio extraction error:', err);
    return false;
  }
}

// Slice audio segment using ffmpeg
async function sliceAudio(inputPath: string, outputPath: string, startSec: number, durationSec: number): Promise<boolean> {
  try {
    await execAsync(`ffmpeg -y -ss ${startSec} -t ${durationSec} -i "${inputPath}" -c copy "${outputPath}"`);
    return fs.existsSync(outputPath);
  } catch (err) {
    console.error('Audio slice error:', err);
    return false;
  }
}

// Transcribe single audio chunk with Gemini
async function transcribeChunk(
  audioFilePath: string,
  startOffsetSec: number,
  chunkDurationSec: number,
  language: string,
  chunkIndex: number
): Promise<CaptionItem[]> {
  try {
    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString('base64');

    const prompt = `You are a professional video subtitle and caption generation engine.
Transcribe the speech in this audio clip completely and accurately.
Specified language: ${language === 'auto' ? 'Auto-detect spoken language' : language}.

IMPORTANT RULES:
1. Generate timestamped caption segments covering all spoken dialogue in this clip.
2. Captions must have start and end timestamps in seconds relative to the start of this audio clip (from 0.00 to ${chunkDurationSec.toFixed(2)}).
3. Keep each subtitle segment readable: 1 to 2 lines max, roughly 32 to 42 characters per line, breaking naturally at punctuation or phrase boundaries.
4. Provide word-level timestamps (word, start, end in relative seconds) for each caption segment to enable dynamic karaoke/word-highlight effects.
5. Identify speakers if multiple voices exist (e.g., "Speaker 1", "Speaker 2").
6. Provide proper punctuation and capitalization.
7. Return a JSON array matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'audio/wav',
            data: base64Audio,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER, description: 'Start time in seconds relative to this chunk (e.g. 1.25)' },
              end: { type: Type.NUMBER, description: 'End time in seconds relative to this chunk (e.g. 4.80)' },
              text: { type: Type.STRING, description: 'Subtitle text (clean sentence or phrase)' },
              speaker: { type: Type.STRING, description: 'Speaker label e.g. Speaker 1' },
              words: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                  },
                  required: ['word', 'start', 'end'],
                },
              },
            },
            required: ['start', 'end', 'text'],
          },
        },
      },
    });

    const text = response.text?.trim() || '[]';
    let parsed: any[] = [];
    try {
      let cleanText = text;
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini transcription JSON:', parseErr, 'Raw was:', text);
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    // Map relative chunk timestamps to absolute video timestamps
    return parsed.map((item: any, idx: number) => {
      const start = Math.max(0, parseFloat(item.start || '0') + startOffsetSec);
      const rawEnd = parseFloat(item.end || '0') + startOffsetSec;
      const end = rawEnd > start ? rawEnd : start + 2.5;

      const words = Array.isArray(item.words) && item.words.length > 0
        ? item.words.map((w: any) => ({
            word: String(w.word || ''),
            start: parseFloat(w.start || '0') + startOffsetSec,
            end: parseFloat(w.end || '0') + startOffsetSec,
          }))
        : (() => {
            const splitWords = String(item.text || '').trim().split(/\s+/).filter(Boolean);
            const segDur = Math.max(0.5, end - start);
            const wordDur = splitWords.length > 0 ? segDur / splitWords.length : 1;
            return splitWords.map((w, wIdx) => ({
              word: w,
              start: Number((start + wIdx * wordDur).toFixed(2)),
              end: Number((start + (wIdx + 1) * wordDur).toFixed(2)),
            }));
          })();

      return {
        id: `cap_${chunkIndex}_${idx}_${Date.now()}`,
        startTime: Number(start.toFixed(3)),
        endTime: Number(end.toFixed(3)),
        text: String(item.text || '').trim(),
        speaker: item.speaker || 'Speaker 1',
        words,
      };
    });
  } catch (err) {
    console.error(`Error transcribing chunk at offset ${startOffsetSec}:`, err);
    return [];
  }
}

// Background transcription pipeline that processes the ENTIRE video
async function processFullVideoPipeline(projectId: string, language: string) {
  const project = projects[projectId];
  if (!project) return;

  const projectDir = path.join(UPLOADS_DIR, projectId);
  const videoFile = fs.readdirSync(projectDir).find((f) => f.startsWith('original.'));
  if (!videoFile) {
    project.status = 'error';
    project.error = 'Video file not found.';
    saveData();
    return;
  }

  const videoPath = path.join(projectDir, videoFile);
  const audioPath = path.join(projectDir, 'audio.wav');

  try {
    // Step 1: Detect exact video duration & metadata
    project.status = 'uploading';
    project.progress = 10;
    project.statusMessage = 'Analyzing video metadata and duration...';
    saveData();

    const metadata = await getVideoMetadata(videoPath);
    if (!metadata.duration || metadata.duration <= 0) {
      project.status = 'error';
      project.error = 'Unable to detect video duration or unreadable video format.';
      saveData();
      return;
    }

    project.duration = Number(metadata.duration.toFixed(2));
    project.status = 'extracting_audio';
    project.progress = 20;
    project.statusMessage = `Extracting complete audio track (${Math.round(project.duration)}s)...`;
    saveData();

    // Step 2: Extract complete audio track
    const audioExtracted = await extractAudio(videoPath, audioPath);
    if (!audioExtracted) {
      project.status = 'error';
      project.error = 'No usable audio track was detected in this video.';
      saveData();
      return;
    }

    project.audioUrl = `/uploads/${projectId}/audio.wav`;

    // Step 3: Transcription across entire duration in manageable chunks
    // To guarantee the WHOLE video is transcribed, chunk every 60-90 seconds.
    const CHUNK_SIZE = 60; // 60 seconds per chunk
    const totalDuration = project.duration;
    const numChunks = Math.ceil(totalDuration / CHUNK_SIZE);

    project.status = 'transcribing';
    project.progress = 25;
    saveData();

    const allCaptions: CaptionItem[] = [];

    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * CHUNK_SIZE;
      const chunkDur = Math.min(CHUNK_SIZE, totalDuration - chunkStart);

      project.currentProcessingTime = Number(chunkStart.toFixed(1));
      const transPercent = 25 + Math.round((chunkStart / totalDuration) * 55);
      project.progress = Math.min(80, transPercent);

      const startMinSec = `${Math.floor(chunkStart / 60)}:${String(Math.floor(chunkStart % 60)).padStart(2, '0')}`;
      const totalMinSec = `${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}`;

      project.statusMessage = `Transcribing ${startMinSec} / ${totalMinSec} (Chunk ${i + 1} of ${numChunks})`;
      project.estimatedRemainingTime = Math.max(0, Math.round((numChunks - i) * 6));
      saveData();

      const chunkAudioPath = path.join(projectDir, `chunk_${i}.wav`);
      const sliced = await sliceAudio(audioPath, chunkAudioPath, chunkStart, chunkDur);

      if (sliced) {
        const chunkCaptions = await transcribeChunk(
          chunkAudioPath,
          chunkStart,
          chunkDur,
          language,
          i
        );

        allCaptions.push(...chunkCaptions);
        project.captionSegmentsCount = allCaptions.length;
        project.captions = [...allCaptions];
        saveData();

        // Cleanup temporary slice
        try {
          if (fs.existsSync(chunkAudioPath)) fs.unlinkSync(chunkAudioPath);
        } catch (_) {}
      }
    }

    // Step 4: Validate and post-process full timeline
    project.status = 'generating_captions';
    project.progress = 85;
    project.statusMessage = 'Validating chronological timeline and cleaning gaps...';
    saveData();

    // Sort captions strictly by start time
    allCaptions.sort((a, b) => a.startTime - b.startTime);

    // Auto-fix timestamps: remove negative duration, ensure minimum duration
    for (let i = 0; i < allCaptions.length; i++) {
      const cur = allCaptions[i];
      if (cur.endTime <= cur.startTime) {
        cur.endTime = Number((cur.startTime + 2.0).toFixed(3));
      }
      // If slight overlap with next caption, adjust
      if (i < allCaptions.length - 1) {
        const next = allCaptions[i + 1];
        if (cur.endTime > next.startTime) {
          cur.endTime = Number(Math.max(cur.startTime + 0.5, next.startTime - 0.05).toFixed(3));
        }
      }
    }

    // Step 5: Synchronizing & finalizing
    project.status = 'synchronizing';
    project.progress = 95;
    project.statusMessage = 'Synchronizing subtitles and preparing studio editor...';
    saveData();

    // Save initial subtitles files to project folder
    fs.writeFileSync(path.join(projectDir, 'subtitles.srt'), captionsToSRT(allCaptions), 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'subtitles.vtt'), captionsToVTT(allCaptions), 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'captions.json'), JSON.stringify(allCaptions, null, 2), 'utf-8');

    // Complete!
    project.status = 'ready';
    project.progress = 100;
    project.captions = allCaptions;
    project.captionSegmentsCount = allCaptions.length;
    project.currentProcessingTime = totalDuration;
    project.statusMessage = 'Transcript verified — complete video covered.';
    project.updatedAt = new Date().toISOString();
    saveData();
  } catch (err: any) {
    console.error('Pipeline failed:', err);
    project.status = 'error';
    project.error = err.message || 'Transcription error occurred. Your project has been preserved.';
    saveData();
  }
}

// API Routes

// 1. Get all projects (filtered by user or all)
app.get('/api/projects', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'guest';
  const userProjects = Object.values(projects)
    .filter((p) => p.userId === userId || userId === 'all')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ projects: userProjects });
});

// 2. Get single project
app.get('/api/projects/:id', (req: Request, res: Response) => {
  const project = projects[req.params.id];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

// 3. Project status polling
app.get('/api/projects/:id/status', (req: Request, res: Response) => {
  const project = projects[req.params.id];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({
    status: project.status,
    progress: project.progress,
    statusMessage: project.statusMessage,
    currentProcessingTime: project.currentProcessingTime,
    duration: project.duration,
    captionSegmentsCount: project.captionSegmentsCount,
    estimatedRemainingTime: project.estimatedRemainingTime,
    captions: project.captions,
    error: project.error,
  });
});

// 4. Upload video endpoint
app.post('/api/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const projectId = req.body.resolvedProjectId || `proj_${Date.now()}`;
    const userId = req.body.userId || 'guest';
    const language = req.body.language || 'auto';
    const projectName = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');

    const videoExt = path.extname(req.file.originalname) || '.mp4';
    const videoUrl = `/uploads/${projectId}/original${videoExt}`;

    const newProject: Project = {
      id: projectId,
      userId,
      name: projectName,
      originalFileName: req.file.originalname,
      videoUrl,
      duration: 0,
      status: 'uploading',
      progress: 5,
      currentProcessingTime: 0,
      statusMessage: 'Video received. Validating file...',
      captionSegmentsCount: 0,
      estimatedRemainingTime: 0,
      language,
      captions: [],
      style: { ...CAPTION_PRESETS.modern },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects[projectId] = newProject;
    saveData();

    // Start background processing pipeline immediately
    processFullVideoPipeline(projectId, language).catch((e) =>
      console.error('Async pipeline error:', e)
    );

    res.status(201).json({ project: newProject });
  } catch (err: any) {
    console.error('Upload route error:', err);
    res.status(500).json({ error: err.message || 'Upload processing failed' });
  }
});

// 5. Import video from URL
app.post('/api/import-url', async (req: Request, res: Response) => {
  try {
    const { url, name, language = 'auto', userId = 'guest' } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid video URL is required' });
    }

    const projectId = `proj_${Date.now()}`;
    const projectDir = path.join(UPLOADS_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const targetVideoPath = path.join(projectDir, 'original.mp4');

    // If local sample path
    if (url.startsWith('/samples/') || url.includes('/samples/')) {
      const sampleFileName = path.basename(url);
      const localSamplePath = path.resolve(process.cwd(), 'public', 'samples', sampleFileName);
      if (fs.existsSync(localSamplePath)) {
        fs.copyFileSync(localSamplePath, targetVideoPath);
      } else {
        return res.status(404).json({ error: `Sample video ${sampleFileName} not found.` });
      }
    } else {
      // Download remote video directly
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      });
      if (!response.ok || !response.body) {
        return res.status(400).json({
          error: `Could not retrieve video from URL. Status: ${response.status}. Please verify the URL or upload the video directly.`,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(targetVideoPath, Buffer.from(arrayBuffer));
    }

    let originalFileName = 'video.mp4';
    try {
      if (url.startsWith('/samples/')) {
        originalFileName = path.basename(url);
      } else {
        const parsedUrl = new URL(url, 'http://localhost');
        originalFileName = path.basename(parsedUrl.pathname) || 'video.mp4';
      }
    } catch (_) {
      originalFileName = path.basename(url) || 'video.mp4';
    }

    const newProject: Project = {
      id: projectId,
      userId,
      name: name || 'Imported Video',
      originalFileName,
      videoUrl: `/uploads/${projectId}/original.mp4`,
      duration: 0,
      status: 'uploading',
      progress: 10,
      currentProcessingTime: 0,
      statusMessage: 'Video downloaded from URL. Starting transcription pipeline...',
      captionSegmentsCount: 0,
      estimatedRemainingTime: 0,
      language,
      captions: [],
      style: { ...CAPTION_PRESETS.modern },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects[projectId] = newProject;
    saveData();

    processFullVideoPipeline(projectId, language).catch((e) =>
      console.error('URL pipeline error:', e)
    );

    res.status(201).json({ project: newProject });
  } catch (err: any) {
    console.error('URL import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import video from URL' });
  }
});

// 6. Autosave project (captions, styling, name)
app.put('/api/projects/:id', (req: Request, res: Response) => {
  const project = projects[req.params.id];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, captions, style, language } = req.body;
  if (name !== undefined) project.name = name;
  if (captions !== undefined) {
    project.captions = captions;
    project.captionSegmentsCount = captions.length;
  }
  if (style !== undefined) project.style = style;
  if (language !== undefined) project.language = language;

  project.updatedAt = new Date().toISOString();
  saveData();

  res.json({ project, saved: true });
});

// 7. Delete project
app.delete('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!projects[id]) {
    return res.status(404).json({ error: 'Project not found' });
  }

  delete projects[id];
  saveData();

  // Remove files
  try {
    const projectDir = path.join(UPLOADS_DIR, id);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Cleanup error:', e);
  }

  res.json({ success: true });
});

// 8. Duplicate project
app.post('/api/projects/:id/duplicate', (req: Request, res: Response) => {
  const original = projects[req.params.id];
  if (!original) {
    return res.status(404).json({ error: 'Original project not found' });
  }

  const newId = `proj_${Date.now()}`;
  const origDir = path.join(UPLOADS_DIR, original.id);
  const newDir = path.join(UPLOADS_DIR, newId);

  try {
    if (fs.existsSync(origDir)) {
      fs.cpSync(origDir, newDir, { recursive: true });
    }
  } catch (e) {
    console.error('Duplicate file error:', e);
  }

  const duplicated: Project = {
    ...JSON.parse(JSON.stringify(original)),
    id: newId,
    name: `${original.name} (Copy)`,
    videoUrl: original.videoUrl.replace(original.id, newId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects[newId] = duplicated;
  saveData();

  res.status(201).json({ project: duplicated });
});

// 9. AI Caption Cleanup & Improvement
app.post('/api/projects/:id/improve-captions', async (req: Request, res: Response) => {
  try {
    const project = projects[req.params.id];
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { action = 'clean_up' } = req.body;
    // Actions: 'clean_up', 'concise', 'grammar', 'remove_filler'

    const captions = project.captions || [];
    if (captions.length === 0) {
      return res.json({ captions: [] });
    }

    const actionInstructions: Record<string, string> = {
      clean_up: 'Fix punctuation, typos, obvious speech-to-text recognition errors, and sentence boundary flow.',
      concise: 'Make subtitles more concise and impactful while strictly preserving the speaker meaning.',
      grammar: 'Correct grammatical mistakes, capitalization, and punctuation.',
      remove_filler: 'Remove unnecessary verbal filler words like "um", "uh", "you know", "like", "actually", "sort of", "kind of" without losing context.',
    };

    const instruction = actionInstructions[action] || actionInstructions.clean_up;

    const prompt = `You are an expert subtitle editor. Improve the following list of subtitle items according to this goal:
"${instruction}"

IMPORTANT:
- NEVER alter the intended meaning of the speaker.
- Do NOT change the timestamps (startTime and endTime).
- Return a JSON array of objects with the exact same ids and timestamps, with improved text.
- If words array is present, adjust word timings where appropriate or preserve them.

Input captions JSON:
${JSON.stringify(captions.map((c) => ({ id: c.id, startTime: c.startTime, endTime: c.endTime, text: c.text, speaker: c.speaker })))}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let rawText = response.text?.trim() || '[]';
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const textMap = new Map(parsed.map((item: any) => [item.id, item.text]));
      project.captions = project.captions.map((c) => ({
        ...c,
        text: textMap.get(c.id) || c.text,
      }));
      project.updatedAt = new Date().toISOString();
      saveData();
    }

    res.json({ captions: project.captions });
  } catch (err: any) {
    console.error('Improve captions error:', err);
    res.status(500).json({ error: err.message || 'Failed to improve captions' });
  }
});

// 10. Auto Sync Captions
app.post('/api/projects/:id/auto-sync', (req: Request, res: Response) => {
  const project = projects[req.params.id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Standardize timing: ensure monotonic sequence, remove micro-gaps < 100ms, enforce minimum display time
  const captions = [...project.captions].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < captions.length; i++) {
    const cur = captions[i];
    // Enforce min duration based on word count
    const words = cur.text.trim().split(/\s+/).length;
    const minDur = Math.max(1.2, words * 0.28);
    if (cur.endTime - cur.startTime < minDur) {
      cur.endTime = Number((cur.startTime + minDur).toFixed(3));
    }

    if (i < captions.length - 1) {
      const next = captions[i + 1];
      // Close tiny gaps < 0.15s
      if (next.startTime > cur.endTime && next.startTime - cur.endTime < 0.15) {
        cur.endTime = next.startTime;
      } else if (cur.endTime > next.startTime) {
        cur.endTime = Number(Math.max(cur.startTime + 0.8, next.startTime - 0.05).toFixed(3));
      }
    }
  }

  project.captions = captions;
  project.updatedAt = new Date().toISOString();
  saveData();

  res.json({ captions: project.captions });
});

// 11. Subtitle files download endpoints
app.get('/api/projects/:id/export/:format', (req: Request, res: Response) => {
  const { id, format } = req.params;
  const project = projects[id];
  if (!project) return res.status(404).send('Project not found');

  const captions = project.captions || [];
  const safeTitle = (project.name || 'subtitles').replace(/[^a-zA-Z0-9_-]/g, '_');

  switch (format.toLowerCase()) {
    case 'srt':
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.srt"`);
      return res.send(captionsToSRT(captions));

    case 'vtt':
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.vtt"`);
      return res.send(captionsToVTT(captions));

    case 'txt':
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.txt"`);
      return res.send(captionsToTXT(captions));

    case 'ass':
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.ass"`);
      return res.send(captionsToASS(captions, project.style));

    default:
      return res.status(400).send('Unsupported subtitle format');
  }
});

// 12. Video Export Job queue & FFmpeg burned-in rendering
app.post('/api/projects/:id/export-video', async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { resolution = 'original', burnedIn = true } = req.body;

  const jobId = `job_${Date.now()}`;
  const projectDir = path.join(UPLOADS_DIR, id);
  const videoFile = fs.readdirSync(projectDir).find((f) => f.startsWith('original.'));

  if (!videoFile) {
    return res.status(400).json({ error: 'Source video file missing' });
  }

  const srtPath = path.join(projectDir, 'export_subtitles.srt');
  fs.writeFileSync(srtPath, captionsToSRT(project.captions), 'utf-8');

  const outputFileName = `captioned_${id}_${Date.now()}.mp4`;
  const outputFilePath = path.join(EXPORTS_DIR, outputFileName);

  const job: ExportJob = {
    id: jobId,
    projectId: id,
    format: 'mp4',
    resolution,
    burnedIn,
    status: 'queued',
    progress: 5,
    createdAt: new Date().toISOString(),
  };

  exportJobs[jobId] = job;
  saveData();

  res.status(202).json({ job });

  // Execute FFmpeg export asynchronously
  (async () => {
    try {
      job.status = 'processing';
      job.progress = 15;
      saveData();

      const inputVideo = path.join(projectDir, videoFile);

      // Construct FFmpeg command
      const vfFilters: string[] = [];

      // Burned-in subtitles filter
      if (burnedIn) {
        // Escape path for ffmpeg subtitles filter
        const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        const style = project.style || CAPTION_PRESETS.modern;
        const font = style.fontFamily === 'JetBrains Mono' ? 'DejaVu Sans Mono' : 'Arial';
        const fontSize = Math.max(16, Math.min(38, Math.round(style.fontSize * 0.9)));

        const forceStyle = `Fontname=${font},Fontsize=${fontSize},PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=35`;
        vfFilters.push(`subtitles='${escapedSrt}':force_style='${forceStyle}'`);
      }

      if (resolution === '1080p') {
        vfFilters.push('scale=-2:1080');
      } else if (resolution === '720p') {
        vfFilters.push('scale=-2:720');
      }

      const vfArg = vfFilters.length > 0 ? `-vf "${vfFilters.join(',')}"` : '';

      const ffmpegCmd = `ffmpeg -y -i "${inputVideo}" ${vfArg} -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k "${outputFilePath}"`;

      console.log('Starting FFmpeg export:', ffmpegCmd);

      const process = spawn(ffmpegCmd, { shell: true });

      process.stderr.on('data', (data) => {
        const text = data.toString();
        // Parse time=HH:MM:SS.ms to calculate percentage
        const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
        if (timeMatch && project.duration > 0) {
          const hours = parseFloat(timeMatch[1]);
          const mins = parseFloat(timeMatch[2]);
          const secs = parseFloat(timeMatch[3]);
          const currentSecs = hours * 3600 + mins * 60 + secs;
          const pct = Math.min(95, Math.round(15 + (currentSecs / project.duration) * 80));
          if (pct > job.progress) {
            job.progress = pct;
            saveData();
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFilePath)) {
          job.status = 'completed';
          job.progress = 100;
          job.outputUrl = `/exports/${outputFileName}`;
          job.completedAt = new Date().toISOString();
          saveData();
          console.log(`Export job ${jobId} finished successfully.`);
        } else {
          job.status = 'failed';
          job.error = `FFmpeg exited with error code ${code}`;
          saveData();
        }
      });
    } catch (err: any) {
      console.error('FFmpeg export error:', err);
      job.status = 'failed';
      job.error = err.message || 'Video export failed';
      saveData();
    }
  })();
});

// 13. Get Export Job status
app.get('/api/export-jobs/:id', (req: Request, res: Response) => {
  const job = exportJobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Export job not found' });
  res.json({ job });
});

// Start server and mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CaptionCraft AI Studio server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
