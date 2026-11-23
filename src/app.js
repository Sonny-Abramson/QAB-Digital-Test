import { computeSummary, SCORING_VERSION, APHASIA_CUTOFF, CS_FEATURES } from "./scoring.js";
import * as I from "./items.js";
import * as db from "./db.js";

const root = document.getElementById("app");
const scroller = document.getElementById("scroller");
const APP_VERSION = "0.1.0";

// ---------------------------------------------------------------- helpers
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const fmt = (x) => (x == null ? "—" : x.toFixed(2));
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const cardSrc = (key) => (window.__CARDS && window.__CARDS[key]) || `assets/cards/${key}.jpg`;

// ---------------------------------------------------------------- state
const state = {
  view: "home",
  sessions: [],
  S: null, // current session
  step: 0,
  participant: null, // participant id for history view
  persistent: true,
  lastBackup: null,
  notice: null,
};

const STEPS = [
  ["info", "Setup"], ["loc", "1 Consciousness"], ["cs", "2 Connected speech"], ["swc", "3 Word comp."],
  ["sc", "4 Sentence comp."], ["pn", "5 Naming"], ["rep", "6 Repetition"], ["read", "7 Reading"],
  ["ms", "8 Motor speech"], ["summary", "Summary"],
];

function newSession(meta) {
  return {
    id: db.newId(), createdAt: new Date().toISOString(), status: "in-progress",
    participant: meta.participant, examiner: meta.examiner, location: meta.location,
    date: meta.date, time: meta.time, form: meta.form, sessionNo: meta.sessionNo, scoredBy: "",
    skipLoc: false, loc: {}, orient: {}, responses: {}, cs: {}, csNotPossible: {}, csInfo: { topic: "", sample: "", pic1: "", pic2: "" },
    ms: {}, msNotes: {}, notes: "", log: [{ t: new Date().toISOString(), a: "created" }],
    scoringVersion: SCORING_VERSION, appVersion: APP_VERSION,
  };
}

let saveTimer = null;
function touch() {
  const S = state.S;
  if (S.status === "complete" && !S._editLogged) {
    S.log.push({ t: new Date().toISOString(), a: "edited after completion" });
    S._editLogged = true;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const copy = { ...S }; delete copy._editLogged;
    await db.saveSession(copy);
    const i = state.sessions.findIndex((x) => x.id === S.id);
    if (i >= 0) state.sessions[i] = copy; else state.sessions.push(copy);
  }, 150);
}
async function flush() { clearTimeout(saveTimer); if (state.S) { const c = { ...state.S }; delete c._editLogged; await db.saveSession(c); } }

function render() {
  const y = scroller.scrollTop;
  document.body.dataset.view = state.view;
  root.replaceChildren(...[
    state.notice ? h("div", { class: "notice" }, state.notice, h("button", { class: "link", onclick: () => { state.notice = null; render(); } }, "dismiss")) : null,
    !state.persistent ? h("div", { class: "notice warn" }, "Browser storage is unavailable. Work is kept in memory only and will be lost when this tab closes. Export often.") : null,
    state.view === "home" ? viewHome() : state.view === "participant" ? viewParticipant() : viewSession(),
  ].filter(Boolean));
  scroller.scrollTop = y;
}

function go(view, extra = {}) { Object.assign(state, { view }, extra); scroller.scrollTop = 0; render(); }

// ---------------------------------------------------------------- timer (persistent, outside render root)
const timerEl = document.getElementById("timer");
let tStart = 0, tHandle = null;
function timerPaint() {
  const el = ((performance.now() - tStart) / 1000);
  const s = timerEl.querySelector(".t-sec");
  s.textContent = el.toFixed(1);
  timerEl.dataset.zone = el >= 6 ? "late" : el >= 3 ? "delayed" : "ok";
}
function timerStart() {
  tStart = performance.now(); clearInterval(tHandle);
  timerEl.classList.add("running"); timerPaint();
  tHandle = setInterval(timerPaint, 100);
}
function timerStop() { clearInterval(tHandle); timerEl.classList.remove("running"); timerEl.dataset.zone = ""; timerEl.querySelector(".t-sec").textContent = "0.0"; }
timerEl.querySelector(".t-go").addEventListener("click", timerStart);
timerEl.querySelector(".t-stop").addEventListener("click", timerStop);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(document.activeElement?.tagName) && state.view === "session") { e.preventDefault(); timerStart(); }
  if (e.key === "Escape") closeOverlay();
});

// ---------------------------------------------------------------- participant-facing overlay
const overlay = document.getElementById("overlay");
function closeOverlay() { overlay.hidden = true; overlay.replaceChildren(); }
function showImage(key) {
  overlay.replaceChildren(h("img", { src: cardSrc(key), alt: "stimulus card" }), h("div", { class: "ov-hint" }, "Tap anywhere or press Esc to close"));
  overlay.hidden = false;
}
function showReading(form) {
  const items = form.read.map((x) => h("div", {}, x.target));
  overlay.replaceChildren(h("div", { class: "reading" }, items), h("div", { class: "ov-hint" }, "Tap anywhere or press Esc to close"));
  overlay.hidden = false;
}
overlay.addEventListener("click", closeOverlay);

// ---------------------------------------------------------------- HOME
function suggestForm(participant) {
  const mine = state.sessions.filter((s) => s.participant === participant).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (!mine.length) return { form: 1, sessionNo: 1 };
  return { form: (mine[mine.length - 1].form % 3) + 1, sessionNo: mine.length + 1 };
}

function viewHome() {
  const meta = { participant: "", examiner: localStorageGet("qab.examiner") || "", location: localStorageGet("qab.location") || "", date: today(), time: nowTime(), form: 1 };
  const f = {};
  const field = (k, label, type = "text", extra = {}) =>
    h("label", { class: "fld" }, label, f[k] = h("input", { type, value: meta[k], ...extra }));
  f.form = h("select", {}, I.FORMS.map((n) => h("option", { value: n }, `Form ${n}`)));
  const hint = h("div", { class: "hint" });
  const upd = () => {
    const p = f.participant.value.trim();
    const sug = p ? suggestForm(p) : { form: 1, sessionNo: 1 };
    f.form.value = sug.form;
    hint.textContent = p ? `Session ${sug.sessionNo} for this participant. Suggested Form ${sug.form} (alternate forms rotate 1→2→3).` : "";
  };
  const create = async () => {
    const participant = f.participant.value.trim();
    if (!participant) { f.participant.focus(); return; }
    const formN = Number(f.form.value);
    const prior = state.sessions.filter((s) => s.participant === participant);
    if (prior.some((s) => s.form === formN) && !confirm(`Form ${formN} was already used with this participant. Repeating a form can add practice effects. Continue anyway?`)) return;
    localStoragePut("qab.examiner", f.examiner.value); localStoragePut("qab.location", f.location.value);
    const S = newSession({ participant, examiner: f.examiner.value.trim(), location: f.location.value.trim(), date: f.date.value, time: f.time.value, form: formN, sessionNo: prior.length + 1 });
    state.S = S; state.sessions.push(S); await db.saveSession(S);
    state.step = 1; go("session");
  };
  f.participant = h("input", { type: "text", placeholder: "Participant ID (no names needed)", oninput: upd, autocomplete: "off" });

  const groups = [...new Set(state.sessions.map((s) => s.participant))].sort();
  const backupWarn = backupOverdue();

  return h("div", { class: "page" },
    h("header", { class: "top" }, h("h1", {}, "Quick Aphasia Battery"), h("div", { class: "sub" }, "Local, offline administration and scoring. Data stays on this device.")),
    backupWarn ? h("div", { class: "notice warn" }, backupWarn) : null,
    h("section", { class: "card" }, h("h2", {}, "New session"),
      h("div", { class: "grid" },
        h("label", { class: "fld span2" }, "Participant", f.participant),
        field("examiner", "Examiner"), field("location", "Location"),
        field("date", "Date", "date"), field("time", "Time", "time"),
        h("label", { class: "fld" }, "Form", f.form)),
      hint,
      h("div", { class: "row" }, h("button", { class: "primary", onclick: create }, "Start session"))),
    h("section", { class: "card" }, h("h2", {}, "Participants and sessions"),
      groups.length ? h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, ["Participant", "Sessions", "Last", "QAB overall (latest)", ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, groups.map((p) => {
          const ss = state.sessions.filter((s) => s.participant === p).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
          const last = ss[ss.length - 1];
          const q = computeSummary(last).measures.QAB;
          return h("tr", {}, h("td", {}, p), h("td", {}, ss.length), h("td", {}, last.date), h("td", {}, fmt(q)),
            h("td", {}, h("button", { onclick: () => go("participant", { participant: p }) }, "Open")));
        }))) : h("p", { class: "muted" }, "No sessions yet.")),
    h("section", { class: "card" }, h("h2", {}, "Backup and data"),
      h("p", { class: "muted" }, "There is no sync. Export a backup regularly; browsers can clear local storage. Importing merges sessions by id."),
      h("div", { class: "row wrap" },
        h("button", { onclick: exportAllJSON }, "Export backup (JSON)"),
        h("button", { onclick: exportCSV }, "Export all (CSV)"),
        h("label", { class: "btn" }, "Import backup…", h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: importJSON })),
        h("button", { class: "danger", onclick: wipe }, "Erase all data")),
      h("p", { class: "muted small" }, state.lastBackup ? `Last backup: ${new Date(state.lastBackup).toLocaleString()}` : "No backup made yet.")),
    h("footer", { class: "foot" },
      "QAB: Wilson SM, Eriksson DK, Schneck SM, Lucanie JM (2018). A quick aphasia battery for efficient, reliable, and multidimensional assessment of language function. PLOS ONE 13(2):e0192773. CC BY. ",
      "Clinical-research tool; scores are not a diagnosis. ", `App ${APP_VERSION}, scoring ${SCORING_VERSION}.`));
}

function backupOverdue() {
  if (!state.sessions.length) return null;
  if (!state.lastBackup) return "You have sessions but no backup yet. Export a backup so a cleared browser doesn't lose them.";
  const days = (Date.now() - new Date(state.lastBackup)) / 864e5;
  const newer = state.sessions.some((s) => s.updatedAt && s.updatedAt > state.lastBackup);
  if (days > 14 && newer) return `Last backup was ${Math.floor(days)} days ago and sessions have changed since.`;
  return null;
}

// ---------------------------------------------------------------- PARTICIPANT HISTORY
function viewParticipant() {
  const ss = state.sessions.filter((s) => s.participant === state.participant).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const sums = ss.map((s) => computeSummary(s).measures);
  return h("div", { class: "page" },
    h("header", { class: "top" }, h("button", { class: "link", onclick: () => go("home") }, "← All participants"), h("h1", {}, `Participant ${state.participant}`)),
    h("section", { class: "card" }, h("h2", {}, "Trend: QAB overall"), sparkline(sums.map((m) => m.QAB), ss.map((s) => s.date))),
    h("section", { class: "card scroll" }, h("h2", {}, "Sessions"),
      h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, ["Date", "Form", "Status", ...I.MEASURES.map((m) => m[0]), ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, ss.map((s, i) => h("tr", {}, h("td", {}, s.date), h("td", {}, s.form), h("td", {}, s.status),
          I.MEASURES.map(([k]) => h("td", {}, fmt(sums[i][k]))),
          h("td", { class: "nowrap" },
            h("button", { onclick: () => { state.S = s; state.step = s.status === "complete" ? 9 : 1; go("session"); } }, s.status === "complete" ? "View" : "Resume"),
            h("button", { class: "danger", onclick: async () => { if (confirm("Permanently delete this session?")) { await db.deleteSession(s.id); state.sessions = state.sessions.filter((x) => x.id !== s.id); state.sessions.some((x) => x.participant === state.participant) ? render() : go("home"); } } }, "Delete"))))))));
}

function sparkline(vals, labels) {
  const pts = vals.map((v, i) => ({ v, i })).filter((p) => p.v != null);
  const W = 560, H = 140, P = 28;
  if (!pts.length) return h("p", { class: "muted" }, "No completed scores yet.");
  const x = (i) => P + (vals.length === 1 ? (W - 2 * P) / 2 : (i / (vals.length - 1)) * (W - 2 * P));
  const y = (v) => H - P - (v / 10) * (H - 2 * P);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "spark");
  const add = (tag, a, text) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); if (text) e.textContent = text; svg.append(e); return e; };
  add("line", { x1: P, x2: W - P, y1: y(APHASIA_CUTOFF), y2: y(APHASIA_CUTOFF), class: "cut" });
  add("text", { x: W - P, y: y(APHASIA_CUTOFF) - 4, class: "lbl", "text-anchor": "end" }, `cutoff ${APHASIA_CUTOFF}`);
  add("polyline", { points: pts.map((p) => `${x(p.i)},${y(p.v)}`).join(" "), class: "ln" });
  for (const p of pts) { add("circle", { cx: x(p.i), cy: y(p.v), r: 4, class: "dot" }); add("text", { x: x(p.i), y: y(p.v) - 8, class: "lbl", "text-anchor": "middle" }, p.v.toFixed(1)); add("text", { x: x(p.i), y: H - 8, class: "lbl", "text-anchor": "middle" }, labels[p.i].slice(5)); }
  return svg;
}

// ---------------------------------------------------------------- SESSION
function viewSession() {
  const S = state.S;
  const form = I.buildForm(S.form);
  const key = STEPS[state.step][0];
  const body = { info: stepInfo, loc: stepLoc, cs: stepCS, swc: stepSwc, sc: stepSc, pn: stepPn, rep: stepRep, read: stepRead, ms: stepMs, summary: stepSummary }[key](S, form);
  const prog = progress(S, form);
  return h("div", { class: "page session" },
    h("header", { class: "top slim" },
      h("button", { class: "link", onclick: async () => { await flush(); timerStop(); go("home"); } }, "← Home"),
      h("div", { class: "who" }, `${S.participant} · Form ${S.form} · ${S.date}`),
      S.status === "complete" ? h("span", { class: "pill ok" }, "complete") : h("span", { class: "pill" }, "in progress")),
    h("nav", { class: "steps" }, STEPS.map(([k, label], i) => {
      const p = prog[k];
      return h("button", { class: "step" + (i === state.step ? " on" : "") + (p && p.done === p.total ? " done" : ""), onclick: () => { state.step = i; go("session"); } },
        label, p ? h("small", {}, ` ${p.done}/${p.total}`) : null);
    })),
    body,
    h("div", { class: "pager" },
      h("button", { disabled: state.step === 0, onclick: () => { state.step--; go("session"); } }, "← Back"),
      state.step < STEPS.length - 1 ? h("button", { class: "primary", onclick: () => { state.step++; go("session"); } }, "Next →") : null));
}

function progress(S, form) {
  const cnt = (ids) => ({ total: ids.length, done: ids.filter((id) => S.responses[id] && S.responses[id].score != null).length });
  return {
    loc: S.skipLoc ? { total: 1, done: 1 } : { total: 8, done: I.LOC.filter((x) => S.loc[x.id]?.score != null).length },
    cs: { total: 10, done: CS_FEATURES.filter((k) => S.cs[k] != null).length },
    swc: cnt(form.swc.map((x) => x.id)), sc: cnt(form.sc.map((x) => x.id)), pn: cnt(form.pn.map((x) => x.id)),
    rep: cnt(form.rep.map((x) => x.id)), read: cnt(form.read.map((x) => x.id)),
    ms: { total: 2, done: ["dysarthria", "apraxia"].filter((k) => S.ms[k] != null).length },
  };
}

// score button group
function scoreButtons(values, current, onPick, { nr = false, nrOn = false, onNR } = {}) {
  const wrap = h("div", { class: "btns" });
  const paint = () => {
    [...wrap.querySelectorAll("button")].forEach((b) => {
      const v = b.dataset.v;
      b.classList.toggle("sel", v === "nr" ? nrOn : (!nrOn && current != null && String(current) === v));
    });
  };
  for (const v of values) wrap.append(h("button", { "data-v": v, class: "sc", onclick: () => { current = v; nrOn = false; onPick(v); paint(); } }, v));
  if (nr) wrap.append(h("button", { "data-v": "nr", class: "sc nr", title: "No response within 6 seconds", onclick: () => { current = 0; nrOn = true; onNR(); paint(); } }, "NR"));
  paint();
  return wrap;
}

function noteInput(S, bag, id, field, placeholder, cls = "txt") {
  return h("input", { type: "text", class: cls, placeholder, value: (bag[id] && bag[id][field]) || "", onchange: (e) => { (bag[id] ||= {})[field] = e.target.value; touch(); } });
}

function itemRow(S, it, values, { hint, cardBtn } = {}) {
  const r = (S.responses[it.id] ||= {});
  const tagSel = h("select", { class: "tag", onchange: (e) => { r.tag = e.target.value; touch(); } },
    I.TAGS.map(([v, l]) => h("option", { value: v, selected: (r.tag || "") === v }, l)));
  return h("div", { class: "item" },
    h("div", { class: "il" }, h("div", { class: "lab" }, it.label, cardBtn), hint ? h("div", { class: "hint" }, hint) : null),
    scoreButtons(values, r.score, (v) => { r.score = v; r.nr = false; touch(); refreshTabs(); }, { nr: true, nrOn: !!r.nr, onNR: () => { r.score = 0; r.nr = true; touch(); refreshTabs(); } }),
    h("div", { class: "ir" }, noteInput(S, S.responses, it.id, "text", "response / transcript"), tagSel));
}
function refreshTabs() { /* step badges update on next navigation; keeps scroll stable */ }

function sectionShell(title, rubric, extra, ...items) {
  return h("section", { class: "card" }, h("h2", {}, title), rubric ? h("p", { class: "rubric" }, rubric) : null, extra, ...items);
}
function rulesBox() {
  return h("details", { class: "rules" }, h("summary", {}, "Administration rules"), h("ul", {}, I.RULES.map((r) => h("li", {}, r))));
}

function stepInfo(S) {
  const set = (k) => (e) => { S[k] = e.target.value; touch(); };
  return sectionShell("Session details", null, null,
    h("div", { class: "grid" },
      h("label", { class: "fld" }, "Participant", h("input", { value: S.participant, onchange: set("participant") })),
      h("label", { class: "fld" }, "Examiner", h("input", { value: S.examiner, onchange: set("examiner") })),
      h("label", { class: "fld" }, "Scored by (if different)", h("input", { value: S.scoredBy, onchange: set("scoredBy") })),
      h("label", { class: "fld" }, "Location", h("input", { value: S.location, onchange: set("location") })),
      h("label", { class: "fld" }, "Date", h("input", { type: "date", value: S.date, onchange: set("date") })),
      h("label", { class: "fld" }, "Time", h("input", { type: "time", value: S.time, onchange: set("time") }))),
    rulesBox(),
    h("label", { class: "fld" }, "Session notes", h("textarea", { rows: 3, onchange: set("notes") }, S.notes)));
}

function stepLoc(S) {
  const stops = [];
  const rows = I.LOC.map((it) => {
    const cur = (S.loc[it.id] ||= {});
    const stop = it.stop && cur.score != null && it.stop.includes(cur.score);
    if (stop) stops.push(it.label);
    return h("div", { class: "item" },
      h("div", { class: "il" }, h("div", { class: "lab" }, it.label),
        h("div", { class: "hint" }, it.help || (it.orient ? I.ORIENT_HELP : it.cmd ? I.CMD_HELP : ""))),
      scoreButtons(it.values, cur.score, (v) => { cur.score = v; touch(); render(); }),
      it.follow ? h("div", { class: "follow" }, "If NR/incorrect:", it.follow.map((q, i) => {
        const arr = (S.orient[it.id] ||= []);
        return h("div", { class: "fq" }, q, h("span", { class: "btns" }, ["yes", "no", "NR"].map((a) => h("button", { class: "sc sm" + (arr[i] === a ? " sel" : ""), onclick: (e) => { arr[i] = a; [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle("sel", b === e.currentTarget)); touch(); } }, a))));
      })) : null,
      h("div", { class: "ir" }, noteInput(S, S.loc, it.id, "note", it.id === "loc6" || it.id === "loc7" ? "note (e.g. substituted command)" : "response / note")));
  });
  const skip = h("label", { class: "chk" }, h("input", { type: "checkbox", checked: S.skipLoc, onchange: (e) => { S.skipLoc = e.target.checked; touch(); render(); } }), " Skip this subtest (follow-up visit; it does not contribute to any summary score)");
  return sectionShell("1. Level of consciousness", null, [
    skip,
    stops.length && !S.skipLoc ? h("div", { class: "notice warn" }, `Stop rule reached at ${stops[0]}. The evaluation should not proceed.`) : null,
  ], S.skipLoc ? h("p", { class: "muted" }, "Skipped.") : rows);
}

function stepCS(S, form) {
  const info = S.csInfo;
  const clock = h("span", { class: "clock" }, "0:00");
  let sec = 0, th = null;
  const tick = () => { sec++; clock.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const toggle = (e) => { if (th) { clearInterval(th); th = null; e.currentTarget.textContent = "Resume conversation timer"; } else { th = setInterval(tick, 1000); e.currentTarget.textContent = "Pause timer"; } };
  const feats = I.CS_FEATURE_DEFS.map((f) => h("div", { class: "item" },
    h("div", { class: "il" }, h("div", { class: "lab" }, f.label), f.sub ? h("div", { class: "hint" }, f.sub) : null),
    h("div", { class: "btns anchored" }, [0, 1, 2, 3, 4].map((v) => h("button", { class: "sc" + (S.cs[f.id] === v ? " sel" : ""), onclick: (e) => { S.cs[f.id] = v; [...e.currentTarget.parentNode.children].forEach((b, i) => b.classList.toggle("sel", i === v)); touch(); }, title: f.anchors[v] }, h("b", {}, v), h("small", {}, f.anchors[v]))))));
  return sectionShell("2. Connected speech", I.CS_SCALE_HELP, null,
    h("div", { class: "sub-h" }, "Conversation (at least 3 minutes, ideally 5)"),
    h("div", { class: "row wrap" },
      h("select", { onchange: (e) => { info.topic = e.target.value; touch(); } }, h("option", { value: "" }, "Pick a topic…"), I.CS_TOPICS.map((t) => h("option", { value: t, selected: info.topic === t }, t))),
      h("button", { onclick: toggle }, "Start conversation timer"), clock),
    h("textarea", { rows: 4, placeholder: "Transcript or notes from the conversation sample", onchange: (e) => { info.sample = e.target.value; touch(); } }, info.sample),
    h("div", { class: "sub-h" }, "Stimulus card 1: 'What is happening here?'",
      h("button", { class: "mini", onclick: () => showImage(`f${form.n}-card1`) }, "Show card")),
    h("label", { class: "fld" }, `(a) ${form.card1[0]}`, h("input", { value: info.pic1, onchange: (e) => { info.pic1 = e.target.value; touch(); } })),
    h("label", { class: "fld" }, `(b) ${form.card1[1]}`, h("input", { value: info.pic2, onchange: (e) => { info.pic2 = e.target.value; touch(); } })),
    h("div", { class: "sub-h" }, "If no sample was possible"),
    h("div", { class: "chks" }, I.CS_NOT_POSSIBLE.map(([k, l]) => h("label", { class: "chk" }, h("input", { type: "checkbox", checked: !!S.csNotPossible[k], onchange: (e) => { S.csNotPossible[k] = e.target.checked; touch(); } }), " " + l))),
    h("div", { class: "sub-h" }, "Ratings (consider all connected speech produced during the evaluation; revise as it proceeds)"),
    feats);
}

function simpleSection(S, form, key, title, rubric, values, opts = {}) {
  return sectionShell(title, rubric, opts.extra, rulesBox(), form[key].map((it) => itemRow(S, it, values, { hint: opts.hint && opts.hint(it), cardBtn: opts.cardBtn && opts.cardBtn(it) })));
}

function stepSwc(S, form) {
  return simpleSection(S, form, "swc", "3. Word comprehension", I.RUBRICS.swc, [0, 1, 3, 4], {
    hint: (it) => `Related foils: ${it.foils}`,
    cardBtn: (it) => h("button", { class: "mini", onclick: () => showImage(`f${form.n}-${it.card}`) }, `Show ${it.card === "card2" ? "card 2" : "card 3"}`),
  });
}
function stepSc(S, form) {
  return simpleSection(S, form, "sc", "4. Sentence comprehension", I.RUBRICS.sc, [0, 1, 2, 3, 4], {
    hint: (it) => `Expected: ${it.key === "Y" ? "yes" : "no"}`,
    extra: h("div", { class: "row" }, h("button", { class: "mini", onclick: () => showImage(`f${form.n}-yesno`) }, "Show yes/no card")),
  });
}
function stepPn(S, form) {
  return simpleSection(S, form, "pn", "5. Picture naming", I.RUBRICS.pn, [0, 1, 2, 3, 4], {
    extra: h("div", { class: "row" }, h("button", { class: "mini", onclick: () => showImage(`f${form.n}-card5`) }, "Show card 5")),
  });
}
function stepRep(S, form) { return simpleSection(S, form, "rep", "6. Repetition", I.RUBRICS.rep, [0, 1, 2, 3, 4]); }
function stepRead(S, form) {
  return simpleSection(S, form, "read", "7. Reading aloud", I.RUBRICS.read, [0, 1, 2, 3, 4], {
    extra: h("div", { class: "row" }, h("button", { class: "mini", onclick: () => showReading(form) }, "Show reading card")),
  });
}

function stepMs(S) {
  const defs = I.MOTOR_DEFS.map((d) => h("div", { class: "item" },
    h("div", { class: "il" }, h("div", { class: "lab" }, d.label), h("div", { class: "hint" }, d.sub)),
    h("div", { class: "btns anchored" }, [0, 1, 2, 3, 4].map((v) => h("button", { class: "sc" + (S.ms[d.id] === v ? " sel" : ""), onclick: (e) => { S.ms[d.id] = v; [...e.currentTarget.parentNode.children].forEach((b, i) => b.classList.toggle("sel", i === v)); touch(); } }, h("b", {}, v), h("small", {}, ["severe", "marked", "moderate", "mild", "normal"][v]))))));
  return sectionShell("8. Motor speech", "Ask for (a), (c), (d) as quickly as possible; hold the vowel in (b) as long as possible (up to 15 s); counting at normal rate. Rate dysarthria and apraxia based on the whole evaluation.", null,
    I.MOTOR_TASKS.map((t, i) => h("div", { class: "item" }, h("div", { class: "il" }, h("div", { class: "lab" }, t)), h("div", { class: "ir" }, noteInput(S, S.msNotes, "t" + i, "text", "observation")))),
    h("div", { class: "sub-h" }, "Ratings"), defs);
}

// ---------------------------------------------------------------- SUMMARY
function stepSummary(S, form) {
  const { measures: m, missing, flags } = computeSummary(S);
  const complete = Object.values(m).every((v) => v != null);
  const bars = I.MEASURES.map(([k, label]) => h("div", { class: "bar" + (k === "QAB" ? " main" : "") },
    h("div", { class: "bl" }, label), h("div", { class: "bt" }, h("div", { class: "bf", style: `width:${m[k] == null ? 0 : m[k] * 10}%` }), k === "QAB" ? h("div", { class: "cut", style: `left:${APHASIA_CUTOFF * 10}%`, title: "cutoff 8.9" }) : null),
    h("div", { class: "bv" }, fmt(m[k]))));
  const prog = progress(S, form);
  const gaps = Object.entries(prog).filter(([, p]) => p.done < p.total).map(([k, p]) => `${STEPS.find((s) => s[0] === k)[1]} (${p.done}/${p.total})`);
  const interp = m.QAB == null ? null : h("div", { class: "interp" + (flags.includes("below-cutoff") ? " below" : "") },
    m.QAB < APHASIA_CUTOFF ? `QAB overall ${m.QAB.toFixed(2)} is below the 8.90 cutoff, which suggests aphasia (validation: sensitivity 0.91, specificity 0.95).` : `QAB overall ${m.QAB.toFixed(2)} is at or above the 8.90 cutoff.`,
    flags.includes("below-cutoff-dysarthria-caveat") ? h("div", { class: "warn-txt" }, "Caution: marked or severe dysarthria was rated. In the validation work, scores in this range could not be taken as indicative of aphasia when dysarthria was marked or severe.") : null,
    h("div", { class: "muted small" }, "Research and clinical-support tool. Not a diagnosis."));
  return h("section", { class: "card" }, h("h2", {}, "Summary"),
    !complete ? h("div", { class: "notice warn" }, "Some scores can't be calculated yet. Missing input: ", gaps.length ? gaps.join(", ") : "see subtests", ". Measures are never estimated; they stay blank until complete.") : null,
    h("div", { class: "bars" }, bars), interp,
    h("div", { class: "row wrap noprint" },
      S.status !== "complete" ? h("button", { class: "primary", onclick: async () => { S.status = "complete"; S.log.push({ t: new Date().toISOString(), a: "marked complete" }); touch(); await flush(); render(); } }, "Mark session complete")
        : h("button", { onclick: () => { S.status = "in-progress"; S._editLogged = true; S.log.push({ t: new Date().toISOString(), a: "reopened" }); touch(); render(); } }, "Reopen"),
      h("button", { onclick: () => window.print() }, "Print / save as PDF"),
      h("button", { onclick: () => download(`qab-${S.participant}-${S.date}.json`, JSON.stringify(S, null, 2), "application/json") }, "Export session (JSON)")),
    h("h3", {}, "Full record"), recordTable(S, form),
    h("p", { class: "muted small" }, `Scoring engine ${SCORING_VERSION}. Summary scores are recomputed from the item scores each time they are shown.`));
}

function recordTable(S, form) {
  const rows = [];
  const sect = (title) => rows.push(h("tr", { class: "sect" }, h("td", { colspan: 3 }, title)));
  const add = (label, r) => rows.push(h("tr", {}, h("td", {}, label), h("td", {}, r && r.score != null ? `${r.score}${r.nr ? " (NR)" : ""}${r.tag ? " " + r.tag : ""}` : "—"), h("td", {}, (r && r.text) || "")));
  if (!S.skipLoc) { sect("1 Level of consciousness"); I.LOC.forEach((x) => add(x.label, { score: S.loc[x.id]?.score, text: S.loc[x.id]?.note })); }
  sect("2 Connected speech"); I.CS_FEATURE_DEFS.forEach((f) => add(f.label, { score: S.cs[f.id] }));
  for (const [k, t] of [["swc", "3 Word comprehension"], ["sc", "4 Sentence comprehension"], ["pn", "5 Picture naming"], ["rep", "6 Repetition"], ["read", "7 Reading"]]) {
    sect(t); form[k].forEach((it) => add(it.label, S.responses[it.id]));
  }
  sect("8 Motor speech"); I.MOTOR_DEFS.forEach((d) => add(d.label, { score: S.ms[d.id] }));
  const meta = h("p", { class: "muted small" }, `Participant ${S.participant} · Form ${S.form} · Session ${S.sessionNo} · ${S.date} ${S.time} · Examiner: ${S.examiner || "—"}${S.scoredBy ? " · Scored by: " + S.scoredBy : ""} · ${S.location || ""}`);
  return h("div", {}, meta, h("table", { class: "tbl rec" }, h("tbody", {}, rows)), S.notes ? h("p", {}, h("b", {}, "Notes: "), S.notes) : null);
}

// ---------------------------------------------------------------- export / import
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function markBackup() { state.lastBackup = new Date().toISOString(); await db.setMeta("lastBackup", state.lastBackup); }
async function exportAllJSON() {
  download(`qab-backup-${today()}.json`, JSON.stringify({ app: "qab-local", version: APP_VERSION, exportedAt: new Date().toISOString(), sessions: state.sessions }, null, 2), "application/json");
  await markBackup(); render();
}
function csvCell(v) { const s = v == null ? "" : String(v); return /[",\n\r\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function exportCSV() {
  const cols = ["Participant", "Date", "Time", "Form", "Session", "Examiner", "Scored by", "Status", "WC", "SC", "WF", "GC", "SMP", "Rep", "Read", "QAB"];
  const itemCols = [];
  for (const [p, n] of [["swc", 8], ["sc", 12], ["pn", 6], ["rep", 6], ["read", 6]]) for (let i = 1; i <= n; i++) itemCols.push([`${p}_${i}`, `${p}${i}`]);
  const out = [[...cols, ...itemCols.flatMap(([c]) => [`${c}_response`, c]), ...CS_FEATURES.map((f) => "cs_" + f), "ms_dysarthria", "ms_apraxia_of_speech"].map(csvCell).join(",")];
  for (const S of state.sessions) {
    const { measures: m } = computeSummary(S);
    const sc = (r) => (r && r.score != null ? `${r.score}${r.nr ? "nr" : r.tag || ""}` : "");
    out.push([S.participant, S.date, S.time, S.form, S.sessionNo, S.examiner, S.scoredBy, S.status,
      ...["WC", "SC", "WF", "GC", "SMP", "Rep", "Read", "QAB"].map((k) => (m[k] == null ? "" : m[k].toFixed(2))),
      ...itemCols.flatMap(([c, id]) => [S.responses[id]?.text || "", sc(S.responses[id])]),
      ...CS_FEATURES.map((f) => S.cs[f] ?? ""), S.ms.dysarthria ?? "", S.ms.apraxia ?? ""].map(csvCell).join(","));
  }
  download(`qab-export-${today()}.csv`, "﻿" + out.join("\r\n"), "text/csv");
}
async function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data.sessions) ? data.sessions : data.id ? [data] : null;
    if (!list || !list.every((s) => s.id && s.participant && s.responses)) throw new Error("Not a QAB backup file");
    let added = 0, updated = 0;
    for (const s of list) {
      const ex = state.sessions.find((x) => x.id === s.id);
      if (ex && (ex.updatedAt || "") >= (s.updatedAt || "")) continue;
      await db.saveSession(s); ex ? updated++ : added++;
    }
    state.sessions = await db.allSessions();
    state.notice = `Imported: ${added} new, ${updated} updated.`;
  } catch (err) { state.notice = "Import failed: " + err.message; }
  render();
}
async function wipe() {
  if (!confirm("Erase ALL sessions on this device? This cannot be undone. Export a backup first if you need one.")) return;
  if (!confirm("Really erase everything?")) return;
  await db.wipeAll(); state.sessions = []; state.lastBackup = null; state.notice = "All local data erased."; render();
}

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStoragePut(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

// ---------------------------------------------------------------- boot
(async function boot() {
  state.persistent = await db.init();
  state.sessions = await db.allSessions();
  state.lastBackup = (await db.getMeta("lastBackup")) || null;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* ignore */ }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  render();
})();
