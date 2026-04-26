import * as toxicity from '@tensorflow-models/toxicity';

let model: toxicity.ToxicityClassifier | null = null;
let loading = false;

const THRESHOLD = 0.85;

export async function loadToxicityModel(): Promise<void> {
  if (model || loading) return;
  loading = true;
  try {
    model = await toxicity.load(THRESHOLD, [
      'toxicity',
      'severe_toxicity',
      'insult',
      'threat',
      'obscene',
      'identity_attack',
    ]);
    console.log('✅ Toxicity model loaded');
  } catch (e) {
    console.warn('⚠️ Failed to load toxicity model:', e);
  } finally {
    loading = false;
  }
}

export interface ToxicityResult {
  isToxic: boolean;
  labels: string[];
}

export async function checkToxicity(text: string): Promise<ToxicityResult> {
  if (!model) {
    // Model not loaded yet — skip check
    return { isToxic: false, labels: [] };
  }

  try {
    const predictions = await model.classify([text]);
    const flaggedLabels: string[] = [];

    for (const prediction of predictions) {
      const match = prediction.results[0]?.match;
      if (match === true) {
        flaggedLabels.push(prediction.label);
      }
    }

    return {
      isToxic: flaggedLabels.length > 0,
      labels: flaggedLabels,
    };
  } catch {
    return { isToxic: false, labels: [] };
  }
}

// Quick client-side word list check (instant, no ML)
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'bastard',
  'idiot', 'stupid', 'dumb', 'moron', 'retard', 'slut', 'whore',
];

export function quickProfanityCheck(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((w) => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(lower);
  });
}
