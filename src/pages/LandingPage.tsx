import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Check,
  X,
  Zap,
  RefreshCw,
  Shield,
  MessageSquareHeart,
  CalendarDays,
  PenLine,
  CheckCircle2,
} from "lucide-react";
import { WordCard } from "@/components/search/WordCard";
import { FeedbackFAB, FeedbackFormBody } from "@/components/common/FeedbackFAB";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/db";

// ---------------------------------------------------------------------------
// Hardcoded demo data — no DB needed
// ---------------------------------------------------------------------------

const EPHEMERAL: Word = {
  word: "ephemeral",
  phonetics: [{ text: "/ɪˈfem.ər.əl/" }],
  meanings: [
    {
      partOfSpeech: "adjective",
      definitions: [
        {
          definition: "Lasting for a very short time; transitory and fleeting.",
          example:
            "The ephemeral beauty of cherry blossoms makes them all the more cherished.",
          synonyms: ["fleeting", "transient", "momentary"],
          antonyms: ["permanent", "eternal"],
        },
      ],
      synonyms: ["fleeting", "transient", "momentary", "short-lived"],
      antonyms: ["permanent", "eternal", "everlasting"],
    },
  ],
  sourceUrls: [],
  searchedAt: new Date(),
  reviewCount: 4,
  lastReviewedAt: new Date(),
  correctCount: 3,
  incorrectCount: 1,
  allSynonyms: ["fleeting", "transient", "momentary", "short-lived", "passing"],
  allAntonyms: ["permanent", "eternal", "everlasting", "enduring"],
  allExamples: [
    "The ephemeral beauty of cherry blossoms makes them all the more cherished.",
    "Social media fame is ephemeral — here today, forgotten tomorrow.",
  ],
  primaryDefinition: "Lasting for a very short time; transitory and fleeting.",
  primaryPartOfSpeech: "adjective",
  inBank: 1,
};

const SANGUINE: Word = {
  word: "sanguine",
  phonetics: [{ text: "/ˈsæŋ.ɡwɪn/" }],
  meanings: [
    {
      partOfSpeech: "adjective",
      definitions: [
        {
          definition: "Optimistic or positive, especially in a difficult situation.",
          example:
            "She remained sanguine about the project's chances despite early setbacks.",
          synonyms: ["optimistic", "hopeful", "positive"],
          antonyms: ["pessimistic", "despondent"],
        },
      ],
      synonyms: ["optimistic", "hopeful", "positive", "upbeat", "confident"],
      antonyms: ["pessimistic", "gloomy", "despondent"],
    },
  ],
  sourceUrls: [],
  searchedAt: new Date(),
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  allSynonyms: ["optimistic", "hopeful", "positive", "upbeat", "confident"],
  allAntonyms: ["pessimistic", "gloomy", "despondent", "cynical"],
  allExamples: [
    "She remained sanguine about the project's chances despite early setbacks.",
  ],
  primaryDefinition: "Optimistic or positive, especially in a difficult situation.",
  primaryPartOfSpeech: "adjective",
  inBank: 0,
};

const QUIZ_QUESTION = {
  word: SANGUINE,
  question: 'What does "sanguine" mean?',
  options: [
    "Optimistic or positive, especially in a difficult situation",
    "Overly critical and fault-finding",
    "Relating to ancient folklore and myth",
    "Extremely cautious and hesitant",
  ],
  correctIndex: 0,
};

const DEMO_DECKS = [
  { emoji: "🎓", title: "GRE Top 200", description: "High-frequency words tested on the GRE Verbal", count: 200, category: "Exam Prep" },
  { emoji: "🌏", title: "IELTS Essentials", description: "Core academic vocabulary for high band scores", count: 150, category: "Exam Prep" },
  { emoji: "📖", title: "TOEFL Advanced", description: "Sophisticated vocabulary for TOEFL Academic tasks", count: 120, category: "Exam Prep" },
  { emoji: "🇮🇳", title: "CUET Top 200", description: "Essential words for CUET English section", count: 200, category: "Exam Prep" },
  { emoji: "💼", title: "CAT & MBA", description: "Verbal ability words for CAT, XAT, SNAP", count: 180, category: "Exam Prep" },
  { emoji: "🌐", title: "Foreign Phrases", description: "Latin, French & German loanwords in everyday English", count: 80, category: "Lifestyle" },
];

const EXAMS = ["GRE", "GMAT", "IELTS", "TOEFL", "SAT", "CUET", "CAT", "XAT", "MBA", "SSC CGL", "Bank PO", "General Vocab"];

// ---------------------------------------------------------------------------
// Quiz demo — fully interactive, mirrors the real quiz UI
// ---------------------------------------------------------------------------

function QuizDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Question 3 / 10</span>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          meaning
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: answered ? "30%" : "25%" }}
        />
      </div>

      <p className="pt-1 text-base font-semibold text-foreground">
        {QUIZ_QUESTION.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {QUIZ_QUESTION.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = i === QUIZ_QUESTION.correctIndex;
          return (
            <button
              key={i}
              onClick={() => !answered && setSelected(i)}
              disabled={answered}
              className={cn(
                "w-full rounded-xl border p-3 text-left text-sm transition-all",
                !answered && "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                answered && isCorrect && "border-success bg-success/10 text-success",
                answered && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                answered && !isSelected && !isCorrect && "opacity-50"
              )}
            >
              <span className="mr-2 font-medium text-muted-foreground">
                {String.fromCharCode(65 + i)})
              </span>
              {option}
              {answered && isCorrect && <Check className="ml-1 inline h-3.5 w-3.5" />}
              {answered && isSelected && !isCorrect && <X className="ml-1 inline h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Word card shown after answering — same as real quiz */}
      {answered && (
        <div className="animate-[fade-up_0.25s_ease-out]">
          <WordCard word={QUIZ_QUESTION.word} compact />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {answered ? (
          <button
            onClick={() => setSelected(null)}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Next →
          </button>
        ) : (
          <p className="w-full text-center text-xs text-muted-foreground py-1">
            Tap an answer to see the result
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deck card demo — links to app
// ---------------------------------------------------------------------------

function DeckCardDemo({ emoji, title, description, count, category }: (typeof DEMO_DECKS)[0]) {
  return (
    <Link
      to="/home"
      className="group flex items-start gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            {category}
          </span>
          <span className="text-muted-foreground">{count} words</span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Feedback form — sends to ntfy.sh/vocabuild
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Feedback section — full-width landing page version
// ---------------------------------------------------------------------------

function FeedbackSection() {
  return (
    <section id="feedback" className="border-t px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <MessageSquareHeart className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Got a minute? Share your thoughts.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
            I read <span className="font-medium text-foreground">every single piece of feedback</span> personally.
            VocaBuild is a solo project and your input directly shapes what gets built next —
            whether it's a missing feature, a bug, or just something that felt off.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            If VocaBuild is helping you, the best thing you can do is{" "}
            <span className="font-medium text-foreground">tell a friend</span>. More users = more
            feedback = a better app for everyone.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            No account needed · Completely anonymous · Takes 30 seconds
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <FeedbackFormBody />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main landing page
// ---------------------------------------------------------------------------

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      <FeedbackFAB />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Voca<span className="text-primary">Build</span>
          </span>
          <Link
            to="/home"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open App
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16">
        {/* Lava-lamp blobs — spread at corners/edges, negative delays = instant motion */}
        {/* Top-left corner */}
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-96 w-96 rounded-full bg-primary/22 blur-3xl"
          style={{ animation: "lava-a 16s ease-in-out infinite -6s" }} />
        {/* Top-right corner */}
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-[26rem] w-[26rem] rounded-full bg-primary/18 blur-3xl"
          style={{ animation: "lava-b 18s ease-in-out infinite -11s" }} />
        {/* Bottom-left corner */}
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-12 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          style={{ animation: "lava-c 14s ease-in-out infinite -4s" }} />
        {/* Bottom-right corner */}
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-12 h-[22rem] w-[22rem] rounded-full bg-primary/16 blur-3xl"
          style={{ animation: "lava-a 19s ease-in-out infinite -9s" }} />
        {/* Left-center edge */}
        <div aria-hidden className="pointer-events-none absolute top-1/2 -left-20 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/24 blur-2xl"
          style={{ animation: "lava-b 12s ease-in-out infinite -3s" }} />
        {/* Right-center edge */}
        <div aria-hidden className="pointer-events-none absolute top-1/2 -right-20 h-56 w-56 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl"
          style={{ animation: "lava-c 15s ease-in-out infinite -7s" }} />
        {/* Center drifter */}
        <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/3 h-48 w-48 rounded-full bg-primary/14 blur-2xl"
          style={{ animation: "lava-a 13s ease-in-out infinite -5s" }} />

        <div className="relative mx-auto max-w-3xl text-center">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary"
            style={{ animation: "fade-up 0.5s ease-out both" }}
          >
            Free · Works offline · No account needed
          </div>

          <h1
            className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ animation: "fade-up 0.5s ease-out 0.1s both" }}
          >
            Build a vocabulary<br />
            <span className="text-primary">that opens doors</span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
            style={{ animation: "fade-up 0.5s ease-out 0.2s both" }}
          >
            Preparing for GRE, IELTS, TOEFL, CAT, or CUET? Or just want to
            speak and write with precision? VocaBuild helps you learn, quiz,
            and actually <em>remember</em> the words that matter.
          </p>

          <div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            style={{ animation: "fade-up 0.5s ease-out 0.3s both" }}
          >
            <Link
              to="/home"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Start Learning Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Feature strip ── */}
      <section className="border-y bg-muted/30 px-4 py-5">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: BookOpen, text: "Look up any word instantly" },
            { icon: Layers, text: "12 curated exam decks" },
            { icon: RefreshCw, text: "Spaced-repetition quizzes" },
            { icon: CalendarDays, text: "Daily quiz & sentence challenge" },
          ].map(({ icon: Icon, text }, i) => (
            <div
              key={text}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
              style={{ animation: `fade-up 0.4s ease-out ${0.05 * i}s both` }}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interactive demo ── */}
      <section id="demo" className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Try it right now
            </h2>
            <p className="mt-2 text-muted-foreground">
              These are real components from the app — not mockups.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {/* Word card — floats gently */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Word lookup
              </p>
              <div style={{ animation: "float 5s ease-in-out infinite" }}>
                <WordCard word={EPHEMERAL} compact />
              </div>
            </div>

            {/* Quiz demo */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quiz yourself
              </p>
              <QuizDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t bg-muted/20 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: BookOpen,
                step: "01",
                title: "Look up words",
                description: "Search any word to get definitions, examples, synonyms, antonyms, and pronunciation — powered by a free dictionary API.",
              },
              {
                icon: Layers,
                step: "02",
                title: "Study from decks",
                description: "Pick a pre-made deck for your exam (GRE, IELTS, CAT…) or create your own from a .txt file. Preview any word, bookmark what you want.",
              },
              {
                icon: RefreshCw,
                step: "03",
                title: "Review with SRS",
                description: "Answer correctly and the word comes back in a few days. Answer wrong and it resets. Mastered words graduate to monthly review.",
              },
            ].map(({ icon: Icon, step, title, description }) => (
              <div key={step} className="space-y-3 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary/60">{step}</span>
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily Habits section ── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              A little every day goes a long way
            </h2>
            <p className="mt-2 text-muted-foreground">
              Two daily habits that turn passive exposure into active memory.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Daily Quiz demo */}
            <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Daily Quiz</h3>
                  <p className="text-xs text-muted-foreground">5 words · ~2 minutes</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every day, get 5 practice words — a mix from your bank and new vocabulary.
                Quick, mixed-mode questions keep things sharp without taking over your morning.
              </p>
              {/* Static mockup */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Today's quiz</span>
                  <span className="text-xs font-medium text-primary">3 / 5</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-3/5 rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[true, true, true, false, null].map((correct, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex h-7 items-center justify-center rounded-lg text-xs font-medium",
                        correct === true && "bg-success/10 text-success",
                        correct === false && "bg-destructive/10 text-destructive",
                        correct === null && "bg-muted text-muted-foreground"
                      )}
                    >
                      {correct === true ? <Check className="h-3.5 w-3.5" /> : correct === false ? <X className="h-3.5 w-3.5" /> : "·"}
                    </div>
                  ))}
                  <div className="col-span-3 flex h-7 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    · · ·
                  </div>
                </div>
              </div>
            </div>

            {/* Use in Sentence demo */}
            <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                  <PenLine className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Use in a Sentence</h3>
                  <p className="text-xs text-muted-foreground">One word · daily challenge + cards</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every definition card has a sentence box. Write the word in context — use it, own it.
                A daily word challenge picks one word from your bank so you build a sentence log over time.
              </p>
              {/* Static mockup */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2.5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">ephemeral</p>
                  <p className="text-[11px] text-muted-foreground">adj. Lasting for a very short time.</p>
                </div>
                <div className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground/60">
                  The ephemeral nature of social media…
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved to your sentence log
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deck showcase ── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Ready-made decks
              </h2>
              <p className="mt-1 text-muted-foreground">
                Curated word lists — open the app and start studying immediately.
              </p>
            </div>
            <Link to="/home" className="shrink-0 text-sm font-medium text-primary hover:underline">
              See all 12 decks →
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_DECKS.map((deck) => (
              <DeckCardDemo key={deck.title} {...deck} />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">+ Create your own deck</span>
            {" "}— upload a .txt file with one word per line and VocaBuild looks up every word for you.
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="border-t bg-muted/20 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Built for every kind of vocab learner
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Whether you're targeting a competitive exam score or just want to stop
            reaching for the same five adjectives — VocaBuild adapts to your goal.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {EXAMS.map((exam, i) => (
              <span
                key={exam}
                className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                style={{ animation: `fade-up 0.3s ease-out ${0.03 * i}s both` }}
              >
                {exam}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy / offline callout ── */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-3">
            {[
              { icon: Shield, title: "100% private", description: "Everything is stored in your browser. No servers, no accounts, no tracking." },
              { icon: Zap, title: "Works offline", description: "Install as a PWA and use it anywhere — on the subway, in a library, without Wi-Fi." },
              { icon: RefreshCw, title: "Sync across devices", description: "Optionally back up and sync your word bank via a private GitHub Gist." },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden border-t bg-primary px-4 py-20 text-center text-primary-foreground">
        {/* Lava blobs in CTA — corners, negative delays = instant motion */}
        <div aria-hidden className="pointer-events-none absolute -top-12 -left-12 h-80 w-80 rounded-full bg-primary-foreground/12 blur-3xl"
          style={{ animation: "lava-a 15s ease-in-out infinite -5s" }} />
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl"
          style={{ animation: "lava-b 17s ease-in-out infinite -9s" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl"
          style={{ animation: "lava-c 13s ease-in-out infinite -3s" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-primary-foreground/12 blur-2xl"
          style={{ animation: "lava-a 16s ease-in-out infinite -7s" }} />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to build your vocabulary?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Free, private, and takes 10 seconds to start. No sign-up required.
          </p>
          <Link
            to="/home"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-8 py-4 text-sm font-bold text-primary shadow-lg transition-all hover:bg-primary-foreground/90 active:scale-[0.98]"
          >
            Start Learning Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-primary-foreground/60">
            No account · No credit card · Works on any device
          </p>
        </div>
      </section>

      {/* ── Feedback ── */}
      <FeedbackSection />

      {/* ── Footer ── */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        <p>
          VocaBuild · Built for serious learners ·{" "}
          <Link to="/home" className="underline underline-offset-2 hover:text-foreground">
            Open App
          </Link>
        </p>
      </footer>
    </div>
  );
}
