/**
 * offensiveLanguageFilter.js — ML-powered offensive language detection service
 * [NEW ADDITION - Offensive Language Filter]
 *
 * Classification approach (tiered):
 *   1. Technical whitelist pre-check — instantly allows programming terms
 *   2. HuggingFace Inference API (model: "unitary/toxic-bert") — free, hosted
 *   3. Local Python ML microservice (DistilBERT) — if ML_SERVICE_URL is set
 *
 * To swap classifier:
 *   - Change HUGGINGFACE_MODEL to another model slug
 *   - Or set ML_SERVICE_URL in .env to point to your own /classify endpoint
 *   - Or set PERSPECTIVE_API_KEY to use Google Perspective API instead
 *
 * Fail-open: If all classification services are unreachable, the comment is ALLOWED
 * (logged as a warning). This prevents blocking users due to infra issues.
 */

// ─── Technical terms whitelist (must NOT be flagged as offensive) ──────────────
const TECHNICAL_WHITELIST = [
  'kill', 'abort', 'dummy', 'master', 'blacklist', 'whitelist',
  'fork', 'hang', 'dead', 'execute', 'terminate', 'crash', 'corrupt',
  'poison', 'evil', 'hack', 'inject', 'exploit',
];

/**
 * Pre-check: if the text consists only of whitelisted technical terms
 * (and ordinary words), skip ML classification entirely.
 */
function isLikelyTechnicalContext(text) {
  const lower = text.toLowerCase();
  // Check if any whitelist word appears — if so, see if the entire message
  // is technical in nature (no other slurs mixed in)
  const hasWhitelistWord = TECHNICAL_WHITELIST.some(w =>
    new RegExp(`\\b${w}\\b`, 'i').test(lower)
  );
  if (!hasWhitelistWord) return false;

  // If the message is short and only contains whitelist terms + normal words, allow it
  const words = lower.split(/\s+/);
  const nonTechnical = words.filter(w =>
    w.length > 2 && !TECHNICAL_WHITELIST.includes(w)
  );
  // If most words are technical terms, treat as technical context
  return nonTechnical.length <= Math.max(words.length * 0.6, 2);
}

// ─── Built-in offensive word classifier (works without any API key) ───────────
const OFFENSIVE_PATTERNS = [
  // Slurs and hate speech
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'tranny',
  'chink', 'spic', 'kike', 'wetback', 'coon', 'gook', 'raghead',
  'beaner', 'towelhead', 'cracker',
  // Sexual / vulgar
  'fuck', 'fucking', 'fucker', 'fucked', 'motherfucker',
  'shit', 'shitty', 'bullshit', 'asshole', 'bitch', 'bastard',
  'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'cum',
  // Abusive
  'idiot', 'moron', 'imbecile', 'dumbass', 'dipshit',
  'stfu', 'gtfo', 'kys',
  // Derogatory
  'slave', 'negro', 'nazi',
];

function classifyWithBuiltIn(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.!?;:'"()\[\]{}]+/).filter(Boolean);

  for (const pattern of OFFENSIVE_PATTERNS) {
    // Check as whole word
    if (words.includes(pattern)) {
      // Double-check it's not in a technical context like "master-slave architecture"
      if (pattern === 'slave' && /master[\s-]slave|slave[\s-]node|slave[\s-]server/i.test(text)) {
        continue; // Allow in technical context
      }
      return {
        isOffensive: true,
        confidence: 0.90,
        source: 'built_in',
      };
    }
  }

  return { isOffensive: false, confidence: 0, source: 'built_in' };
}

// ─── HuggingFace Inference API ────────────────────────────────────────────────
const HUGGINGFACE_MODEL = 'unitary/toxic-bert';
const HUGGINGFACE_THRESHOLD = 0.75;

async function classifyWithHuggingFace(text) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null; // Not configured — skip

  const url = `https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s hard timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[OffensiveFilter] HuggingFace API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    // Response format: [[{label, score}, ...]]
    const results = Array.isArray(data[0]) ? data[0] : data;
    const toxic = results.find(r =>
      r.label && r.label.toLowerCase() === 'toxic' && r.score >= HUGGINGFACE_THRESHOLD
    );

    return {
      isOffensive: !!toxic,
      confidence: toxic ? toxic.score : 0,
      source: 'huggingface',
    };
  } catch (e) {
    clearTimeout(timeout);
    console.warn('[OffensiveFilter] HuggingFace API unreachable:', e.message);
    return null;
  }
}

// ─── Google Perspective API ───────────────────────────────────────────────────
const PERSPECTIVE_THRESHOLD = 0.75;

async function classifyWithPerspective(text) {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return null; // Not configured — skip

  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[OffensiveFilter] Perspective API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const scores = data.attributeScores || {};
    const toxicity = scores.TOXICITY?.summaryScore?.value || 0;
    const severe = scores.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const maxScore = Math.max(toxicity, severe);

    return {
      isOffensive: maxScore >= PERSPECTIVE_THRESHOLD,
      confidence: maxScore,
      source: 'perspective',
    };
  } catch (e) {
    clearTimeout(timeout);
    console.warn('[OffensiveFilter] Perspective API unreachable:', e.message);
    return null;
  }
}

// ─── Local Python ML microservice ─────────────────────────────────────────────
async function classifyWithLocalML(text) {
  const mlUrl = process.env.ML_SERVICE_URL;
  if (!mlUrl) return null; // Not configured — skip

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${mlUrl}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[OffensiveFilter] Local ML service returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      isOffensive: !!data.isOffensive,
      confidence: data.confidence || 0,
      source: 'local_ml',
    };
  } catch (e) {
    clearTimeout(timeout);
    console.warn('[OffensiveFilter] Local ML service unreachable:', e.message);
    return null;
  }
}

// ─── Main exported function ───────────────────────────────────────────────────
/**
 * Classify a comment for offensive language.
 * Tries classifiers in order: local ML → HuggingFace → Perspective → built-in.
 * The built-in classifier always works (no API key needed).
 *
 * @param {string} text — The comment text to classify
 * @returns {Promise<{isOffensive: boolean, confidence: number}>}
 */
async function classifyComment(text) {
  // Step 1: Technical whitelist pre-check
  if (isLikelyTechnicalContext(text)) {
    return { isOffensive: false, confidence: 0, source: 'whitelist' };
  }

  // Step 2: Try external ML classifiers in priority order
  const classifiers = [
    classifyWithLocalML,
    classifyWithHuggingFace,
    classifyWithPerspective,
  ];

  for (const classify of classifiers) {
    const result = await classify(text);
    if (result !== null) {
      console.log(`[OffensiveFilter] ${result.source}: offensive=${result.isOffensive}, confidence=${result.confidence.toFixed(3)}`);
      return { isOffensive: result.isOffensive, confidence: result.confidence };
    }
  }

  // Step 3: Built-in word classifier (always works, no API needed)
  const builtInResult = classifyWithBuiltIn(text);
  console.log(`[OffensiveFilter] built_in: offensive=${builtInResult.isOffensive}, confidence=${builtInResult.confidence}`);
  return { isOffensive: builtInResult.isOffensive, confidence: builtInResult.confidence };
}

module.exports = { classifyComment };
