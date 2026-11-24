import guoliang from './gen-1-guoliang.mp3?url';
import shuxian from './gen-1-shuxian.mp3?url';
import catalog from './catalog.json';

type ChapterRecording = { url: string; verseStarts: number[] };
export const recordedBibleChapters: Partial<Record<string, Record<'guoliang' | 'shuxian', ChapterRecording>>> = {
  'gen-1': {
    guoliang: {
      url: guoliang,
      verseStarts: [0, 4.128, 9.864, 12.912, 16.104, 22.704, 27.408, 33.936, 38.784, 44.928, 50.28, 59.208, 68.64, 71.736, 78.264, 83.064, 89.04, 92.592, 96.672, 99.72, 106.464, 115.728, 122.784, 125.784, 134.016, 143.016, 153.936, 158.88, 169.032, 177.744, 186.288]
    },
    shuxian: {
      url: shuxian,
      verseStarts: [0, 4.296, 9.576, 12.624, 15.552, 21.24, 26.112, 33, 37.68, 43.992, 49.416, 58.08, 67.128, 70.272, 76.848, 81.6, 86.976, 90.648, 94.392, 97.608, 103.944, 113.328, 120.768, 123.672, 132.096, 140.376, 151.728, 157.368, 167.688, 175.848, 184.416]
    }
  }
};

const mediaBase = import.meta.env.BASE_URL.replace(/\/$/, '') + '/data/bible/heygen/';
for (const [chapter, { guoliang: male, shuxian: female }] of Object.entries(catalog)) {
  recordedBibleChapters[chapter] = {
    guoliang: { url: mediaBase + male.file, verseStarts: male.verseStarts },
    shuxian: { url: mediaBase + female.file, verseStarts: female.verseStarts }
  };
}
