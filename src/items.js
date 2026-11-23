// QAB item bank, standard Forms 1-3. Transcribed from the published score-sheets
// (Wilson et al. 2018, S1 Test materials). Item ids match scoring.js.

const L = "abcdefghijkl";

const WC = {
  1: [["lion", "giraffe, horse"], ["drum", "violin, trombone"], ["violin", "drum, trombone"], ["giraffe", "lion, horse"],
      ["bone", "boat"], ["kite", "coat"], ["boot", "boat"], ["goat", "coat"]],
  2: [["guitar", "saxophone, harp"], ["tiger", "zebra, donkey"], ["zebra", "tiger, donkey"], ["saxophone", "guitar, harp"],
      ["pear", "chair, hair"], ["crown", "clown"], ["cloud", "clown"], ["chair", "pear, hair"]],
  3: [["elephant", "camel, bear"], ["piano", "trumpet, cello"], ["camel", "elephant, bear"], ["trumpet", "piano, cello"],
      ["cat", "can"], ["box", "socks, fox"], ["cane", "can"], ["socks", "box, fox"]],
};

// [question, expected answer]
const SC = {
  1: [["Are you a [man/woman]?", "Y"], ["Am I a [man/woman]?", "N"], ["Do you cut the grass with an axe?", "N"],
      ["Are babies watched by babysitters?", "Y"], ["Do you open your door with a key?", "Y"],
      ["If you're about to leave, have you left yet?", "N"], ["Are witnesses questioned by police?", "Y"],
      ["If I tell you I used to smoke, do you think I smoke now?", "N"], ["Are doctors treated by patients?", "N"],
      ["If I was at the park when you arrived, did I get there first?", "Y"],
      ["If you're about to go upstairs, are you still downstairs?", "Y"], ["Are cats chased by mice?", "N"]],
  2: [["Are you [sitting/lying down/etc.]?", "Y"], ["Am I [sitting/standing/etc.]?", "N"],
      ["Do you eat ice cream with a spoon?", "Y"], ["Are spiders bitten by people?", "N"],
      ["Do you wear gloves on your feet?", "N"], ["If you're about to go outside, are you still inside?", "Y"],
      ["Are worms eaten by birds?", "Y"], ["If I tell you I used to exercise, do you think I exercise now?", "N"],
      ["Are babies delivered by doctors?", "Y"], ["If you're about to start, have you started yet?", "N"],
      ["Are parents raised by children?", "N"],
      ["If you were at the party when I arrived, did you get there first?", "Y"]],
  3: [["Am I wearing a [color] [shirt/dress]?", "Y"], ["Are you wearing a [color] [shirt/dress]?", "N"],
      ["Do you brush your teeth with a comb?", "N"], ["Are babies named by parents?", "Y"],
      ["Do you take pictures with a camera?", "Y"], ["If you're about to finish, have you finished yet?", "N"],
      ["Are people taxed by governments?", "Y"], ["If you're about to go inside, are you still outside?", "Y"],
      ["Are wolves attacked by deer?", "N"], ["If he was at the show when you arrived, did he get there first?", "Y"],
      ["Are thieves robbed by victims?", "N"],
      ["If I tell you I used to drink coffee, do you think I drink coffee now?", "N"]],
};

const PN = {
  1: ["dog", "pencil", "wheelchair", "octopus", "hammock", "escalator"],
  2: ["book", "comb", "mask", "volcano", "seahorse", "pyramid"],
  3: ["bed", "flower", "mushroom", "harmonica", "pelican", "stethoscope"],
};
const REP = {
  1: ["house", "breakfast", "catastrophe", "undetectable", "The sun rises in the East.",
      "The ambitious journalist discovered where we'd be going."],
  2: ["man", "blanket", "prosperity", "insignificant", "The dog barks at the door.",
      "The creative architect understood who we'd be seeing."],
  3: ["head", "brother", "proximity", "inconceivable", "The baby drinks from a bottle.",
      "The confident vocalist realized where we'd be staying."],
};
const READ = {
  1: ["tin", "dough", "proposition", "inexperienced", "The baby cries in the night.",
      "The popular novelist realized why I'd been calling."],
  2: ["pig", "choir", "graduation", "involuntary", "The sun sets in the West.",
      "The capable detective discovered why I'd been waiting."],
  3: ["pot", "cough", "prohibition", "unforgettable", "The dog sleeps on the floor.",
      "The ethical accountant understood why I'd been hiding."],
};
const CARD1 = {
  1: ["The boy is pushing the girl.", "The girl is chasing the boy."],
  2: ["The boy is washing the girl.", "The girl is kicking the boy."],
  3: ["The girl is pulling the boy.", "The boy is kissing the girl."],
};

export const FORMS = [1, 2, 3];

export function buildForm(n) {
  return {
    n,
    name: `Form ${n}`,
    card1: CARD1[n],
    swc: WC[n].map(([t, foils], i) => ({ id: `swc${i + 1}`, label: `(${L[i]}) ${t}`, target: t, foils, card: i < 4 ? "card2" : "card3" })),
    sc: SC[n].map(([q, key], i) => ({ id: `sc${i + 1}`, label: `(${L[i]}) ${q}`, key })),
    pn: PN[n].map((t, i) => ({ id: `pn${i + 1}`, label: `(${L[i]}) ${t}`, target: t })),
    rep: REP[n].map((t, i) => ({ id: `rep${i + 1}`, label: `(${L[i]}) ${t}`, target: t })),
    read: READ[n].map((t, i) => ({ id: `read${i + 1}`, label: `(${L[i]}) ${t}`, target: t })),
  };
}

// ---------- fixed text shared by all forms ----------

export const RULES = [
  "Allow 6 seconds to respond to each item. Correct responses after 3 seconds count as delayed and receive 3 points.",
  "Score the first complete response (not a false start, nor a fragment).",
  "Verbally presented items may be repeated once, if the patient requests or the examiner suspects mishearing. If repeated, restart the 6-second count.",
  "Dysarthric or apraxic errors not affecting the identity of any phonemes should be ignored, except when rating motor speech.",
];

export const LOC = [
  { id: "loc1", label: "(a) Is patient sufficiently clinically stable to be approached?", values: [0, 4], stop: [0],
    help: "4 = yes; 0 = no, based on prior discussion with nurse(s), doctor(s), etc." },
  { id: "loc2", label: "(b) Can patient be roused?", values: [0, 1, 2, 3, 4], stop: [0, 1],
    help: "4 = already awake or rouses to mild stimulation; 3 = moderate stimulation; 2 = rouses, but does not stay awake; 1 = some response but does not rouse; 0 = no response." },
  { id: "loc3", label: "(c) Can you tell me where we are right now?", values: [0, 1, 2, 3, 4], orient: true,
    follow: ["Are we in a library?", "Are we at a playground?", "Are we at [correct place]?"] },
  { id: "loc4", label: "(d) What month is it?", values: [0, 1, 2, 3, 4], orient: true,
    follow: ["Is it [wrong month]?", "Is it [wrong month]?", "Is it [correct month]?"] },
  { id: "loc5", label: "(e) How old are you?", values: [0, 1, 2, 3, 4], orient: true,
    follow: ["Are you [wrong age]?", "Are you [correct age]?", "Are you [wrong age]?"] },
  { id: "loc6", label: "(f) Close your eyes.", values: [0, 1, 3, 4], cmd: "If not done: model closing eyes, indicate to copy." },
  { id: "loc7", label: "(g) Squeeze my hand.", values: [0, 1, 3, 4], cmd: "If not done: squeeze patient's hand, indicate to copy." },
  { id: "loc8", label: "(h) Can patient stay awake, maintain attention, and attempt commands?", values: [0, 1, 2, 3, 4], stop: [0, 1, 2],
    help: "4 = yes; 3 = yes, with reservations (e.g. some lapses); 2 = on and off; 1 = marginally; 0 = not at all." },
];
export const ORIENT_HELP =
  "4 = an intelligible, correct answer (speech/language errors may be ignored); 3 = correct answers to all three yes/no questions; 2 = correct on 'yes' and 1 of 2 'no' questions; 1 = equivocal signs of understanding; 0 = no sign of understanding, or no response.";
export const CMD_HELP =
  "4 = follows verbal command; 3 = imitates action; 1 = equivocal attempt; 0 = no sign of understanding, or no response. Alternative simple commands may be substituted (note them).";

export const CS_TOPICS = [
  "the best trip you ever took", "the worst trip you ever took", "when you got married",
  "your favorite holiday as a child", "a happy childhood memory", "your first job",
  "your worst childhood memory", "when you had your first child", "how you met your husband/wife/partner",
  "when you retired", "what you like about where you live", "a time you were really scared/embarrassed/angry",
];

const SEV = ["severe", "marked", "moderate", "mild", "normal"];
export const CS_FEATURE_DEFS = [
  { id: "phrase_length", label: "Reduced length and complexity of utterances", anchors: ["single words", "MLU 2 words", "MLU 3-4 words", "MLU 5-7 words", "normal"] },
  { id: "speech_rate", label: "Reduced speech rate", anchors: ["0-24 wpm", "25-49 wpm", "50-74 wpm", "75-99 wpm", "100+ wpm"] },
  { id: "agrammatism", label: "Agrammatism", sub: "omission of words and morphemes, especially closed class; telegraphic speech", anchors: SEV },
  { id: "paragrammatism", label: "Paragrammatism", sub: "substitution of closed class items; inappropriate juxtaposition of words and phrases; garbled syntax", anchors: SEV },
  { id: "anomia", label: "Anomia", sub: "word-finding pauses, word-finding failures, abandoned utterances, effective circumlocution", anchors: SEV },
  { id: "empty_speech", label: "Empty speech", sub: "vague words, overabundance of closed class words, ineffective circumlocution, tangential", anchors: SEV },
  { id: "semantic_paraphasias", label: "Semantic paraphasias", sub: "substitution of open class items (including perseverations)", anchors: SEV },
  { id: "phonemic_paraphasias", label: "Phonemic paraphasias and neologisms", anchors: SEV },
  { id: "self_correction", label: "Self-correction", sub: "false starts, retraced sequences, conduite d'approche", anchors: SEV },
  { id: "overall", label: "Overall communication impairment",
    anchors: ["fragmentary; examiner carries burden", "limited; participant shares burden", "can discuss everyday topics; limited beyond that", "impairment evident, but can discuss all topics", "no impairment evident"] },
];
export const CS_SCALE_HELP =
  "4 = normal: not present or within normal range; 3 = mild: detectable but infrequent; 2 = moderate: frequent but not pervasive; 1 = marked: pervasive but not ubiquitous; 0 = severe: evident in most or all utterances.";
export const CS_NOT_POSSIBLE = [
  ["no_spontaneous", "No spontaneous speech"], ["muttering", "Only incomprehensible muttering"],
  ["stereotypies", "Only stereotypies"], ["lt10wpm", "Fewer than 10 wpm (mainly 'yes', 'no', a few single words or attempts)"],
];

export const MOTOR_TASKS = [
  "(a) tongue from side to side", "(b) aaaaaah (voice quality), up to 15 s", "(c) pʌ pʌ pʌ pʌ pʌ (rate/rhythm)",
  "(d) pʌtʌkʌ pʌtʌkʌ pʌtʌkʌ (rate/rhythm)", "(e) count to 10",
];
export const MOTOR_DEFS = [
  { id: "dysarthria", label: "Dysarthria", sub: "impairment of muscles used for speech production" },
  { id: "apraxia", label: "Apraxia of speech", sub: "impairment of speech motor planning" },
];

export const RUBRICS = {
  swc: "Say 'Show me the…'. 4 = correct; 3 = correct but delayed >3 s, self-corrected, or repeated; 1 = related foil; 0 = unrelated foil, or no response within 6 s.",
  sc: "Say 'Answer yes or no…'. 4 = correct (nods, shakes, 'sometimes', 'I don't think so' acceptable); 3 = correct but delayed >3 s, self-corrected, or repeated; 2 = idiosyncratic, unclear whether understood; 1 = incorrect but partial comprehension; 0 = incorrect / no response within 6 s.",
  pn: "Ask 'What is this? And this?'. 4 = correct (accept reasonable alternative labels); 3 = correct but delayed >3 s or self-corrected; 2 = at least half of the phonemes correct, or apraxic error on target; 1 = some relation to target; 0 = unrelated, or no response within 6 s.",
  rep: "Say 'Repeat after me.' 4 = correct (expanding contraction in (f) acceptable); 3 = correct but delayed >3 s, self-corrected, or repeated; 2 = (a-d) at least half of phonemes correct, or apraxic error; (e-f) at least half of words correct; 1 = some relation to target, 2+ words for (e) and (f); 0 = unrelated, or no response within 6 s.",
  read: "Say 'Read these words and sentences out loud.' Scored the same as Repetition: 4 correct; 3 delayed/self-corrected/repeated; 2 at least half correct or apraxic attempt; 1 some relation; 0 unrelated or no response.",
};

// Optional response-type tags (meaning inferred from the published dataset's codes).
export const TAGS = [
  ["", "no tag"], ["d", "delayed"], ["r", "repeated"], ["c", "self-corrected"], ["p", "phonemic"], ["n", "neologism"],
  ["a", "apraxic"], ["s", "semantic"], ["cir", "circumlocution"], ["f", "fragment/false start"],
  ["m", "morphological"], ["per", "perseveration"], ["u", "unrelated"],
];

export const MEASURES = [
  ["WC", "Word comprehension"], ["SC", "Sentence comprehension"], ["WF", "Word finding"],
  ["GC", "Grammatical construction"], ["SMP", "Speech motor programming"], ["Rep", "Repetition"],
  ["Read", "Reading"], ["QAB", "QAB overall"],
];
