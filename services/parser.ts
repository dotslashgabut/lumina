import { LyricLine, LyricWord } from '../types';

type LyricFormat = 'srt' | 'vtt' | 'lrc' | 'ttml' | 'unknown';

interface TimeMatch {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

const parseTimeMatch = (match: RegExpMatchArray): TimeMatch => ({
  hours: parseInt(match[1], 10),
  minutes: parseInt(match[2], 10),
  seconds: parseInt(match[3], 10),
  milliseconds: parseInt(match[4].padEnd(3, '0'), 10)
});

const timeToSeconds = (t: TimeMatch): number =>
  t.hours * 3600 + t.minutes * 60 + t.seconds + t.milliseconds / 1000;

// Helper for TTML time parsing (e.g., "00:00:10.500", "10.5s")
const parseTTMLTime = (timeStr: string): number => {
  if (!timeStr) return 0;

  const cleanStr = timeStr.replace(/[st]$/, '');
  const parts = cleanStr.split(':');

  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return h * 3600 + m * 60 + s;
  }

  if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    return m * 60 + s;
  }

  return parseFloat(cleanStr);
};

// Helper for LRC timestamp parsing [mm:ss.xx] or <mm:ss.xx>
const parseLrcTimestamp = (timestamp: string): number => {
  const clean = timestamp.replace(/[\[\]<>]/g, '');
  const parts = clean.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return 0;
};

export const parseLyrics = (content: string, format: LyricFormat): LyricLine[] => {
  const lines: LyricLine[] = [];
  const normalized = content.replace(/\r\n/g, '\n').trim();

  if (format === 'srt' || format === 'vtt') {
    const blocks = normalized.split(/\n\s*\n/);
    blocks.forEach((block, index) => {
      if (block.startsWith('WEBVTT')) return;

      const linesInBlock = block.split('\n');
      if (linesInBlock.length >= 2) {
        let timeLineIndex = 0;
        if (linesInBlock[0].match(/^\d+$/)) {
          timeLineIndex = 1;
        }

        const timeLine = linesInBlock[timeLineIndex];
        const text = linesInBlock.slice(timeLineIndex + 1).join('\n');

        const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s-->\s(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/);

        if (match && text) {
          const start = timeToSeconds(parseTimeMatch(match));
          const end = timeToSeconds({
            hours: parseInt(match[5], 10),
            minutes: parseInt(match[6], 10),
            seconds: parseInt(match[7], 10),
            milliseconds: parseInt(match[8].padEnd(3, '0'), 10)
          });

          lines.push({
            id: `lyric-${index}`,
            startTime: start,
            endTime: end,
            text: text.replace(/<[^>]*>/g, ''),
          });
        }
      }
    });
  } else if (format === 'lrc') {
    const lineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
    const wordTimeRegex = /[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]([^<\[]+)/g;

    let match;
    const rawLines: { time: number; rawText: string }[] = [];

    while ((match = lineRegex.exec(normalized)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = min * 60 + sec + ms / 1000;
      rawLines.push({ time, rawText: match[4] });
    }

    rawLines.sort((a, b) => a.time - b.time);

    rawLines.forEach((item, i) => {
      const nextItem = rawLines[i + 1];
      const lineEndTime = nextItem ? nextItem.time : item.time + 4;

      const words: LyricWord[] = [];
      let pureText = item.rawText;
      let hasEnhancedData = false;

      const wordMatches = Array.from(item.rawText.matchAll(wordTimeRegex));

      if (wordMatches.length > 0) {
        hasEnhancedData = true;
        pureText = "";

        wordMatches.forEach((wm, wIndex) => {
          const wMin = parseInt(wm[1], 10);
          const wSec = parseInt(wm[2], 10);
          const wMs = parseInt(wm[3].padEnd(3, '0'), 10);
          const startTime = wMin * 60 + wSec + wMs / 1000;
          const textContent = wm[4].trim();

          let endTime = lineEndTime;
          if (wIndex < wordMatches.length - 1) {
            const nextWm = wordMatches[wIndex + 1];
            const nwMin = parseInt(nextWm[1], 10);
            const nwSec = parseInt(nextWm[2], 10);
            const nwMs = parseInt(nextWm[3].padEnd(3, '0'), 10);
            endTime = nwMin * 60 + nwSec + nwMs / 1000;
          }

          if (textContent) {
            words.push({
              id: `word-${i}-${wIndex}`,
              text: textContent,
              startTime,
              endTime
            });
            pureText += (pureText ? " " : "") + textContent;
          }
        });
      } else {
        pureText = item.rawText.trim();
      }

      lines.push({
        id: `lyric-${i}`,
        startTime: item.time,
        endTime: lineEndTime,
        text: pureText,
        words: hasEnhancedData ? words : undefined
      });
    });

  } else if (format === 'ttml') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(normalized, "text/xml");
      const paragraphs = Array.from(xmlDoc.getElementsByTagName("p"));

      paragraphs.forEach((p, index) => {
        const begin = p.getAttribute("begin");
        const end = p.getAttribute("end");
        const dur = p.getAttribute("dur");
        const text = p.textContent?.trim();

        if (begin && text) {
          const startTime = parseTTMLTime(begin);
          let endTime = 0;

          if (end) {
            endTime = parseTTMLTime(end);
          } else if (dur) {
            endTime = startTime + parseTTMLTime(dur);
          } else {
            endTime = startTime + 4;
          }

          lines.push({
            id: `lyric-${index}`,
            startTime,
            endTime,
            text: text.replace(/\s+/g, ' ')
          });
        }
      });
    } catch (e) {
      console.error("Error parsing TTML/XML:", e);
    }
  }

  return lines;
};

export const detectFormat = (filename: string, content?: string): LyricFormat => {
  const lower = filename.toLowerCase();
  let format: LyricFormat = 'unknown';

  if (lower.endsWith('.srt')) format = 'srt';
  else if (lower.endsWith('.vtt')) format = 'vtt';
  else if (lower.endsWith('.lrc')) format = 'lrc';
  else if (lower.endsWith('.ttml') || lower.endsWith('.xml')) format = 'ttml';
  else if (content) {
    if (content.includes('-->')) format = 'srt'; // VTT and SRT both use --> and share the same parser logic here
    else if (/\[\d{2}:\d{2}\.\d{2,3}\]/.test(content)) format = 'lrc';
    else if (content.includes('<p begin=')) format = 'ttml';
  }

  return format;
};