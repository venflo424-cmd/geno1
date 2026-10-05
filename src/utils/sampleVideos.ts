export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  url: string;
  thumbnail: string;
  language: string;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'sample_tech_keynote',
    title: 'Technology & Innovation Keynote',
    description: 'Crisp presentation dialogue on full-length AI transcription, synchronized timestamps, and custom styling.',
    duration: '00:15',
    url: '/samples/tech_keynote.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=600&auto=format&fit=crop&q=80',
    language: 'English',
  },
  {
    id: 'sample_social_short',
    title: 'Social & Reels Dynamic Short',
    description: 'Fast-paced creator clip demonstrating punchy mobile subtitles with animated word highlights.',
    duration: '00:09',
    url: '/samples/social_short.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
    language: 'English',
  },
];
