#!/usr/bin/env node
// Transcribe client feedback videos and extract structured action items.
//
// Pipeline (per video):
//   1. ffmpeg → compressed mono mp3 (fits under Whisper's 25 MB upload limit).
//   2. OpenAI Whisper (whisper-1) → verbose_json transcript with segment timestamps.
//   3. Anthropic Claude → structured JSON action items + a written summary.
//   4. Markdown report written to feedback/<name>.md, plus a combined feedback/SUMMARY.md.
//
// Idempotent. By default, transcripts and reports are cached on disk and skipped on rerun.
// Pass --force to re-run both stages. Pass --force-extract to re-run only the LLM stage.
//
// Usage:
//   node scripts/transcribe-feedback.mjs                          # all client_feedback_*.mp4 in repo root
//   node scripts/transcribe-feedback.mjs path/to/video.mp4 ...    # explicit files
//   node scripts/transcribe-feedback.mjs --force                  # re-transcribe and re-extract
//
// Required env (in .env.local):
//   OPENAI_API_KEY      — for Whisper transcription
//   ANTHROPIC_API_KEY   — for action-item extraction (Claude Sonnet 4.6)

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, openAsBlob } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const feedbackDir = path.join(projectRoot, 'feedback');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.join(projectRoot, file);
    if (!existsSync(fullPath)) continue;
    const raw = readFileSync(fullPath, 'utf8');
    for (const rawLine of raw.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env.local (needed for Whisper).');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local (needed for action-item extraction).');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const forceExtract = force || args.includes('--force-extract');
const explicitFiles = args.filter((a) => !a.startsWith('--'));

const videos = explicitFiles.length
  ? explicitFiles.map((p) => path.resolve(p))
  : readdirSync(projectRoot)
      .filter((f) => /^client_feedback_.*\.mp4$/i.test(f))
      .map((f) => path.join(projectRoot, f));

if (!videos.length) {
  console.error('No videos found. Pass file paths, or place client_feedback_*.mp4 in the repo root.');
  process.exit(1);
}

mkdirSync(feedbackDir, { recursive: true });

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    // 16 kHz mono mp3 @ 64 kbps — Whisper-friendly and ~30 MB per hour, well under 25 MB
    // for the typical short feedback clip. If a very long video pushes over the limit,
    // bump -b:a down to 32k or chunk the audio before re-running.
    const proc = spawn('ffmpeg', [
      '-y', '-i', input,
      '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k',
      output,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('error', reject);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
}

async function whisperTranscribe(audioPath) {
  const blob = await openAsBlob(audioPath, { type: 'audio/mpeg' });
  const form = new FormData();
  form.append('file', blob, path.basename(audioPath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Whisper API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function fmtTimestamp(seconds) {
  const s = Math.floor(seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildTimestampedTranscript(transcript) {
  if (!transcript.segments?.length) return transcript.text ?? '';
  return transcript.segments
    .map((seg) => `[${fmtTimestamp(seg.start)}] ${seg.text.trim()}`)
    .join('\n');
}

const EXTRACTION_PROMPT = `You are reviewing transcribed client feedback for a website project called Watch Alley (a luxury watch consignment / marketplace built with Vite + Supabase). The client is recording themselves walking through the site and giving notes.

You will be given a transcript with [MM:SS] timestamps. Produce a structured JSON object with this exact shape — no prose, no markdown fences, just JSON:

{
  "summary": "2-4 sentence overview of what the client covered in this video.",
  "sentiment": "positive" | "mixed" | "critical",
  "action_items": [
    {
      "title": "Short imperative title (e.g. 'Increase hero image contrast').",
      "description": "1-3 sentences explaining what the client wants and why.",
      "area": "homepage" | "watch-detail" | "admin" | "journal" | "inquiry-flow" | "navigation" | "performance" | "copy" | "design-system" | "other",
      "priority": "high" | "medium" | "low",
      "timestamp": "MM:SS of the moment in the transcript where this was raised",
      "verbatim_quote": "The client's own words, lightly cleaned up."
    }
  ],
  "open_questions": [
    "Any ambiguity that needs clarification from the client before implementing."
  ]
}

Rules:
- Only include action_items that are concrete enough to implement. Skip vague compliments.
- Prefer high priority for anything the client repeats or sounds frustrated about.
- If the transcript is empty or contains no actionable feedback, return an empty action_items array — do not invent items.
- Output JSON only. No prefix, no suffix, no code fences.`;

async function extractActionItems(timestampedTranscript, videoName) {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Video: ${videoName}\n\nTranscript:\n${timestampedTranscript}`,
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Claude returned non-JSON:\n${text}\n\nParse error: ${err.message}`);
  }
}

function renderReport(videoName, transcript, extracted) {
  const lines = [];
  lines.push(`# Client feedback — ${videoName}`);
  lines.push('');
  lines.push(`- Source: \`${videoName}\``);
  lines.push(`- Duration: ${fmtTimestamp(transcript.duration ?? 0)}`);
  lines.push(`- Sentiment: **${extracted.sentiment ?? 'unknown'}**`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(extracted.summary ?? '(no summary)');
  lines.push('');
  lines.push('## Action items');
  lines.push('');
  if (!extracted.action_items?.length) {
    lines.push('_No concrete action items extracted._');
  } else {
    for (const item of extracted.action_items) {
      lines.push(`### [${item.priority?.toUpperCase() ?? '—'}] ${item.title}`);
      lines.push('');
      lines.push(`- **Area:** ${item.area ?? '—'}`);
      lines.push(`- **Timestamp:** \`${item.timestamp ?? '—'}\``);
      if (item.verbatim_quote) lines.push(`- **Client said:** "${item.verbatim_quote}"`);
      lines.push('');
      lines.push(item.description ?? '');
      lines.push('');
    }
  }
  if (extracted.open_questions?.length) {
    lines.push('## Open questions');
    lines.push('');
    for (const q of extracted.open_questions) lines.push(`- ${q}`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## Full transcript');
  lines.push('');
  lines.push('```');
  lines.push(buildTimestampedTranscript(transcript));
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function renderSummary(allResults) {
  const lines = [];
  lines.push('# Client feedback — combined action list');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from ${allResults.length} video(s).`);
  lines.push('');

  const flat = [];
  for (const r of allResults) {
    for (const item of r.extracted.action_items ?? []) {
      flat.push({ ...item, source: r.videoName });
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  flat.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));

  if (!flat.length) {
    lines.push('_No action items extracted across any video._');
    return lines.join('\n');
  }

  lines.push('| Priority | Area | Title | Source | Timestamp |');
  lines.push('|---|---|---|---|---|');
  for (const item of flat) {
    const title = (item.title ?? '').replace(/\|/g, '\\|');
    lines.push(`| ${item.priority ?? '—'} | ${item.area ?? '—'} | ${title} | \`${item.source}\` | \`${item.timestamp ?? '—'}\` |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function processVideo(videoPath) {
  const videoName = path.basename(videoPath);
  const stem = videoName.replace(/\.[^.]+$/, '');
  const transcriptPath = path.join(feedbackDir, `${stem}.transcript.json`);
  const reportPath = path.join(feedbackDir, `${stem}.md`);

  let transcript;
  if (existsSync(transcriptPath) && !force) {
    console.log(`• ${videoName}: using cached transcript (${path.relative(projectRoot, transcriptPath)})`);
    transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'));
  } else {
    const sizeMb = (statSync(videoPath).size / (1024 * 1024)).toFixed(1);
    console.log(`• ${videoName}: extracting audio (source ${sizeMb} MB) …`);
    const audioPath = path.join(os.tmpdir(), `${stem}.${process.pid}.mp3`);
    try {
      await runFfmpeg(videoPath, audioPath);
      const audioMb = (statSync(audioPath).size / (1024 * 1024)).toFixed(1);
      console.log(`• ${videoName}: transcribing via Whisper (audio ${audioMb} MB) …`);
      transcript = await whisperTranscribe(audioPath);
      writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
    } finally {
      if (existsSync(audioPath)) unlinkSync(audioPath);
    }
  }

  const timestamped = buildTimestampedTranscript(transcript);

  let extracted;
  const extractedPath = path.join(feedbackDir, `${stem}.action-items.json`);
  if (existsSync(extractedPath) && !forceExtract) {
    console.log(`• ${videoName}: using cached action items (${path.relative(projectRoot, extractedPath)})`);
    extracted = JSON.parse(readFileSync(extractedPath, 'utf8'));
  } else {
    console.log(`• ${videoName}: extracting action items via Claude …`);
    extracted = await extractActionItems(timestamped, videoName);
    writeFileSync(extractedPath, JSON.stringify(extracted, null, 2));
  }

  writeFileSync(reportPath, renderReport(videoName, transcript, extracted));
  console.log(`• ${videoName}: wrote ${path.relative(projectRoot, reportPath)}`);

  return { videoName, transcript, extracted };
}

const results = [];
for (const v of videos) {
  if (!existsSync(v)) {
    console.error(`Skipping missing file: ${v}`);
    continue;
  }
  try {
    results.push(await processVideo(v));
  } catch (err) {
    console.error(`Failed on ${path.basename(v)}: ${err.message}`);
    process.exitCode = 1;
  }
}

if (results.length) {
  const summaryPath = path.join(feedbackDir, 'SUMMARY.md');
  writeFileSync(summaryPath, renderSummary(results));
  console.log(`\nWrote ${path.relative(projectRoot, summaryPath)} — ${results.length} video(s), ${results.reduce((n, r) => n + (r.extracted.action_items?.length ?? 0), 0)} action item(s).`);
}
