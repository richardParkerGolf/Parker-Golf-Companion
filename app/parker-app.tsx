"use client";

import { useEffect, useMemo, useState } from "react";
import { LessonRecord, listLessons, newLesson, saveLesson, syncLesson, SyncState } from "./offline-store";

type Category = { id: string; name: string; sortOrder: number };
type Curiosity = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  keywords: string;
  active: boolean;
  sortOrder: number;
};
type Exploration = { id: string; name: string; description: string };
type Task = {
  id: string;
  name: string;
  purpose: string;
  setup: string;
  instructions: string;
  observe: string;
  coachPrompts: string;
  reflection: string;
  estimatedMinutes: number;
  equipment: string;
  notes: string;
  active: boolean;
  taskType: string;
  source: string;
  taskStyle?: string;
  difficulty?: string;
  environment?: string;
  ballOutcome?: string;
};
type Link = { leftId: string; rightId: string; sortOrder: number };
type CoachingQuestion = { stage: string; questionSet: string; question: string; active: boolean; sortOrder: number };
type LessonField = { stage: string; fieldKey: string; label: string; placeholder: string; active: boolean; sortOrder: number };
type ParkerData = {
  categories: Category[];
  curiosities: Curiosity[];
  explorations: Exploration[];
  tasks: Task[];
  curiosityExploration: Link[];
  explorationTask: Link[];
  questions: CoachingQuestion[];
  lessonFields: LessonField[];
};
type View =
  | { name: "home" }
  | { name: "lesson" }
  | { name: "curiosity"; id: string }
  | { name: "exploration"; id: string; curiosityId: string }
  | {
      name: "task";
      id: string;
      explorationId?: string;
      curiosityId?: string;
      returnTo?: "awareness" | "beginner";
    }
  | { name: "settings" };

type TaskFilters = {
  time: string;
  equipment: string;
  taskStyle: string;
  difficulty: string;
  environment: string;
  ballOutcome: string;
  source: string;
};

const emptyTaskFilters: TaskFilters = {
  time: "all",
  equipment: "all",
  taskStyle: "all",
  difficulty: "all",
  environment: "all",
  ballOutcome: "all",
  source: "all",
};

const sampleData: ParkerData = {
  categories: [
    { id: "cat-strike", name: "Strike", sortOrder: 1 },
    { id: "cat-flight", name: "Ball flight", sortOrder: 2 },
  ],
  curiosities: [
    {
      id: "cur-heel",
      categoryId: "cat-strike",
      name: "Heel strike",
      description: "Contact tending towards the heel or hosel.",
      keywords: "heel hosel shank crowded",
      active: true,
      sortOrder: 10,
    },
    {
      id: "cur-thin",
      categoryId: "cat-strike",
      name: "Thin contact",
      description: "Contact low on the face or above the equator of the ball.",
      keywords: "thin topped low face",
      active: true,
      sortOrder: 20,
    },
    {
      id: "cur-slice",
      categoryId: "cat-flight",
      name: "Slice",
      description: "Ball curving substantially to the right for a right-handed golfer.",
      keywords: "slice curve right fade",
      active: true,
      sortOrder: 30,
    },
  ],
  explorations: [
    {
      id: "exp-distance",
      name: "Distance from ball",
      description: "Explore how setup distance influences strike location.",
    },
    {
      id: "exp-low-point",
      name: "Low point",
      description: "Explore where the club reaches the bottom of its arc.",
    },
    {
      id: "exp-attention",
      name: "Attention",
      description: "Explore how the golfer’s focus changes the movement or outcome.",
    },
    {
      id: "exp-face-path",
      name: "Face and path",
      description: "Explore the relationship between start direction and curvature.",
    },
  ],
  tasks: [
    {
      id: "task-step-away",
      name: "Step away comparison",
      purpose: "Notice whether a small change in distance from the ball changes strike location.",
      setup: "Apply strike spray. Use the same club and target for both sets.",
      instructions:
        "Hit 5 shots from the normal setup.\nMove approximately ½ inch farther away.\nHit 5 more shots.\nCompare the two strike patterns.",
      observe: "Strike location and pattern. Quality of contact. Any change in ball flight.",
      coachPrompts: "What changed?\nWhere did the strike move?\nWhat stayed the same?",
      reflection: "What did this comparison make clearer?",
      estimatedMinutes: 5,
      equipment: "Strike spray",
      notes: "Keep the change small. The comparison matters more than finding a ‘correct’ distance.",
      active: true,
      taskType: "",
      source: "",
    },
    {
      id: "task-line",
      name: "Line in the sand",
      purpose: "Make low-point location visible without prescribing a swing change.",
      setup: "Draw a line on the ground. Place the ball just ahead of it, or begin without a ball.",
      instructions:
        "Make 5 swings with the intention of contacting the ground beyond the line.\nNotice the pattern.\nAdd a ball if useful and repeat.",
      observe: "Where the club contacts the ground relative to the line. Pattern rather than single shots.",
      coachPrompts: "Where did the club meet the ground?\nWhat helped the pattern change?",
      reflection: "What did the ground contact reveal?",
      estimatedMinutes: 4,
      equipment: "Club or alignment stick to mark a line",
      notes: "Useful as a benchmark: the task can always be completed and observed.",
      active: true,
      taskType: "",
      source: "",
    },
    {
      id: "task-external",
      name: "External target switch",
      purpose: "Compare strike and movement when attention shifts away from body mechanics.",
      setup: "Choose a precise, visible target. Establish the current strike pattern first.",
      instructions:
        "Hit 3 shots with normal attention.\nChoose a precise external target and describe the intended flight.\nHit 5 shots committed only to that intention.\nCompare.",
      observe: "Attention, strike pattern, freedom of movement and ball flight.",
      coachPrompts: "Where was your attention?\nWhat happened without trying to control it?",
      reflection: "Which focus produced the most useful information?",
      estimatedMinutes: 5,
      equipment: "None",
      notes: "Do not explain the expected effect first.",
      active: true,
      taskType: "Awareness",
      source: "",
    },
    {
      id: "task-start-curve",
      name: "Start and curve map",
      purpose: "Separate what the ball starts doing from how it curves.",
      setup: "Pick a clear start-line reference and a final target.",
      instructions:
        "Hit 5 shots.\nFor each shot, call the start direction first and curvature second.\nLook for the repeated pattern.",
      observe: "Start direction, curvature and strike location.",
      coachPrompts: "What repeated?\nWhich part changed most: start or curve?",
      reflection: "What is now worth exploring?",
      estimatedMinutes: 5,
      equipment: "Two alignment references if helpful",
      notes: "A reminder, not a diagnosis. Richard decides where to go next.",
      active: true,
      taskType: "",
      source: "",
    },
  ],
  curiosityExploration: [
    { leftId: "cur-heel", rightId: "exp-distance", sortOrder: 1 },
    { leftId: "cur-heel", rightId: "exp-low-point", sortOrder: 2 },
    { leftId: "cur-heel", rightId: "exp-attention", sortOrder: 3 },
    { leftId: "cur-thin", rightId: "exp-low-point", sortOrder: 1 },
    { leftId: "cur-thin", rightId: "exp-attention", sortOrder: 2 },
    { leftId: "cur-slice", rightId: "exp-face-path", sortOrder: 1 },
    { leftId: "cur-slice", rightId: "exp-attention", sortOrder: 2 },
  ],
  explorationTask: [
    { leftId: "exp-distance", rightId: "task-step-away", sortOrder: 1 },
    { leftId: "exp-low-point", rightId: "task-line", sortOrder: 1 },
    { leftId: "exp-attention", rightId: "task-external", sortOrder: 1 },
    { leftId: "exp-face-path", rightId: "task-start-curve", sortOrder: 1 },
  ],
  questions: [],
  lessonFields: [],
};

const CACHE_KEY = "parker-data-v1";
const API_KEY = "parker-api-url-v1";
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_PARKER_API_URL
  ?? "https://script.google.com/macros/s/AKfycbxi7F0_5pJLleJ1pKAed-3G5ihQDEjgy4it70HceiWMUp67TVEGUYh7fnWI_Wo1J4Bj/exec";

function splitLines(value: string) {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function Arrow() {
  return <span aria-hidden="true" className="arrow">→</span>;
}

function normalizedValues(value = "") {
  return value
    .split(/[,;/|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function taskFieldValues(
  task: Task,
  field: "taskStyle" | "difficulty" | "environment" | "ballOutcome",
) {
  const explicit = normalizedValues(task[field]);
  if (explicit.length) return explicit;

  const text = `${task.name} ${task.purpose} ${task.setup} ${task.instructions} ${task.observe} ${task.notes}`.toLowerCase();
  if (field === "taskStyle") {
    if (text.includes("exaggerat")) return ["exaggerate"];
    if (text.includes("contrast") || text.includes("compare")) return ["contrast"];
    if (/(calibrat|ladder|matrix|window)/.test(text)) return ["calibrate"];
    if (/(challenge|pressure|consequence)/.test(text)) return ["challenge"];
    return ["observe"];
  }
  if (field === "difficulty") {
    return (task.taskType || "").toLowerCase() === "beginner" ||
      (task.notes || "").toLowerCase().includes("beginner-friendly")
      ? ["easy"]
      : ["standard"];
  }
  if (field === "environment") {
    if (/(bunker|sand)/.test(text)) return ["bunker"];
    if (/(putt|practice green|hole|flagstick)/.test(text)) return ["practice green"];
    if (/(course|on-course|hole simulation)/.test(text)) return ["course"];
    if (/(indoor|simulator|mat)/.test(text)) return ["indoor"];
    return ["range"];
  }

  const outcomes: string[] = [];
  if (/(strike|contact|face location|heel|toe)/.test(text)) outcomes.push("strike");
  if (/(start direction|start line|start window|gate)/.test(text)) outcomes.push("start direction");
  if (/(curvature|curve|slice|hook|face.path|club path)/.test(text)) outcomes.push("curvature");
  if (/(trajectory|flight|launch|height)/.test(text)) outcomes.push("trajectory");
  if (/(distance|pace|carry|yardage|rollout)/.test(text)) outcomes.push("distance");
  return Array.from(new Set(outcomes));
}

function matchesTaskFilters(task: Task, filters: TaskFilters) {
  if (filters.time !== "all" && task.estimatedMinutes > Number(filters.time)) return false;

  const equipment = (task.equipment || "none").toLowerCase();
  if (filters.equipment === "none" && !["", "none", "no equipment"].includes(equipment)) return false;
  if (filters.equipment !== "all" && filters.equipment !== "none" && !equipment.includes(filters.equipment)) return false;

  const fieldMatches = (
    field: "taskStyle" | "difficulty" | "environment" | "ballOutcome",
    selected: string,
  ) => selected === "all" || taskFieldValues(task, field).includes(selected);

  return (
    fieldMatches("taskStyle", filters.taskStyle) &&
    fieldMatches("difficulty", filters.difficulty) &&
    fieldMatches("environment", filters.environment) &&
    fieldMatches("ballOutcome", filters.ballOutcome) &&
    (filters.source === "all" ||
      (filters.source === "parker" && !(task.source || "").trim()) ||
      (task.source || "").trim().toLowerCase() === filters.source)
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TaskFilterPanel({
  filters,
  onChange,
  onReset,
  options,
}: {
  filters: TaskFilters;
  onChange: (key: keyof TaskFilters, value: string) => void;
  onReset: () => void;
  options: {
    taskStyles: string[];
    difficulties: string[];
    environments: string[];
    ballOutcomes: string[];
    sources: string[];
  };
}) {
  return (
    <div className="filter-panel">
      <label>
        <span>Time</span>
        <select value={filters.time} onChange={(event) => onChange("time", event.target.value)}>
          <option value="all">Any</option>
          <option value="2">Up to 2 min</option>
          <option value="5">Up to 5 min</option>
          <option value="10">Up to 10 min</option>
        </select>
      </label>
      <label>
        <span>Equipment</span>
        <select value={filters.equipment} onChange={(event) => onChange("equipment", event.target.value)}>
          <option value="all">Any</option>
          <option value="none">None</option>
          <option value="tee">Tees</option>
          <option value="spray">Strike spray</option>
          <option value="alignment">Alignment aid</option>
          <option value="launch monitor">Launch monitor</option>
        </select>
      </label>
      {([
        ["taskStyle", "Task style", options.taskStyles],
        ["difficulty", "Difficulty", options.difficulties],
        ["environment", "Environment", options.environments],
        ["ballOutcome", "Ball outcome", options.ballOutcomes],
        ["source", "Source", options.sources],
      ] as Array<[keyof TaskFilters, string, string[]]>).map(([key, label, values]) => (
        <label key={key}>
          <span>{label}</span>
          <select value={filters[key]} onChange={(event) => onChange(key, event.target.value)}>
            <option value="all">Any</option>
            {values.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
          </select>
        </label>
      ))}
      <button className="reset-filters" onClick={onReset}>Clear filters</button>
    </div>
  );
}

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}

const questionBank: Record<string, string[]> = {
  listen: ["What have you noticed?", "What matters most about this to you?", "What would you like to understand better?"],
  explore: ["What else could be going on?", "What changes when you vary it?", "What are you curious to compare?"],
  experience: ["What do you notice now?", "What was different from what you expected?", "What would you like to try next?"],
  reflect: ["What is becoming clearer?", "What did the pattern show you?", "What did you learn about your own experience?"],
  transfer: ["Where might this be useful?", "How could you recognise this on the course?", "What will you take with you?"],
  takeaway: ["What is your takeaway, in your words?", "What do you want to remember?", "What would make this worth revisiting?"]
};
const stages = ["listen", "explore", "experience", "reflect", "transfer", "takeaway"] as const;

function LessonFlow({ lesson, questions, fields, onChange, questionOpen, setQuestionOpen, onClose }: { lesson: LessonRecord; questions: CoachingQuestion[]; fields: LessonField[]; onChange: (patch: Partial<LessonRecord>) => void; questionOpen: boolean; setQuestionOpen: (open: boolean) => void; onClose: () => void }) {
  const stage = lesson.stage as typeof stages[number];
  const index = Math.max(0, stages.indexOf(stage));
  const fieldFor: Record<string, keyof LessonRecord> = { listen: "theirWords", explore: "curiosity", experience: "task", reflect: "reflection", transfer: "transfer", takeaway: "takeaway" };
  const field = fieldFor[stage];
  const prompts = questions.filter((item) => item.active && item.stage === stage).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.question);
  const displayedPrompts = prompts.length ? prompts : questionBank[stage];
  const stageFields = fields.filter((item) => item.active && item.stage === stage).sort((a, b) => a.sortOrder - b.sortOrder);
  return <section className="lesson-view">
    <button className="back" onClick={onClose}>← Parker</button>
    <div className="lesson-heading"><p className="eyebrow">Live lesson · {lesson.syncState === "pending" ? "Sync pending" : "Saved on device"}</p><h1>Stay with<br />their experience.</h1><p>Questions are invitations. The golfer’s words lead.</p></div>
    <div className="stage-tabs">{stages.map((item, i) => <button key={item} className={item === stage ? "active" : i < index ? "done" : ""} onClick={() => onChange({ stage: item })}>{i + 1} {titleCase(item)}</button>)}</div>
    <label className="lesson-client">Client name<input value={lesson.client} onChange={(e) => onChange({ client: e.target.value })} placeholder="Who are you with?" /></label>
    <div className="lesson-card"><span className="card-index">0{index + 1}</span><h2>{titleCase(stage)}</h2>
      {stage === "listen" && <p className="lesson-hint">Capture their words as they say them. Keep the wording alive.</p>}
      {stage === "experience" && <div className="episode-grid"><label>Purpose<input value={lesson.purpose} onChange={(e) => onChange({ purpose: e.target.value })} /></label><label>Task<input value={lesson.task} onChange={(e) => onChange({ task: e.target.value })} /></label><label>Intention<input value={lesson.intention} onChange={(e) => onChange({ intention: e.target.value })} /></label><label>Feedback<input value={lesson.feedback} onChange={(e) => onChange({ feedback: e.target.value })} /></label><label>Boundary<input value={lesson.boundary} onChange={(e) => onChange({ boundary: e.target.value })} placeholder="Time or reps" /></label></div>}
      {stage !== "experience" && <textarea value={String(lesson[field] || "")} onChange={(e) => onChange({ [field]: e.target.value })} placeholder={stageFields.find((item) => item.fieldKey === field)?.placeholder || (stage === "listen" ? "Their words…" : "What emerged?")} rows={5} />}
      {stage === "experience" && <div className="episode-grid"><label>Reflection<input value={lesson.reflection} onChange={(e) => onChange({ reflection: e.target.value })} /></label><label>Discovery<input value={lesson.discovery} onChange={(e) => onChange({ discovery: e.target.value })} /></label></div>}
      <div className="question-tools"><button className="secondary-button" onClick={() => setQuestionOpen(!questionOpen)}>Question support</button>{questionOpen && <div className="prompt-list">{displayedPrompts.map((prompt) => <button key={prompt} onClick={() => onChange({ [field]: `${String(lesson[field] || "")}${lesson[field] ? "\n" : ""}${prompt} ` })}>“{prompt}”</button>)}</div>}</div>
      <div className="lesson-actions">{index > 0 && <button className="secondary-button" onClick={() => onChange({ stage: stages[index - 1] })}>Back</button>}{index < stages.length - 1 ? <button className="primary-button" onClick={() => onChange({ stage: stages[index + 1] })}>Continue →</button> : <button className="primary-button" onClick={onClose}>Finish lesson</button>}</div>
    </div>
    <div className="lesson-footer"><button onClick={() => onChange({ reps: lesson.reps + 1 })}>+ rep <strong>{lesson.reps}</strong></button><span>✓ {lesson.syncState === "pending" ? "Saved on device · Sync pending" : "Saved on device"}</span></div>
  </section>;
}

export function ParkerApp() {
  const [data, setData] = useState<ParkerData>(sampleData);
  const [view, setView] = useState<View>({ name: "home" });
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [libraryMode, setLibraryMode] = useState<"curiosities" | "awareness" | "beginner">("curiosities");
  const [selectedSource, setSelectedSource] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>(emptyTaskFilters);
  const [apiUrl, setApiUrl] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [syncState, setSyncState] = useState<"sample" | "cached" | "live" | "error">("sample");
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [questionOpen, setQuestionOpen] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem(API_KEY) || DEFAULT_API_URL;
    const cached = localStorage.getItem(CACHE_KEY);
    setApiUrl(savedUrl);
    setDraftUrl(savedUrl);
    if (cached) {
      try {
        setData(JSON.parse(cached));
        setSyncState("cached");
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
    if (savedUrl) void sync(savedUrl);
    void listLessons().then((items) => { setLessonCount(items.length); if (items[0]) setLesson(items[0]); });
  }, []);

  function updateLesson(patch: Partial<LessonRecord>) {
    if (!lesson) return;
    const next = { ...lesson, ...patch, updatedAt: new Date().toISOString(), syncState: "pending" as SyncState };
    setLesson(next);
    void saveLesson(next).then(async () => {
      setLessonCount((count) => Math.max(count, 1));
      if (navigator.onLine && apiUrl) {
        const synced = await syncLesson(next, apiUrl);
        if (synced) { const saved = { ...next, syncState: "synced" as SyncState }; setLesson(saved); await saveLesson(saved); }
      }
    });
  }

  function startLesson() { setLesson(newLesson()); setQuestionOpen(false); setView({ name: "lesson" }); }

  async function sync(url = apiUrl) {
    if (!url) return;
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error("Unable to load");
      const next = (await response.json()) as ParkerData;
      if (!next.curiosities || !next.tasks) throw new Error("Unexpected data");
      next.questions = Array.isArray(next.questions) ? next.questions : [];
      next.lessonFields = Array.isArray(next.lessonFields) ? next.lessonFields : [];
      setData(next);
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      setSyncState("live");
    } catch {
      setSyncState("error");
    }
  }

  const filterOptions = useMemo(() => {
    const unique = (field: keyof Pick<Task, "taskStyle" | "difficulty" | "environment" | "ballOutcome">, defaults: string[]) =>
      Array.from(new Set([
        ...defaults,
        ...data.tasks.flatMap((task) => taskFieldValues(task, field)),
      ])).sort((a, b) => a.localeCompare(b));

    return {
      taskStyles: unique("taskStyle", ["observe", "contrast", "calibrate", "exaggerate", "challenge"]),
      difficulties: unique("difficulty", ["easy", "standard", "hard"]),
      environments: unique("environment", ["range", "indoor", "practice green", "course", "bunker"]),
      ballOutcomes: unique("ballOutcome", ["strike", "start direction", "curvature", "trajectory", "distance"]),
      sources: Array.from(new Set([
        "parker",
        "shoemaker",
        "gallwey",
        "wgtf",
        ...data.tasks.map((task) => (task.source || "").trim().toLowerCase()).filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b)),
    };
  }, [data.tasks]);

  const filteredTaskIds = useMemo(
    () => new Set(data.tasks.filter((task) => task.active && matchesTaskFilters(task, taskFilters)).map((task) => task.id)),
    [data.tasks, taskFilters],
  );

  const activeFilterCount = Object.values(taskFilters).filter((value) => value !== "all").length;

  const explorationMatchesFilters = (explorationId: string) =>
    data.explorationTask.some((link) => link.leftId === explorationId && filteredTaskIds.has(link.rightId));

  const curiosityMatchesFilters = (curiosityId: string) =>
    data.curiosityExploration.some(
      (link) => link.leftId === curiosityId && explorationMatchesFilters(link.rightId),
    );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const categoryOrder = new Map(
      data.categories.map((category) => [category.id, category.sortOrder]),
    );
    const active = data.curiosities
      .filter(
        (item) => item.active && (selectedCategory === "all" || item.categoryId === selectedCategory),
      )
      .filter((item) => activeFilterCount === 0 || curiosityMatchesFilters(item.id))
      .filter(
        (item) =>
          !term ||
          `${item.name} ${item.keywords} ${item.description}`.toLowerCase().includes(term),
      );
    return active.sort((a, b) => {
      const categoryDifference =
        (categoryOrder.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER);
      if (categoryDifference) return categoryDifference;
      const aOrder = a.sortOrder || Number.MAX_SAFE_INTEGER;
      const bOrder = b.sortOrder || Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }, [data, query, selectedCategory, filteredTaskIds, activeFilterCount]);

  const directExplorationMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || libraryMode !== "curiosities") return [];
    return data.explorations.filter(
      (item) =>
        `${item.name} ${item.description}`.toLowerCase().includes(term) &&
        (activeFilterCount === 0 || explorationMatchesFilters(item.id)),
    );
  }, [data.explorations, data.explorationTask, query, libraryMode, filteredTaskIds, activeFilterCount]);

  const directTaskMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || libraryMode !== "curiosities") return [];
    return data.tasks.filter(
      (item) =>
        filteredTaskIds.has(item.id) &&
        `${item.name} ${item.purpose} ${item.instructions} ${item.notes}`.toLowerCase().includes(term),
    );
  }, [data.tasks, query, libraryMode, filteredTaskIds]);

  const areaOptions = useMemo(() => {
    const preferredOrder = ["cat-full-swing", "cat-short-game", "cat-putting", "cat-bunkers"];
    return data.categories
      .filter((category) => preferredOrder.includes(category.id))
      .sort((a, b) => preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id));
  }, [data.categories]);

  const awarenessTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.tasks
      .filter(
        (item) =>
          item.active &&
          filteredTaskIds.has(item.id) &&
          (item.taskType || "").toLowerCase() === "awareness" &&
          (selectedSource === "all" || (item.source || "").toLowerCase() === selectedSource),
      )
      .filter(
        (item) =>
          !term ||
          `${item.name} ${item.purpose} ${item.observe} ${item.source || ""}`
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.tasks, query, selectedSource, filteredTaskIds]);

  const beginnerTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.tasks
      .filter((item) => filteredTaskIds.has(item.id) && ((item.taskType || "").toLowerCase() === "beginner" || (item.notes || "").toLowerCase().includes("beginner-friendly")))
      .filter((item) => !term || `${item.name} ${item.purpose} ${item.observe} ${item.source || ""}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.tasks, query, filteredTaskIds]);

  const awarenessSources = useMemo(
    () =>
      Array.from(
        new Set(
          [
            "Shoemaker",
            "Gallwey",
            ...data.tasks
              .filter((item) => item.active && (item.taskType || "").toLowerCase() === "awareness")
              .map((item) => (item.source || "").trim())
              .filter(Boolean),
          ],
        ),
      ).sort((a, b) => {
        const preferred = ["Shoemaker", "Gallwey"];
        const aOrder = preferred.includes(a) ? preferred.indexOf(a) : preferred.length;
        const bOrder = preferred.includes(b) ? preferred.indexOf(b) : preferred.length;
        return aOrder - bOrder || a.localeCompare(b);
      }),
    [data.tasks],
  );

  const selectedAreaName =
    data.categories.find((category) => category.id === selectedCategory)?.name || "All areas";

  const categoryName = (id: string) =>
    data.categories.find((category) => category.id === id)?.name || "Curiosity";
  const curiosityId = view.name === "curiosity"
    ? view.id
    : view.name === "exploration" || view.name === "task"
      ? view.curiosityId
      : undefined;
  const explorationId = view.name === "exploration"
    ? view.id
    : view.name === "task"
      ? view.explorationId
      : undefined;
  const curiosity = curiosityId
    ? data.curiosities.find((item) => item.id === curiosityId)
    : undefined;
  const exploration = explorationId
    ? data.explorations.find((item) => item.id === explorationId)
    : undefined;
  const task = view.name === "task" ? data.tasks.find((item) => item.id === view.id) : undefined;

  function goHome() {
    setView({ name: "home" });
    setQuery("");
  }

  function updateTaskFilter(key: keyof TaskFilters, value: string) {
    setTaskFilters((current) => ({ ...current, [key]: value }));
  }

  const filterControls = (
    <div className="task-filter-controls">
      <button
        className={activeFilterCount ? "filter-toggle active" : "filter-toggle"}
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
      >
        Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
      </button>
      {filtersOpen && (
        <TaskFilterPanel
          filters={taskFilters}
          onChange={updateTaskFilter}
          onReset={() => setTaskFilters(emptyTaskFilters)}
          options={filterOptions}
        />
      )}
    </div>
  );

  return (
    <main className="app-shell">
      <ServiceWorkerRegister />
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="Parker home">
          <span className="brand-mark">P</span>
          <span>Parker</span>
        </button>
        <button className="settings-button" onClick={() => setView({ name: "settings" })}>
          {syncState === "live" ? "Library current" : syncState === "cached" ? "Library offline" : "Sample library"}
          <span aria-hidden="true">•••</span>
        </button>
      </header>

      {view.name === "home" && <button className="lesson-launch" onClick={startLesson}><span>+</span><strong>Start a lesson</strong><em>{lessonCount ? `${lessonCount} saved on this device` : "Listen first. Explore together."}</em></button>}

      {view.name === "lesson" && lesson && (
        <LessonFlow lesson={lesson} questions={data.questions} fields={data.lessonFields} onChange={updateLesson} questionOpen={questionOpen} setQuestionOpen={setQuestionOpen} onClose={goHome} />
      )}

      {view.name === "home" && (
        <section className="home-view">
          <div className="hero-copy">
            <p className="eyebrow">Coaching companion</p>
            <h1>What are you<br />curious about?</h1>
            <p className="intro">A quick route back to the tasks you already know.</p>
          </div>
          <div className="library-filter" aria-label="Choose library view">
            <button
              className={libraryMode === "curiosities" ? "active" : ""}
              onClick={() => {
                setLibraryMode("curiosities");
                setQuery("");
              }}
              aria-pressed={libraryMode === "curiosities"}
            >
              Curiosities
            </button>
            <button
              className={libraryMode === "awareness" ? "active" : ""}
              onClick={() => {
                setLibraryMode("awareness");
                setQuery("");
              }}
              aria-pressed={libraryMode === "awareness"}
            >
              Awareness exercises
            </button>
            <button
              className={libraryMode === "beginner" ? "active" : ""}
              onClick={() => {
                setLibraryMode("beginner");
                setQuery("");
              }}
              aria-pressed={libraryMode === "beginner"}
            >
              Beginner tasks
            </button>
          </div>
          {libraryMode === "curiosities" ? (
          <div className="area-filter" aria-label="Filter curiosities by area">
            <button
              className={selectedCategory === "all" ? "active" : ""}
              onClick={() => setSelectedCategory("all")}
              aria-pressed={selectedCategory === "all"}
            >
              All
            </button>
            {areaOptions.map((category) => (
              <button
                key={category.id}
                className={selectedCategory === category.id ? "active" : ""}
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
              >
                {category.name}
              </button>
            ))}
          </div>
          ) : (
            <div className="area-filter" aria-label="Filter awareness exercises by source">
              <button
                className={selectedSource === "all" ? "active" : ""}
                onClick={() => setSelectedSource("all")}
                aria-pressed={selectedSource === "all"}
              >
                All
              </button>
              {awarenessSources.map((source) => (
                <button
                  key={source}
                  className={selectedSource === source.toLowerCase() ? "active" : ""}
                  onClick={() => setSelectedSource(source.toLowerCase())}
                  aria-pressed={selectedSource === source.toLowerCase()}
                >
                  {source}
                </button>
              ))}
            </div>
          )}
          {libraryMode === "beginner" && (
            <div className="beginner-summary" role="status">
              <strong>Beginner-friendly tasks</strong>
              <span>Process first: completion means doing the attempts and noticing what happened. A particular result is never required.</span>
            </div>
          )}
          {filterControls}
          <div className="search-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  libraryMode === "awareness"
                    ? "Search awareness exercises…"
                    : libraryMode === "beginner"
                      ? "Search beginner tasks…"
                    : `Search ${selectedAreaName.toLowerCase()}…`
                }
                aria-label={libraryMode === "awareness" ? "Search awareness exercises" : libraryMode === "beginner" ? "Search beginner tasks" : "Search curiosities"}
              />
              {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
            </label>
            <div className="results-heading">
              <span>
                {query
                  ? "Matches"
                  : libraryMode === "awareness"
                    ? selectedSource === "all"
                      ? "Awareness exercises"
                      : awarenessSources.find((source) => source.toLowerCase() === selectedSource)
                  : libraryMode === "beginner"
                    ? "Beginner tasks"
                    : selectedAreaName}
              </span>
              <span>{libraryMode === "awareness" ? awarenessTasks.length : libraryMode === "beginner" ? beginnerTasks.length : results.length}</span>
            </div>
            <div className="result-list">
              {libraryMode === "curiosities" && results.map((item) => (
                <button
                  className="result-row"
                  key={item.id}
                  onClick={() => setView({ name: "curiosity", id: item.id })}
                >
                  <span>
                    <small>{categoryName(item.categoryId)}</small>
                    <strong>{item.name}</strong>
                    <em>{item.description}</em>
                  </span>
                  <Arrow />
                </button>
              ))}
              {libraryMode === "curiosities" && query.trim() && (directExplorationMatches.length > 0 || directTaskMatches.length > 0) && (
                <>
                  <div className="results-heading direct-heading"><span>Explorations and tasks</span><span>{directExplorationMatches.length + directTaskMatches.length}</span></div>
                  {directExplorationMatches.map((item) => {
                    const linkedCuriosityId = data.curiosityExploration.find((link) => link.rightId === item.id)?.leftId;
                    return (
                      <button className="result-row" key={`exploration-${item.id}`} onClick={() => linkedCuriosityId ? setView({ name: "exploration", id: item.id, curiosityId: linkedCuriosityId }) : undefined}>
                        <span><small>Exploration</small><strong>{item.name}</strong><em>{item.description}</em></span><Arrow />
                      </button>
                    );
                  })}
                  {directTaskMatches.map((item) => (
                    <button className="result-row" key={`task-${item.id}`} onClick={() => setView({ name: "task", id: item.id, returnTo: "beginner" })}>
                      <span><small>{item.taskType === "Beginner" ? "Beginner task" : "Task"}</small><strong>{item.name}</strong><em>{item.purpose}</em></span><Arrow />
                    </button>
                  ))}
                </>
              )}
              {libraryMode === "awareness" && awarenessTasks.map((item) => (
                <button
                  className="result-row"
                  key={item.id}
                  onClick={() => setView({ name: "task", id: item.id, returnTo: "awareness" })}
                >
                  <span>
                    <small>{item.source || "Awareness"}</small>
                    <strong>{item.name}</strong>
                    <em>{item.purpose}</em>
                  </span>
                  <Arrow />
                </button>
              ))}
              {libraryMode === "beginner" && beginnerTasks.map((item) => (
                <button
                  className="result-row"
                  key={item.id}
                  onClick={() => setView({ name: "task", id: item.id, returnTo: "beginner" })}
                >
                  <span>
                    <small>Beginner · {item.estimatedMinutes} min</small>
                    <strong>{item.name}</strong>
                    <em>{item.purpose}</em>
                  </span>
                  <Arrow />
                </button>
              ))}
              {((libraryMode === "curiosities" && !results.length && !directExplorationMatches.length && !directTaskMatches.length) ||
                (libraryMode === "awareness" && !awarenessTasks.length) ||
                (libraryMode === "beginner" && !beginnerTasks.length)) && (
                <div className="empty-state">
                  <strong>Nothing linked yet.</strong>
                  <span>
                    {libraryMode === "awareness"
                      ? "Try another phrase or source."
                      : libraryMode === "beginner"
                        ? "Try another phrase, or add a Beginner task in the library."
                        : "Try another phrase, or add this curiosity to the sheet."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {view.name === "curiosity" && curiosity && (
        <section className="detail-view">
          <button className="back" onClick={goHome}>← Search</button>
          <div className="detail-heading">
            <p className="eyebrow">{categoryName(curiosity.categoryId)} · Curiosity</p>
            <h1>{curiosity.name}</h1>
            <p>{curiosity.description}</p>
          </div>
          {filterControls}
          <div className="choice-block">
            <div className="section-label">
              <span>Possible explorations</span>
              <span>Choose with judgement</span>
            </div>
            {data.curiosityExploration
              .filter((link) => link.leftId === curiosity.id)
              .filter((link) => activeFilterCount === 0 || explorationMatchesFilters(link.rightId))
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((link, index) => {
                const item = data.explorations.find((entry) => entry.id === link.rightId);
                return item ? (
                  <button
                    className="choice-row"
                    key={item.id}
                    onClick={() => setView({ name: "exploration", id: item.id, curiosityId: curiosity.id })}
                  >
                    <span className="choice-number">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{item.name}</strong><em>{item.description}</em></span>
                    <Arrow />
                  </button>
                ) : null;
              })}
          </div>
        </section>
      )}

      {view.name === "exploration" && exploration && curiosity && (
        <section className="detail-view">
          <button className="back" onClick={() => setView({ name: "curiosity", id: curiosity.id })}>
            ← {curiosity.name}
          </button>
          <div className="detail-heading">
            <p className="eyebrow">Exploration</p>
            <h1>{exploration.name}</h1>
            <p>{exploration.description}</p>
          </div>
          {filterControls}
          <div className="choice-block">
            <div className="section-label">
              <span>Linked tasks</span>
              <span>Reminders, not recommendations</span>
            </div>
            {data.explorationTask
              .filter((link) => link.leftId === exploration.id)
              .filter((link) => filteredTaskIds.has(link.rightId))
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((link, index) => {
                const item = data.tasks.find((entry) => entry.id === link.rightId && entry.active);
                return item ? (
                  <button
                    className="choice-row task-choice"
                    key={item.id}
                    onClick={() => setView({
                      name: "task",
                      id: item.id,
                      explorationId: exploration.id,
                      curiosityId: curiosity.id,
                    })}
                  >
                    <span className="choice-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{item.name}</strong>
                      <em>{item.estimatedMinutes} min · {item.equipment || "No equipment"}</em>
                    </span>
                    <Arrow />
                  </button>
                ) : null;
              })}
          </div>
        </section>
      )}

      {view.name === "task" && task && (
        <section className="task-view">
          <button
            className="back"
            onClick={() => {
              if (view.returnTo === "awareness" || view.returnTo === "beginner") {
                setView({ name: "home" });
                return;
              }
              if (exploration && curiosity) {
                setView({ name: "exploration", id: exploration.id, curiosityId: curiosity.id });
              }
            }}
          >
            ← {view.returnTo === "awareness" ? "Awareness exercises" : view.returnTo === "beginner" ? "Beginner tasks" : exploration?.name}
          </button>
          <div className="task-hero">
            <p className="eyebrow">
              {(task.taskType || "").toLowerCase() === "awareness"
                ? `${task.source ? `${task.source} · ` : ""}Awareness exercise`
                : "Task reminder"}
            </p>
            <h1>{task.name}</h1>
            <div className="task-meta">
              <span>{task.estimatedMinutes} minutes</span>
              {task.equipment && <span>{task.equipment}</span>}
            </div>
          </div>
          <div className="task-grid">
            <article className="task-card purpose-card">
              <span className="card-index">01</span>
              <h2>Purpose</h2>
              <p>{task.purpose}</p>
            </article>
            <article className="task-card">
              <span className="card-index">02</span>
              <h2>Setup</h2>
              <p>{task.setup}</p>
            </article>
            <article className="task-card task-main">
              <span className="card-index">03</span>
              <h2>Task</h2>
              <ol>{splitLines(task.instructions).map((line) => <li key={line}>{line}</li>)}</ol>
            </article>
            <article className="task-card">
              <span className="card-index">04</span>
              <h2>Observe</h2>
              <p>{task.observe}</p>
            </article>
            <article className="task-card prompt-card">
              <span className="card-index">05</span>
              <h2>Coach prompts</h2>
              <ul>{splitLines(task.coachPrompts).map((line) => <li key={line}>“{line}”</li>)}</ul>
            </article>
            <article className="task-card">
              <span className="card-index">06</span>
              <h2>Reflection</h2>
              <p>{task.reflection}</p>
            </article>
            {task.notes && (
              <aside className="coach-note">
                <span>Private note</span>
                <p>{task.notes}</p>
              </aside>
            )}
          </div>
        </section>
      )}

      {view.name === "settings" && (
        <section className="settings-view">
          <button className="back" onClick={goHome}>← Parker</button>
          <div className="detail-heading">
            <p className="eyebrow">Library connection</p>
            <h1>Google Sheet</h1>
            <p>Paste the deployed Apps Script web app URL. Parker keeps the latest successful library on this device for offline use.</p>
          </div>
          <div className="connection-card">
            <label htmlFor="api-url">Apps Script web app URL</label>
            <input
              id="api-url"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec"
            />
            <div className="settings-actions">
              <button
                className="primary-button"
                onClick={() => {
                  const next = draftUrl.trim();
                  localStorage.setItem(API_KEY, next);
                  setApiUrl(next);
                  if (next) void sync(next);
                }}
              >
                Save & sync
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  localStorage.removeItem(API_KEY);
                  localStorage.removeItem(CACHE_KEY);
                  setApiUrl("");
                  setDraftUrl("");
                  setData(sampleData);
                  setSyncState("sample");
                }}
              >
                Use sample library
              </button>
            </div>
            {syncState === "live" && <p className="status success">Connected. This library is saved for offline use.</p>}
            {syncState === "error" && <p className="status error">Couldn’t refresh. The saved offline library is still available.</p>}
          </div>
          <div className="principle">
            <span>Parker’s role</span>
            <strong>The app remembers.<br />The coach thinks.</strong>
          </div>
        </section>
      )}
    </main>
  );
}
