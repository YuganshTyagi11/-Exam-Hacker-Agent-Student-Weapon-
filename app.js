const pdfjsPromise = import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs");

const syllabusInput = document.getElementById("syllabusFiles");
const pastPaperInput = document.getElementById("pastPaperFiles");
const examDateInput = document.getElementById("examDate");
const hoursPerDayInput = document.getElementById("hoursPerDay");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const resultsSection = document.getElementById("results");
const importantTopicsList = document.getElementById("importantTopics");
const likelyQuestionsList = document.getElementById("likelyQuestions");
const studyPlanList = document.getElementById("studyPlan");

const stopWords = new Set([
  "the", "and", "or", "to", "of", "a", "an", "in", "for", "on", "at", "by", "with", "from", "is", "are", "was", "were", "be", "this", "that", "it", "as", "into", "how", "why", "when", "what", "which", "their", "its", "your", "you", "can", "could", "should", "will", "would", "about", "under", "between", "during", "using", "use", "used", "than", "then", "also", "such"
]);

analyzeBtn.addEventListener("click", async () => {
  const syllabusFiles = [...syllabusInput.files];
  const pastPaperFiles = [...pastPaperInput.files];

  if (!syllabusFiles.length || !pastPaperFiles.length) {
    setStatus("Please upload at least one syllabus file and one past paper file.");
    return;
  }

  toggleButton(true);

  try {
    setStatus("Reading files...");
    const [syllabusText, pastPaperText] = await Promise.all([
      parseFiles(syllabusFiles),
      parseFiles(pastPaperFiles)
    ]);

    setStatus("Analyzing topics and generating your exam strategy...");

    const importantTopics = getImportantTopics(syllabusText, pastPaperText);
    const likelyQuestions = getLikelyQuestions(pastPaperText, importantTopics);
    const studyPlan = buildStudyPlan(importantTopics, examDateInput.value, Number(hoursPerDayInput.value || 3));

    renderList(importantTopicsList, importantTopics);
    renderList(likelyQuestionsList, likelyQuestions, true);
    renderList(studyPlanList, studyPlan);

    resultsSection.classList.remove("hidden");
    setStatus("Done. Strategy generated using only free browser-side processing.");
  } catch (error) {
    console.error(error);
    setStatus(`Could not process one or more files: ${error.message}`);
  } finally {
    toggleButton(false);
  }
});

async function parseFiles(files) {
  const extracted = [];
  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (["txt", "md", "csv"].includes(ext)) {
      extracted.push(await file.text());
      continue;
    }

    if (ext === "pdf") {
      extracted.push(await extractPdfText(file));
      continue;
    }

    throw new Error(`Unsupported file type: ${file.name}. Use PDF, TXT, or MD.`);
  }

  return extracted.join("\n");
}

async function extractPdfText(file) {
  const pdfjs = await pdfjsPromise;
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs";

  const fileBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: fileBuffer });
  const pdf = await loadingTask.promise;

  const textChunks = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    textChunks.push(pageText);
  }

  return textChunks.join("\n");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function getImportantTopics(syllabusText, pastPaperText) {
  const syllabusTokens = tokenize(syllabusText);
  const paperTokens = tokenize(pastPaperText);

  const scores = new Map();

  scoreWords(syllabusTokens, 1.5, scores);
  scoreWords(paperTokens, 1, scores);

  const bigrams = countBigrams(syllabusTokens.concat(paperTokens));
  for (const [phrase, count] of bigrams.entries()) {
    if (count >= 2) {
      scores.set(phrase, (scores.get(phrase) || 0) + count * 1.1);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic]) => toTitle(topic));
}

function scoreWords(tokens, weight, map) {
  for (const token of tokens) {
    const current = map.get(token) || 0;
    map.set(token, current + weight);
  }
}

function countBigrams(tokens) {
  const map = new Map();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const first = tokens[i];
    const second = tokens[i + 1];
    if (stopWords.has(first) || stopWords.has(second)) {
      continue;
    }

    const phrase = `${first} ${second}`;
    map.set(phrase, (map.get(phrase) || 0) + 1);
  }
  return map;
}

function getLikelyQuestions(pastPaperText, topics) {
  const questionLines = pastPaperText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .filter((line) => /^\d+\)?[.)\-\s]|^(what|how|why|explain|discuss|compare|evaluate)\b/i.test(line));

  const cleaned = questionLines
    .slice(0, 10)
    .map((line) => line.replace(/^\d+\)?[.)\-\s]*/, ""));

  if (cleaned.length >= 5) {
    return cleaned.slice(0, 5);
  }

  const templates = [
    "Explain the core principles of {topic} with a practical example.",
    "Compare and contrast key methods used in {topic}.",
    "Discuss common mistakes students make in {topic} and how to avoid them.",
    "Evaluate the real-world importance of {topic}.",
    "How would you solve a typical exam problem based on {topic}?"
  ];

  const generated = templates.map((template, index) => {
    const topic = topics[index % topics.length] || "the syllabus";
    return template.replace("{topic}", topic);
  });

  return [...cleaned, ...generated].slice(0, 5);
}

function buildStudyPlan(topics, examDate, hoursPerDay) {
  const safeHours = Number.isFinite(hoursPerDay) ? Math.max(1, Math.min(16, hoursPerDay)) : 3;
  const daysLeft = getDaysLeft(examDate);
  const totalHours = daysLeft * safeHours;

  const plan = [
    `You have approximately ${daysLeft} days left and ${totalHours} focused study hours at ${safeHours}h/day.`,
    `Phase 1 (40% time): Build concepts for ${topics.slice(0, 4).join(", ") || "core topics"}.`,
    "Phase 2 (35% time): Solve topic-wise past paper questions under timed conditions.",
    "Phase 3 (20% time): Mixed mock tests + error log revision.",
    "Final 5%: Formula/facts sprint and high-yield question revision the day before exam."
  ];

  return plan;
}

function getDaysLeft(examDate) {
  if (!examDate) {
    return 28;
  }

  const now = new Date();
  const target = new Date(examDate);
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(7, diffDays);
}

function renderList(target, items, ordered = false) {
  target.innerHTML = "";
  if (ordered && target.tagName.toLowerCase() !== "ol") {
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function toTitle(text) {
  return text
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function setStatus(message) {
  statusText.textContent = message;
}

function toggleButton(disabled) {
  analyzeBtn.disabled = disabled;
  analyzeBtn.textContent = disabled ? "Processing..." : "Generate Strategy";
}
