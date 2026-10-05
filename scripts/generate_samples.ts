import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();
const execAsync = promisify(exec);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SAMPLES_DIR = path.resolve(process.cwd(), 'public', 'samples');
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

async function createSample(
  filename: string,
  speechText: string,
  voiceName: string,
  bgColor: string,
  titleText: string
) {
  console.log(`Generating audio for ${filename}...`);
  const wavPath = path.join(SAMPLES_DIR, `${filename}.wav`);
  const mp4Path = path.join(SAMPLES_DIR, `${filename}.mp4`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: speechText }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) {
      console.error(`No audio generated for ${filename}`);
      return;
    }

    fs.writeFileSync(wavPath, Buffer.from(base64, 'base64'));

    // Probe duration of generated wav
    const { stdout: durOut } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`
    );
    const dur = Math.max(3, Math.ceil(parseFloat(durOut.trim()) || 5));

    console.log(`Rendering video ${mp4Path} (${dur}s)...`);
    // Create animated gradient video with title and audio track
    await execAsync(
      `ffmpeg -y -f lavfi -i "color=c=${bgColor}:s=1280x720:d=${dur}" -i "${wavPath}" -vf "drawtext=text='${titleText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='AI Video Caption Studio':fontcolor=0x38BDF8:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+40" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${mp4Path}"`
    );

    console.log(`Created sample video: ${mp4Path}`);
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  } catch (err) {
    console.error(`Failed to create sample ${filename}:`, err);
  }
}

async function main() {
  await createSample(
    'tech_keynote',
    'Welcome to CaptionCraft Studio. In this presentation, we demonstrate automated full length video transcription with synchronized timestamps, custom subtitle styling, and multi-format video exports.',
    'Kore',
    '0x0f172a',
    'Technology & Innovation Keynote'
  );

  await createSample(
    'social_short',
    'Captions drastically increase viewer retention and comprehension on TikTok and Instagram Reels. Try bold styling and animated word pop highlights.',
    'Puck',
    '0x1e1b4b',
    'Social & Reels Creator Clip'
  );

  console.log('Sample generation complete.');
}

main().catch(console.error);
