// QAB scoring engine. Pure functions, no DOM, no dependencies.
// Formulas: Wilson et al. (2018) PLOS ONE 13(2):e0192773, Table 1, plus two details
// verified against the published dataset (see docs/REQUIREMENTS.md section 4):
//   - no-response ("nr") items are imputed at chance: 1 (word comp), 2 (sentence comp)
//   - "overall communication impairment" enters QAB overall as (x+1)/5*10

export const SCORING_VERSION = "1.0.0";
export const APHASIA_CUTOFF = 8.9;

export const CS_FEATURES = [
  "phrase_length", "speech_rate", "agrammatism", "paragrammatism", "anomia",
  "empty_speech", "semantic_paraphasias", "phonemic_paraphasias",
  "self_correction", "overall",
];

const ids = (p, n) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);
export const ITEM_IDS = {
  swc: ids("swc", 8), sc: ids("sc", 12), pn: ids("pn", 6),
  rep: ids("rep", 6), read: ids("read", 6),
};

const clamp0 = (x) => Math.max(0, x);

// responses[id] = { score: 0..4, nr?: boolean }  (nr = no response)
function itemValue(r, nrValue) {
  if (!r || r.score == null || Number.isNaN(r.score)) return null;
  return r.nr ? nrValue : r.score;
}

function total(responses, idList, nrValue) {
  let sum = 0;
  for (const id of idList) {
    const v = itemValue(responses[id], nrValue);
    if (v == null) return null;
    sum += v;
  }
  return sum;
}

const num = (v) => (v == null || Number.isNaN(v) ? null : v);

/**
 * @param {{responses: Object, cs: Object, ms: {apraxia?: number, dysarthria?: number}}} s
 * @returns {{measures: Object, missing: Object, flags: string[]}}
 *   measures.X is a number 0..10 or null if its inputs are incomplete.
 */
export function computeSummary(s) {
  const R = s.responses || {};
  const cs = s.cs || {};
  const ms = s.ms || {};
  const missing = {};
  const need = (key, ok) => { if (!ok) missing[key] = true; return ok; };

  const swc = total(R, ITEM_IDS.swc, 1);
  const sc = total(R, ITEM_IDS.sc, 2);
  const pn = total(R, ITEM_IDS.pn, 0);
  const rep = total(R, ITEM_IDS.rep, 0);
  const read = total(R, ITEM_IDS.read, 0);

  const m = {};
  m.WC = swc == null ? null : (clamp0(swc - 8) / 24) * 10;
  m.SC = sc == null ? null : (clamp0(sc - 24) / 24) * 10;
  m.Rep = rep == null ? null : (rep / 24) * 10;
  m.Read = read == null ? null : (read / 24) * 10;
  m.SMP = num(ms.apraxia) == null ? null : (ms.apraxia / 4) * 10;

  const c = (k) => num(cs[k]);
  const haveCS = (...ks) => ks.every((k) => c(k) != null);

  // Word finding
  if (pn != null && haveCS("anomia", "empty_speech", "semantic_paraphasias", "phonemic_paraphasias")) {
    const an = c("anomia");
    const cap = (x) => Math.min(x, an);
    const avg = (cap(c("empty_speech")) + cap(c("semantic_paraphasias")) + cap(c("phonemic_paraphasias"))) / 3;
    m.WF = (pn / 24) * 6 + (an / 4) * 2 + (avg / 4) * 2;
  } else m.WF = null;

  // Grammatical construction
  const sentItems = ["rep5", "rep6", "read5", "read6"].map((id) => itemValue(R[id], 0));
  if (haveCS("agrammatism", "phrase_length", "paragrammatism") && sentItems.every((v) => v != null)) {
    const ag = c("agrammatism");
    m.GC =
      (ag / 4) * 4 +
      (c("phrase_length") / 4) * 2 +
      (Math.min(c("paragrammatism"), ag) / 4) * 2 +
      (sentItems.reduce((a, b) => a + b, 0) / 16) * 2;
  } else m.GC = null;

  // QAB overall
  const parts = [m.WC, m.SC, m.WF, m.GC, m.SMP, m.Rep, m.Read];
  if (parts.every((v) => v != null) && haveCS("overall", "speech_rate", "self_correction")) {
    m.QAB =
      0.18 * m.WC + 0.18 * m.SC + 0.14 * m.WF + 0.14 * m.GC +
      0.08 * m.SMP + 0.08 * m.Rep + 0.08 * m.Read +
      0.08 * (((c("overall") + 1) / 5) * 10) +
      0.02 * ((c("speech_rate") / 4) * 10) +
      0.02 * ((c("self_correction") / 4) * 10);
  } else m.QAB = null;

  for (const k of Object.keys(m)) need(k, m[k] != null);

  const flags = [];
  if (m.QAB != null) {
    if (m.QAB < APHASIA_CUTOFF) {
      flags.push("below-cutoff");
      if (num(ms.dysarthria) != null && ms.dysarthria <= 1) flags.push("below-cutoff-dysarthria-caveat");
    }
  }
  return { measures: m, missing, flags };
}

// ---------- helpers for the app and for dataset testing ----------

/** Parse a dataset-style score such as "3r", "0nr", "4" -> {score, nr, tag} or null. */
export function parseScoreString(v) {
  if (v == null) return null;
  const t = String(v).trim();
  const m = /^(\d)(.*)$/.exec(t);
  if (!m) return null;
  return { score: Number(m[1]), nr: m[2] === "nr", tag: m[2] || "" };
}

/** Build a scoring session from a row of the published dataset. */
export function sessionFromDatasetRow(row) {
  const responses = {};
  const map = [["swc", "swc", 8], ["sc", "sc", 12], ["pn", "pn", 6], ["rep", "rep", 6], ["read", "read", 6]];
  for (const [col, id, n] of map) {
    for (let i = 1; i <= n; i++) {
      const p = parseScoreString(row[`${col}_${i}`]);
      if (p) responses[`${id}${i}`] = { score: p.score, nr: p.nr };
    }
  }
  const cs = {};
  for (const f of CS_FEATURES) {
    const p = parseScoreString(row[`cs_${f}`]);
    if (p) cs[f] = p.score;
  }
  const a = parseScoreString(row.ms_apraxia_of_speech);
  const d = parseScoreString(row.ms_dysarthria);
  return { responses, cs, ms: { apraxia: a?.score, dysarthria: d?.score } };
}
