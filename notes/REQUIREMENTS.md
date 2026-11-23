# QAB Local App: Requirements

Sources: the 5 PDFs, the 2 macro spreadsheets and the dataset in `Desktop/QAB App`, plus web research. Scoring formulas were checked against the 168-row dataset (details in section 4).

## 1. Scope

A local-first app for administering, scoring and storing the **Quick Aphasia Battery**: the standard QAB (Forms 1, 2, 3) and the **QAB-extended** (v2.43; Forms 1A, 2A, 3A). The standard forms are the PLOS ONE 2018 instrument (Wilson et al.). "Local storage" is read as "data never leaves the device".

## 2. Instrument structure

| # | Subtest | Items | Item scale | Feeds |
|---|---|---|---|---|
| 1 | Level of consciousness | a-h (approach, rouse, 3 orientation, 2 commands, overall) | 0-4, stop rules | none (gate only) |
| 2 | Connected speech | 10 ratings, 0-4, plus a "not possible" reason | 0-4 | WF, GC, overall |
| 3 | Word comprehension | 8 (4 semantic, 4 phonemic foils) | 0,1,3,4 | WC |
| 4 | Sentence comprehension | 12 yes/no | 0-4 | SC |
| 5 | Picture naming | 6 | 0-4 | WF |
| 6 | Repetition | 6 (4 words, 2 sentences) | 0-4 | Rep, GC |
| 7 | Reading aloud | 6 (4 words, 2 sentences) | 0-4 | Read, GC |
| 8 | Motor speech | tasks a-e (f in extended), plus dysarthria and apraxia ratings | 0-4 | SMP |

**Stop rules (Subtest 1).**
- (a) = 0, or (b) = 0 or 1: stop.
- (h) = 0, 1 or 2: stop.
- Subtest 1 can be skipped on follow-up visits. It contributes to no summary score.
- The orientation items have a follow-up yes/no/NR sequence when the free answer is wrong or absent. This needs fields for the wrong and correct distractors (place, month, age).

**Item-bank data to encode** (all in the score-sheet PDFs and macro sheets):
- Per form, 3 variants of: word-comprehension targets and related foils, 12 sentence questions with Y/N keys, naming targets, repetition and reading targets, and the card 1 sentences.
- Sentence items 4a/4b (Form 1: "man/woman"; Form 2: sitting/standing; Form 3: clothing color) need examiner-supplied fill-ins.
- Stimulus cards are image PDFs (QAB-cards 21 pp; extended 75 pp). They must be split into images and shown on a participant-facing screen or printed.

**Extended-only additions** (Forms 1A/2A/3A; the plain Forms 1-3 in the extended PDF are also v2.43):
- **3E / 4E:** extra word and sentence comprehension, using another form's items.
- **3W:** written word comprehension. Card shows the word with 3-4 pictures.
- **5W:** writing to dictation or description (3 words plus 1 sentence, 12 s window, score 0-4).
- **Picture naming cue:** if there is no response at 6 s, give the first two phonemes. Record whether the cue worked, as a "(c)" checkbox per item.
- Motor speech adds "(e) catastrophe catastrophe". Counting becomes item (f).
- Form A items reuse the other forms' words. The pairing is fixed: 1A uses 2/3 content, and so on.

## 3. Administration workflow

- **Examiner-facing screen:** one item at a time, with the verbatim prompt, the stimulus card thumbnail, the scoring key for that item, and score buttons limited to the valid values (0,1,3,4 for word comprehension; 0-4 for others).
- **Participant-facing screen** (second window or screen): the stimulus card, large. Yes/No thumbs card for non-verbal responders.
- **6-second response timer** per item (3 s "delayed" threshold marker). Restarts on a permitted repeat. Pressing a "delayed" or "repeated" tag should suggest the 3.
- **Per-item annotations:**
  - Transcript or response text (free text; IPA characters must work).
  - Response-type tag (see 4.3).
  - Repeated, delayed and self-corrected flags.
  - Optional audio note.
- **Connected speech:** conversation topic picker, a timer (≥3 min, ideally 5), a transcript box, ten rating controls with the anchor descriptions on screen, and the four "not possible" reasons.
- **Motor speech** ratings are made at the end, "based on the whole evaluation". Allow editing earlier ratings as the session proceeds, since the connected-speech ratings can also be revised.
- **Session metadata:** participant ID, date, time, location, examiner, form used, session number, optional scorer (for second-rater scoring), and a notes field.
- Pause, resume, abandon, and edit-after-the-fact (with an audit trail).
- **Form selection:** recommend a rotation (1→2→3) by prior sessions, since the forms are matched alternates. Block repeating a form for the same participant by default (allow override).

## 4. Scoring engine

Verified against the dataset: all 8 summary measures reproduce the published values within rounding for the 146 complete rows (QAB overall max diff 0.006).

### 4.1 Item rules
- Valid scores are 0-4. Word comprehension never uses 2. Subtest 1 follows its own rules.
- 3 is for correct-but-delayed (>3 s), self-corrected, or repeated. A 3 is also applied to a sentence with false starts or retracings.
- For naming, repetition and reading: 2 = at least half the phonemes (or words) are correct, or an apraxic attempt. The app can offer an optional edit-distance helper (see section 8).
- **No response (NR) imputation, found in the dataset and not in the paper:** items marked `0nr` count as the chance value, not 0. That is **2 for each sentence-comprehension item** and **1 for each word-comprehension item**. Other subtests count NR as 0. This matched 166/166 and 168/168 rows.

### 4.2 Summary measures (each 0-10)
```
WC   = max(0, sum(word comp, 8 items) - 8) / 24 * 10
SC   = max(0, sum(sentence comp, 12 items) - 24) / 24 * 10
WF   = 6*(sum naming / 24)  +  2*(anomia/4)
       + 2*( mean( min(empty,anomia), min(semantic,anomia), min(phonemic,anomia) ) / 4 )
GC   = 4*(agrammatism/4) + 2*(phrase length/4)
       + 2*(min(paragrammatism, agrammatism)/4)
       + 2*( (rep_e + rep_f + read_e + read_f) / 16 )
SMP  = apraxia of speech / 4 * 10
Rep  = sum(repetition, 6) / 24 * 10
Read = sum(reading, 6) / 24 * 10
QAB  = .18 WC + .18 SC + .14 WF + .14 GC + .08 SMP + .08 Rep + .08 Read
       + .08 * ((overall comm. impairment + 1) / 5 * 10)
       + .02 * (speech rate / 4 * 10) + .02 * (self-correction / 4 * 10)
```
Two details the paper leaves ambiguous or omits (both resolved from the dataset):
- **WF caps are applied to each of the three terms individually,** not to their average.
- **"Overall communication impairment"** is rescaled as (x+1)/5, not x/4, within QAB overall.

### 4.3 Response-type codes (from the dataset; meanings inferred, so confirm)
Suffixes: `nr` no response, `d` delayed, `r` repeated, `c` self-corrected, `p` phonemic, `n` neologism, `a` apraxic, `s` semantic, `cir` circumlocution, `u` unrelated, `f` false start/fragment, `m` morphological, `ag`/`pg` agrammatic/paragrammatic sentence errors, `per` perseveration, `st` stereotypy. Only `nr` changes numeric scoring.

### 4.4 Missing data and interpretation
- If connected speech is "not possible", WF, GC and the connected-speech terms of QAB overall are undefined. The macro behavior is not documented. **Decision needed:** report partial scores with a clear "incomplete" flag rather than imputing.
- Interpretation: **QAB overall < 8.90 suggests aphasia** (sensitivity 0.91, specificity 0.95 in the validation sample). This is invalid or unreliable with marked or severe dysarthria: 4 of 5 non-aphasic acute patients with dysarthria scored below it. Show that caveat next to the cutoff.
- Reference distributions exist for acute stroke ± aphasia, chronic aphasia and healthy controls (dataset columns `Group`, `Days post stroke`, etc.). Percentile or "vs. group" bars are possible.
- Scores are clinical-research instruments. Display "not a diagnosis".

## 5. Data and storage

- **Entities:** Participant, Session (with form, examiner, timestamps, status), ItemResponse (item id, score, response type, transcript, flags, response time, audio ref), ConnectedSpeechRatings, SummaryScores (derived, recomputable), AuditLog, Settings.
- **Store raw item scores as the source of truth** and recompute summaries on the fly, so any scoring fix applies retroactively. Save a scoring-engine version with each computed result.
- **Longitudinal view:** per participant, trend lines of the 8 measures across sessions, with form and day-post-onset annotations.
- **Export / import:** CSV matching the published dataset's columns (so it can go straight into the researchers' analysis, and be tested against the 168 reference rows), JSON full backup, PDF/print of the filled score-sheet and a one-page summary report. Importing the published dataset is useful for validation and norms.
- **Backup is the user's responsibility with local-only storage.** Add an explicit export-reminder flow and an "unsaved backup" warning.

## 6. Privacy and security

Sources say HIPAA turns on whether a covered entity is involved. A purely local app that never transmits data may fall outside it, but that is a legal question to confirm with the organization's compliance contact. Practical baseline regardless:
- No network calls at runtime, with all assets bundled (also required for offline use at the bedside).
- Participant IDs by default, with names optional and off by default.
- Optional passcode with at-rest encryption (AES-GCM via Web Crypto). Caveat from the sources: in a browser, the key has nowhere safe to live except derived from the passcode, so encryption mainly protects against casual access.
- Auto-lock after inactivity, audit log, and a "wipe all data" control.
- Audio recordings (if included) are the highest-risk data. Keep them opt-in.

## 7. Platform recommendation

Open decision, with a recommended default:
- **Recommended: an offline-first web app (PWA)** using IndexedDB, with a bundled item bank and cards. It runs on a clinic laptop or iPad, needs no install, and supports a second window for the participant screen. Weakness: browsers can evict storage, so exports are essential, and iPad Safari storage limits apply.
- Alternative: Electron or Tauri desktop app with SQLite on disk. More durable and easier to back up, and better for audio. Costs an installer and updates.

Either choice should use the same scoring module, written as a pure, unit-tested function.

## 8. Testing and quality

- **Golden tests:** recompute all 8 summary measures for every complete row of `QAB-dataset.txt` (UTF-16 tab-separated) and require agreement to ±0.02. The analysis above already passes this.
- Unit tests for the stop rules, NR imputation, caps and missing-data paths.
- Reliability notes for the UI: only the first complete response is scored, one repetition is allowed, and a 6-second window applies. These should appear as always-visible rules.
- Optional helper: Levenshtein-based "half of the phonemes/words correct" suggestion. The phoneme version needs a pronunciation dictionary (e.g. CMUdict), so make it a word-level check for sentences first.

## 9. Licensing and attribution

- The 2018 paper is CC BY, and its test materials were published with it as supporting information. Attribution to Wilson et al. (2018), PLOS ONE 13(2): e0192773 is required.
- I could not find a license for the extended forms (v2.43) or the extended cards. Confirm with the authors before redistributing or bundling them in a shared app. This is fine for personal or clinic-internal use but should be checked before wider distribution.
- The TalkBank QAB corpus restricts its recordings and transcripts to aphasia research. This does not apply to the battery materials.

## 10. Open questions for you

1. **Who uses it, and where?** One clinician or a research team, and is a second (participant) screen needed?
2. **"Both" means standard + extended?** Should extended include all six forms (1,2,3,1A,2A,3A), and should 3E/4E/3W/5W feed into any summary score? The extended macro lists them as inputs but I could not read its formulas (the .xls only exposes cached values here), so they appear to be recorded but unscored. Can you confirm with the authors' current macro?
3. **Platform:** PWA (recommended) or desktop app?
4. **Audio recording and transcription** inside the app, or notes only?
5. **Identifiers:** research IDs only, or names and MRNs too (changes the privacy design)?
6. **Missing connected speech:** how should scores be reported when no sample was possible?
7. **Stimulus cards:** may I convert the card PDFs into bundled images?
8. **Other languages or populations** (e.g. PPA)? The paper notes validation only in post-stroke aphasia.

## Sources

- [Wilson et al. 2018, PLOS ONE (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5806902)
- [TalkBank QAB corpus](https://aphasia.talkbank.org/access/English/NonProtocol/QAB.html)
- [Adapted Chinese QAB validation](https://dovepress.com/emerging-validation-for-the-adapted-chinese-version-of-quick-aphasia-b-peer-reviewed-fulltext-article-JMDH)
- [WAB-R telehealth in PPA, AJSLP](https://pubs.asha.org/doi/10.1044/2021_AJSLP-21-00150)
- [Securely storing offline data in browsers (NHS Digital)](https://nhsdigital.github.io/manage-vaccinations-in-schools/rdoc/next/docs/secure-offline-storage_md.html)
- [HIPAA-compliant PWA guide](https://www.accountablehq.com/post/how-to-make-your-pwa-hipaa-compliant-a-practical-guide-and-checklist)
