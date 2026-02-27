/**
 * Win Brand Checker — Server
 *
 * POST /api/analyze
 *   body: { type: "text", content: string }
 *       | { type: "image", content: base64string, mimeType: string }
 *
 * Returns:
 *   { verdict, summary, win_quote, issues, passes }
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY   — required
 *   PORT                — optional, default 3001
 *   AIROPS_MCP_TOKEN    — optional; if set, Claude fetches live brand kit from AirOps
 *                         via the Anthropic MCP connector (https://app.airops.com/mcp).
 *                         Get it by running: npx @modelcontextprotocol/inspector
 *                         then connecting to https://app.airops.com/mcp and completing OAuth.
 *   AIROPS_BRAND_KIT_ID — optional, default 26564 (AirOps 2026)
 *   AIROPS_API_KEY      — optional; fallback REST API fetch of brand kit on startup
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PORT   = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── Brand Kit ────────────────────────────────────────────────────────────────
// Seeded from AirOps brand kit ID 26564 (AirOps 2026) via AirOps MCP.
// Set AIROPS_API_KEY to fetch a refreshed version on startup.

const STATIC_BRAND_KIT = {
  brand_name: 'AirOps 2026',
  brand_url: 'airops.com',
  brand_about: `At AirOps, we help brands craft content that wins search. We power content strategy, creation, and performance so your brand gets seen, cited, and celebrated as search changes across Google and AI experiences.

Search isn't clicking like it used to. AI is reshaping how people discover and connect with brands, and content quality, craft, and genuine information now play a bigger role in staying visible. We believe this is the moment for marketers to pair creativity and taste with systems design to increase impact.

AirOps is where big ideas become real results, and where marketers become leaders in the new era of Content Engineering.`,

  writing_persona: `Think of AirOps as your easy-going, intelligent, and animated friend who shows up early with coffee, eager to explore the day's adventures. When you spend time with them, you feel comfortable and intrigued with what topic they'll bring next. They flow smoothly from deep, complicated subjects to lighthearted stories that leave you laughing. They're social, friendly, and don't believe in hoarding useful knowledge. They share what they know so everyone around them is more independent and capable. They live with a growth mindset, and that spirit is contagious. Your success is their success. If life and career is a game, they play it like professionals, not amateurs. We speak like experienced and friendly coaches - inclusive, welcoming, and respectful when talking tech. We treat every partner and project seriously, educating without patronizing or confusing. Using conversational voice and playful humor, we bring joy to their work, preferring the subtle over the noisy.`,

  writing_tone: `Voice stays constant; tone flexes by context. Our voice is expert, optimistic, and empowering. We write with authority from building first-of-their-kind products, but stay warm and human. We lead with clarity, empathy, and subtle wit. We use direct, instructional language that stays businesslike but readable, favoring second-person ("your brand," "you need") and short paragraphs. Structure is scannable: bolded TL;DR sections, H2/H3 headings framed as questions, step-by-step sequences. We back claims with concrete data, metrics, and named platforms.`,

  writing_rules: [
    'Use a skimmable outline built from H2/H3 headings, including step-based sections ("Step 1," "Step 2," etc.) or numbered strategy lists for process content.',
    'Open with a bolded "TL;DR" section that summarizes the piece in 4-6 bullet points.',
    'Address the reader directly with second-person language and keep paragraphs short (often 1-3 sentences), using bullet lists for examples, criteria, and definitions.',
    'Never use em dashes as dramatic pauses. If a sentence needs one to hold together, rewrite it. Use a period instead.',
    'Never start sentences with "In today\'s world," "In an era where," or similar scene-setting clichés. Get to the point directly.',
    'Never use "delve into," "it\'s worth noting that," or "leveraging." Use specific verbs: explore, use, tap, apply, connect, build.',
    'Avoid the "if X, then Y" construction. Replace with plain, direct language.',
    'Never use hollow affirmations like "Great question!" or "Absolutely!" or "Certainly!" at the start of responses.',
    'Avoid overly formal transitions like "Furthermore," "Moreover," and "Additionally."',
    'Don\'t end lists with "and beyond" (e.g. "content, SEO, and beyond"). Name the actual things or cut the list.',
    'Avoid hedge-everything language. We have a POV and we use it. Definitive beats diplomatic.',
    'Don\'t open with rhetorical questions you immediately answer. Lead with the answer instead.',
    'Write with authority and confidence. Use definitive, strong statements. Back claims with data, stats, or logic.',
    'Talk like a real person. Write how you\'d speak to a smart friend. Copy should pass the casual dinner party test.',
    'Never egg on AI anxiety or speak in doomsday terms. AirOps empowers and strengthens teams.',
    'Focus on the user\'s impact, not just what tools do. Frame the product as the vehicle for their success.',
    'Don\'t make it all about us. Our value is measured by their success.',
    'Don\'t make empty promises. Be confident but don\'t promise outcomes we can\'t deliver.',
    'Define acronyms on first use. Exception: universally recognized terms like API, AI.',
    'Respect the reader\'s time. Crisp language that gets the point across.',
    'Celebrate community progress and customer wins.',
    'Our brand enemies are AI slop, automated hacks, and quick wins. We champion lasting impact.',
    'When explaining complex subjects, use analogies and results-oriented language.',
    'We\'re not AI doomsday believers. We care about craft, quality, and the irreplaceable role of human touch.',
    'Never be patronizing. We empower, we don\'t belittle.',
    'Don\'t use jargon to sound smart. Use it only when it adds precision.',
    'Use sentence case for all non-H1 headings.',
  ],
};

// AirOps 2026 Visual Design System (from CLAUDE.md)
const VISUAL_DESIGN_SYSTEM = `
## Visual Design System — AirOps 2026

### Color Palette (approved hex values only)
Brand greens: #000d05, #002910, #008c44, #00ff64, #CCFFE0, #dfeae3, #F8FFFA, #ffffff
Accent: #EEFF8C (pill labels only), #d4e8da (borders/strokes)
UI Text: #09090b, #676c79, #a5aab6

Web palette (monochromatic only — never mix columns):
- Pink: #fff7ff, #fee7fd, #c54b9b, #3a092c, #0d020a
- Indigo: #f5f6ff, #e5e5ff, #1b1b8f, #0f0f57
- Red: #fff0f0, #ffe2e2, #802828, #331010
- Yellow: #fdfff3, #eeff8c, #586605, #242603
- Purple: #f8f7ff, #ddd3f2, #5a3480, #2a084d
- Teal: #f2fcff, #c9ebf2, #196c80, #0a3945

Chart palette: #ccffe0 (bars), #eeff8c (accent bar), #009b32 (line), #001408, #a9a9a9

### Typography
- Headlines (editorial): Serrif VF, 400 weight
- UI/body: Saans, 400-500 weight
- Labels/tags/code: Saans Mono / DM Mono, 500 weight
- Eyebrow text: Saans Mono, 14px, ALL CAPS, 0.06em tracking, color #057a28

H2 pattern: Line 1 = Serrif VF serif, Line 2 = Saans sans, both 72px, -0.03em tracking.

### Buttons
- Primary: #00ff64 background, #002910 text, 58px border-radius (pill), 16px padding, 20px font-size
- Secondary: #eef9f3 background, #002910 text, 0 border-radius (sharp corners)
- Small button: Saans Mono, 13px, ALL CAPS, 8px border-radius only

### Pills / Tags
- Font: Saans Mono Medium, ALL CAPS, 14px, 0.06em letter-spacing
- Max border-radius: 5px (never more rounded)
- Always have a border

### Allowed border-radius values
0 (most UI), 5px (pills), 8px (small buttons), 58px (primary CTA only).
Any other border-radius value is off-brand.

### Design prohibitions
- No gradients (CSS or described)
- No drop shadows or box shadows
- No purple/blue AI aesthetics, glassmorphism, or frosted glass effects
- No rounded bar chart tops
- No mixed web palette columns (e.g., pink + indigo in same design)

### Data visualization
- Sharp corners — no border-radius on bars, containers, chart frames
- Outer border: 1px solid #009b32
- Axes/grid: DM Mono Regular, #a9a9a9
- Never rounded bars, never drop shadows, never gradients
`;

// ── Fetch live brand kit from AirOps API ─────────────────────────────────────

async function fetchLiveBrandKit() {
  const apiKey = process.env.AIROPS_API_KEY;
  const kitId  = process.env.AIROPS_BRAND_KIT_ID || '26564';

  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://app.airops.com/public_api/v1/brand_kits/${kitId}?include[]=writing_rules`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) {
      console.warn(`AirOps API returned ${res.status} — using static brand kit.`);
      return null;
    }
    const data = await res.json();
    console.log(`Loaded live brand kit: ${data.data?.brand_name}`);
    return data.data;
  } catch (err) {
    console.warn('Could not reach AirOps API:', err.message, '— using static brand kit.');
    return null;
  }
}

// ── Build system prompt from brand kit ───────────────────────────────────────

function buildSystemPrompt(kit) {
  const rules = (kit.writing_rules || [])
    .map((r, i) => `${i + 1}. ${r.text || r}`)
    .join('\n');

  return `You are Win, the AirOps Brand Guardian owl. You are an expert on the AirOps 2026 brand system.

Your job is to analyze submitted content (copy, headlines, CSS, HTML, or design descriptions) and check it against the AirOps brand guidelines. You are thorough, precise, and give actionable feedback.

## About AirOps
${kit.brand_about}

## Voice & Persona
${kit.writing_persona}

## Tone
${kit.writing_tone}

## Copy & Writing Rules
${rules}

${VISUAL_DESIGN_SYSTEM}

## How to analyze

**For text/copy:** Check for em dashes, forbidden phrases, AI-cliché openers, hollow affirmations, formal transitions, hedge language, "and beyond" list endings, rhetorical question openers, jargon, doomsday AI framing, patronizing language, and any violation of the writing rules above.

**For images/designs:** Check visible hex colors against the approved palette, identify any gradients or drop shadows, check border-radius usage, verify typography choices, and check for AI-aesthetic patterns (purple/blue gradients, glassmorphism, etc.).

**For CSS/code:** Check hex values, border-radius values, any gradient/shadow declarations, and font choices.

## Verdict scoring
- "on_brand": no violations found — clean pass
- "needs_work": 1-2 warnings or minor issues — fixable with small edits
- "off_brand": 3+ issues, or any critical failure that misrepresents the brand

## Your response
Return ONLY a valid JSON object matching the schema. No markdown, no preamble.
Issues array: only include actual violations found — be specific.
Passes array: list checks that clearly passed so the user knows what's working.
Win quote: 1-2 sentences in Win's warm, direct, slightly dry voice. Reference the actual content when possible.`;
}

// ── State ─────────────────────────────────────────────────────────────────────

let systemPrompt = buildSystemPrompt(STATIC_BRAND_KIT);

// ── MCP system prompt (used when AIROPS_MCP_TOKEN is set) ─────────────────────
// Claude fetches the live brand kit via get_brand_kit before analyzing.

const BRAND_KIT_ID = process.env.AIROPS_BRAND_KIT_ID || '26564';

const MCP_SYSTEM_PROMPT = `You are Win, the AirOps Brand Guardian owl.

Before analyzing any content, call get_brand_kit with id=${BRAND_KIT_ID} and includes=["writing_rules"] to load the current AirOps brand guidelines. Use the returned writing_persona, writing_tone, and writing_rules as your authoritative source.

Also apply these visual design rules when checking CSS, code, or images:
${VISUAL_DESIGN_SYSTEM}

After loading the brand kit, analyze the submitted content and return ONLY a valid JSON object with this exact structure — no markdown, no preamble:
{
  "verdict": "on_brand" | "needs_work" | "off_brand",
  "summary": "one sentence summary",
  "win_quote": "1-2 sentences in Win's warm, direct voice referencing the actual content",
  "issues": [{ "name": "", "severity": "fail"|"warn", "category": "", "excerpt": "", "fix": "" }],
  "passes": [{ "name": "", "msg": "", "category": "" }]
}

Verdict scoring: on_brand = no violations; needs_work = 1-2 minor issues; off_brand = 3+ issues or critical failure.`;

// ── Result schema ─────────────────────────────────────────────────────────────

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['on_brand', 'needs_work', 'off_brand'],
    },
    summary: { type: 'string' },
    win_quote: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:     { type: 'string' },
          severity: { type: 'string', enum: ['fail', 'warn'] },
          category: { type: 'string' },
          excerpt:  { type: 'string' },
          fix:      { type: 'string' },
        },
        required: ['name', 'severity', 'category', 'excerpt', 'fix'],
        additionalProperties: false,
      },
    },
    passes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:     { type: 'string' },
          msg:      { type: 'string' },
          category: { type: 'string' },
        },
        required: ['name', 'msg', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdict', 'summary', 'win_quote', 'issues', 'passes'],
  additionalProperties: false,
};

// ── Route ─────────────────────────────────────────────────────────────────────

app.post('/api/analyze', async (req, res) => {
  const { type, content, mimeType } = req.body;

  if (!type || !content) {
    return res.status(400).json({ error: 'Missing required fields: type and content.' });
  }
  if (type !== 'text' && type !== 'image') {
    return res.status(400).json({ error: 'type must be "text" or "image".' });
  }

  let userContent;

  if (type === 'text') {
    userContent = `Check this content against the AirOps 2026 brand guidelines:\n\n---\n${content}\n---`;
  } else {
    // image: content is base64, mimeType is e.g. "image/png"
    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType || 'image/png',
          data: content,
        },
      },
      {
        type: 'text',
        text: 'Check this design against the AirOps 2026 brand guidelines. Look carefully at colors, typography, border-radius, any gradients or shadows, and visible copy.',
      },
    ];
  }

  try {
    let text;

    if (process.env.AIROPS_MCP_TOKEN) {
      // ── Live mode: Claude fetches brand kit via AirOps MCP ──────────────────
      const response = await client.beta.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: MCP_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        mcp_servers: [{
          type: 'url',
          url: 'https://app.airops.com/mcp',
          name: 'airops',
          authorization_token: process.env.AIROPS_MCP_TOKEN,
        }],
        tools: [{
          type: 'mcp_toolset',
          mcp_server_name: 'airops',
          default_config: { enabled: false },
          configs: { get_brand_kit: { enabled: true } },
        }],
        betas: ['mcp-client-2025-11-20'],
      });
      text = response.content.find(b => b.type === 'text')?.text;

    } else {
      // ── Static mode: embedded brand kit + structured output + prompt cache ───
      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
        output_config: {
          format: {
            type: 'json_schema',
            json_schema: { name: 'brand_analysis', strict: true, schema: RESULT_SCHEMA },
          },
        },
      });
      const response = await stream.finalMessage();
      text = response.content.find(b => b.type === 'text')?.text;
    }

    if (!text) throw new Error('No text in response');

    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({
      verdict: 'needs_work',
      summary: 'An error occurred during analysis. Please try again.',
      win_quote: "Something went wrong on my end. Check the server logs and try again.",
      issues: [{
        name: 'Server error',
        severity: 'warn',
        category: 'Setup',
        excerpt: '',
        fix: err.message,
      }],
      passes: [],
    });
  }
});

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  model: 'claude-opus-4-6',
  brand_kit_mode: process.env.AIROPS_MCP_TOKEN ? 'live (AirOps MCP)' : 'static (seed)',
}));

// ── Init brand kit ────────────────────────────────────────────────────────────
// Runs at module load so Vercel serverless warm starts pick it up.

fetchLiveBrandKit().then(liveBrandKit => {
  if (liveBrandKit) {
    systemPrompt = buildSystemPrompt(liveBrandKit);
    console.log('Brand kit: AirOps API (live)');
  } else {
    console.log('Brand kit: static seed (brand kit ID 26564)');
  }
}).catch(err => console.warn('Brand kit init error:', err.message));

// ── Local dev ─────────────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\nWin brand server → http://localhost:${PORT}`);
    console.log(`POST http://localhost:${PORT}/api/analyze\n`);
  });
}

module.exports = app;
