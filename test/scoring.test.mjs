import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeSummary, sessionFromDatasetRow, parseScoreString } from "../src/scoring.js";

// The published dataset (Wilson et al. 2018, S1 Dataset) is UTF-16LE, tab separated.
function loadDataset() {
  const text = new TextDecoder("utf-16le").decode(readFileSync(new URL("./fixtures/qab-dataset.txt", import.meta.url)));
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const head = lines[0].split("\t");
  return lines.slice(1).map((l) => Object.fromEntries(head.map((h, i) => [h, l.split("\t")[i] ?? ""])));
}

const COLS = { WC: "WC", SC: "SC", WF: "WF", GC: "GC", SMP: "SMP", Rep: "Rep", Read: "Read", QAB: "QAB" };

test("matches every complete row of the published dataset (±0.02)", () => {
  const rows = loadDataset();
  assert.ok(rows.length >= 160);
  let checked = 0;
  const bad = [];
  for (const row of rows) {
    const { measures } = computeSummary(sessionFromDatasetRow(row));
    for (const [k, col] of Object.entries(COLS)) {
      const theirs = parseFloat(row[col]);
      if (measures[k] == null || Number.isNaN(theirs)) continue; // incomplete input: skip
      checked++;
      if (Math.abs(measures[k] - theirs) > 0.02) bad.push(`${row.PID} ${k}: ${measures[k].toFixed(3)} vs ${theirs}`);
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(checked > 900, `only ${checked} comparisons`);
});

test("computes all 8 measures for at least 140 dataset rows", () => {
  const full = loadDataset().filter((r) => computeSummary(sessionFromDatasetRow(r)).measures.QAB != null);
  assert.ok(full.length >= 140, `got ${full.length}`);
});

test("no-response is imputed at chance for comprehension, 0 elsewhere", () => {
  const responses = {};
  for (let i = 1; i <= 8; i++) responses[`swc${i}`] = { score: 0, nr: true };
  for (let i = 1; i <= 12; i++) responses[`sc${i}`] = { score: 0, nr: true };
  const { measures } = computeSummary({ responses, cs: {}, ms: {} });
  assert.equal(measures.WC, 0); // 8 x 1 - 8 = 0
  assert.equal(measures.SC, 0); // 12 x 2 - 24 = 0
});

test("perfect performance scores 10 everywhere", () => {
  const responses = {};
  const add = (p, n) => { for (let i = 1; i <= n; i++) responses[`${p}${i}`] = { score: 4 }; };
  add("swc", 8); add("sc", 12); add("pn", 6); add("rep", 6); add("read", 6);
  const cs = Object.fromEntries(["phrase_length", "speech_rate", "agrammatism", "paragrammatism", "anomia", "empty_speech", "semantic_paraphasias", "phonemic_paraphasias", "self_correction", "overall"].map((k) => [k, 4]));
  const { measures, flags } = computeSummary({ responses, cs, ms: { apraxia: 4, dysarthria: 4 } });
  for (const v of Object.values(measures)) assert.ok(Math.abs(v - 10) < 1e-9);
  assert.deepEqual(flags, []);
});

test("incomplete input yields null, not a guess", () => {
  const { measures, missing } = computeSummary({ responses: { swc1: { score: 4 } }, cs: {}, ms: {} });
  assert.equal(measures.WC, null);
  assert.equal(measures.QAB, null);
  assert.ok(missing.QAB);
});

test("parseScoreString", () => {
  assert.deepEqual(parseScoreString("0nr"), { score: 0, nr: true, tag: "nr" });
  assert.deepEqual(parseScoreString("3r"), { score: 3, nr: false, tag: "r" });
  assert.equal(parseScoreString(""), null);
});
