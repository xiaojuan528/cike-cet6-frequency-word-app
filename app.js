const STORAGE_KEY = "cike-cet6-frequency-state-v1";
const LEVELS = ["全部", "高频", "中频", "低频"];
const LETTERS = ["A", "B", "C", "D"];

const ui = {
  studyView: document.querySelector("#study-view"),
  wrongView: document.querySelector("#wrong-view"),
  masteredView: document.querySelector("#mastered-view"),
  statsView: document.querySelector("#stats-view"),
  loadingState: document.querySelector("#loading-state"),
  wordCard: document.querySelector("#word-card"),
  studyComplete: document.querySelector("#study-complete"),
  wordLevel: document.querySelector("#word-level"),
  wordNumber: document.querySelector("#word-number"),
  wordText: document.querySelector("#word-text"),
  wordIpa: document.querySelector("#word-ipa"),
  wordPos: document.querySelector("#word-pos"),
  wordFrequency: document.querySelector("#word-frequency"),
  masteryProgress: document.querySelector("#mastery-progress"),
  options: document.querySelector("#options"),
  answerPanel: document.querySelector("#answer-panel"),
  answerIcon: document.querySelector("#answer-icon"),
  answerTitle: document.querySelector("#answer-title"),
  masteryMessage: document.querySelector("#mastery-message"),
  resultMeaning: document.querySelector("#result-meaning"),
  resultExample: document.querySelector("#result-example"),
  resultExampleZh: document.querySelector("#result-example-zh"),
  resultDefinition: document.querySelector("#result-definition"),
  definitionSource: document.querySelector("#definition-source"),
  resultFrequency: document.querySelector("#result-frequency"),
  resultForms: document.querySelector("#result-forms"),
  nextButton: document.querySelector("#next-button"),
  speakButton: document.querySelector("#speak-button"),
  segments: [...document.querySelectorAll(".segment")],
  navItems: [...document.querySelectorAll(".nav-item")],
  todayCount: document.querySelector("#today-count"),
  reviewLabel: document.querySelector("#review-label"),
  wrongHint: document.querySelector("#wrong-hint"),
  wrongSearch: document.querySelector("#wrong-search"),
  wrongList: document.querySelector("#wrong-list"),
  wrongEmpty: document.querySelector("#wrong-empty"),
  wrongTotal: document.querySelector("#wrong-total"),
  wrongBadge: document.querySelector("#wrong-badge"),
  masteredTotal: document.querySelector("#mastered-total"),
  masteredSearch: document.querySelector("#mastered-search"),
  masteredList: document.querySelector("#mastered-list"),
  masteredEmpty: document.querySelector("#mastered-empty"),
  viewMastered: document.querySelector("#view-mastered"),
  reviewWrong: document.querySelector("#review-wrong"),
  quickReview: document.querySelector("#quick-review"),
  resetProgress: document.querySelector("#reset-progress"),
  metricAttempts: document.querySelector("#metric-attempts"),
  metricAccuracy: document.querySelector("#metric-accuracy"),
  metricWrong: document.querySelector("#metric-wrong"),
  metricMastered: document.querySelector("#metric-mastered"),
  uniqueCount: document.querySelector("#unique-count"),
  progressHigh: document.querySelector("#progress-high"),
  progressMedium: document.querySelector("#progress-medium"),
  progressLow: document.querySelector("#progress-low"),
  progressHighText: document.querySelector("#progress-high-text"),
  progressMediumText: document.querySelector("#progress-medium-text"),
  progressLowText: document.querySelector("#progress-low-text"),
  topMistakes: document.querySelector("#top-mistakes"),
  topMistakesEmpty: document.querySelector("#top-mistakes-empty"),
  toast: document.querySelector("#toast"),
};

let words = [];
let wordMap = new Map();
let levelPools = new Map();
let levelPositionPools = new Map();
let currentQuestion = null;
let currentView = "study";
let toastTimer = null;
const questionDecks = new Map();

const defaultState = () => ({
  selectedLevel: "全部",
  wrongCounts: {},
  lastWrongAt: {},
  seenWords: {},
  mastery: {},
  attempts: 0,
  correct: 0,
  daily: {
    date: localDateKey(),
    count: 0,
    correct: 0,
  },
});

function loadState() {
  const defaults = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const state = {
      ...defaults,
      ...saved,
      daily: { ...defaults.daily, ...(saved.daily || {}) },
      wrongCounts: saved.wrongCounts || {},
      lastWrongAt: saved.lastWrongAt || {},
      seenWords: saved.seenWords || {},
      mastery: saved.mastery || {},
    };
    if (state.daily.date !== localDateKey()) {
      state.daily = { date: localDateKey(), count: 0, correct: 0 };
    }
    if (!LEVELS.includes(state.selectedLevel)) {
      state.selectedLevel = "全部";
    }
    return state;
  } catch {
    return defaults;
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      selectedLevel: state.selectedLevel,
      wrongCounts: state.wrongCounts,
      lastWrongAt: state.lastWrongAt,
      seenWords: state.seenWords,
      mastery: state.mastery,
      attempts: state.attempts,
      correct: state.correct,
      daily: state.daily,
    }),
  );
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2,
      },
    });
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1900);
}

function shortMeaning(value) {
  const cleaned = String(value || "")
    .replace(
      /^(?:n|v|adj|adv|prep|conj|pron|det|art|aux|num|int)\.\s*/i,
      "",
    )
    .replace(/【[^】]+】\s*/g, "")
    .replace(/（[^）]{18,}）/g, "")
    .replace(/\([^)]{18,}\)/g, "")
    .trim();
  const parts = cleaned
    .split(/[；;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  let result = parts[0] || cleaned;
  if (result.length < 8 && parts[1]) {
    result += `；${parts[1]}`;
  }
  if (result.length > 36) {
    result = `${result.slice(0, 33).replace(/[，、；\s]+$/, "")}…`;
  }
  return result;
}

function posKey(value) {
  return String(value || "")
    .toLowerCase()
    .split("/")[0]
    .trim()
    .replace("preposition", "prep")
    .replace("adverb", "adv")
    .replace("adjective", "adj")
    .replace("verb", "v")
    .replace("noun", "n");
}

function masteryRecord(id) {
  return state.mastery[id] || { streak: 0, masteredAt: 0 };
}

function isMastered(id) {
  return Boolean(masteryRecord(id).masteredAt);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sample(items, limit) {
  if (items.length <= limit) return shuffle(items);
  const picked = [];
  const used = new Set();
  while (picked.length < limit) {
    const index = Math.floor(Math.random() * items.length);
    if (!used.has(index)) {
      used.add(index);
      picked.push(items[index]);
    }
  }
  return picked;
}

function buildIndexes() {
  levelPools = new Map(LEVELS.map((level) => [level, []]));
  levelPositionPools = new Map();

  for (const word of words) {
    levelPools.get("全部").push(word);
    levelPools.get(word.level).push(word);
    const position = posKey(word.pos);
    const groupKey = `${word.level}|${position}`;
    if (!levelPositionPools.has(groupKey)) {
      levelPositionPools.set(groupKey, []);
    }
    levelPositionPools.get(groupKey).push(word);
  }
}

function getReviewWords(level = "全部") {
  return words.filter((word) => {
    if (state.wrongCounts[word.id] && level !== "全部" && word.level !== level) {
      return false;
    }
    return Boolean(state.wrongCounts[word.id]) && !isMastered(word.id);
  });
}

function buildQuestion(options = {}) {
  const { review = false, level = state.selectedLevel } = options;
  const pool = (review
    ? getReviewWords(level)
    : levelPools.get(level) || levelPools.get("全部")
  ).filter((word) => !isMastered(word.id));

  if (!pool || pool.length === 0) return null;
  const deckKey = `${review ? "review" : "study"}|${level}`;
  let deck = (questionDecks.get(deckKey) || []).filter((id) => {
    const candidate = wordMap.get(id);
    return (
      candidate &&
      !isMastered(id) &&
      (!review || Boolean(state.wrongCounts[id]))
    );
  });

  if (deck.length === 0) {
    deck = shuffle(pool.map((word) => word.id));
    if (
      deck.length > 1 &&
      currentQuestion &&
      deck[0] === currentQuestion.word.id
    ) {
      [deck[0], deck[1]] = [deck[1], deck[0]];
    }
  }

  const wordId = deck.shift();
  questionDecks.set(deckKey, deck);
  const word = wordMap.get(wordId);
  const correctMeaning = shortMeaning(word.meaning);
  const optionMeanings = [correctMeaning];
  const seenMeanings = new Set([correctMeaning]);
  const position = posKey(word.pos);
  const sameGroup = levelPositionPools.get(`${word.level}|${position}`) || [];
  const sameLevel = levelPools.get(word.level) || [];

  for (const candidate of sample(sameGroup, 70)) {
    if (optionMeanings.length >= 4) break;
    if (candidate.id === word.id) continue;
    const meaning = shortMeaning(candidate.meaning);
    if (seenMeanings.has(meaning)) continue;
    seenMeanings.add(meaning);
    optionMeanings.push(meaning);
  }

  for (const candidate of sample(sameLevel, 90)) {
    if (optionMeanings.length >= 4) break;
    const meaning = shortMeaning(candidate.meaning);
    if (seenMeanings.has(meaning)) continue;
    seenMeanings.add(meaning);
    optionMeanings.push(meaning);
  }

  const optionsList = shuffle(
    optionMeanings.map((meaning) => ({
      meaning,
      correct: meaning === correctMeaning,
    })),
  );
  return {
    word,
    options: optionsList,
    review,
    answered: false,
  };
}

function setNewQuestion(options = {}) {
  const next = buildQuestion(options);
  if (!next) {
    if (!options.review) {
      ui.wordCard.classList.add("hidden");
      ui.studyComplete.classList.remove("hidden");
      ui.studyComplete.querySelector("h3").textContent =
        "当前范围已全部掌握";
      ui.studyComplete.querySelector("p").textContent =
        "换一个级别继续，或查看已掌握词表。";
      refreshIcons();
    } else {
      ui.wordCard.classList.add("hidden");
      ui.studyComplete.classList.remove("hidden");
      ui.studyComplete.querySelector("h3").textContent =
        "当前范围错词已全部掌握";
      ui.studyComplete.querySelector("p").textContent =
        "可以继续学习，或查看已掌握词表。";
      refreshIcons();
    }
    return;
  }
  ui.studyComplete.classList.add("hidden");
  currentQuestion = next;
  currentQuestion.answered = false;
  renderQuestion();
  document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuestion() {
  if (!currentQuestion) return;
  const { word, options, review } = currentQuestion;
  ui.wordLevel.textContent = word.level;
  ui.wordLevel.classList.toggle("is-medium", word.level === "中频");
  ui.wordLevel.classList.toggle("is-low", word.level === "低频");
  ui.wordNumber.textContent = `第 ${state.attempts + 1} 题`;
  ui.wordText.textContent = word.word;
  ui.wordIpa.textContent = word.ipa;
  ui.wordPos.textContent = word.pos;
  ui.wordFrequency.textContent =
    `词频 #${word.rank} · 出现 ${word.occurrences} 次`;
  ui.reviewLabel.classList.toggle("hidden", !review);
  const previousWrongs = state.wrongCounts[word.id] || 0;
  ui.wrongHint.textContent = previousWrongs ? `曾错 ${previousWrongs} 次` : "";
  const mastery = masteryRecord(word.id);
  ui.masteryProgress.textContent = `${mastery.streak} / 3`;
  ui.masteryProgress.classList.toggle(
    "hidden",
    mastery.streak === 0 || Boolean(mastery.masteredAt),
  );
  ui.answerPanel.classList.add("hidden");
  ui.options.innerHTML = options
    .map(
      (option, index) => `
        <button class="option-button" type="button" data-option-index="${index}">
          <span class="option-letter">${LETTERS[index]}</span>
          <span class="option-text">${escapeHtml(option.meaning)}</span>
        </button>
      `,
    )
    .join("");
  ui.wordCard.classList.remove("is-new");
  void ui.wordCard.offsetWidth;
  ui.wordCard.classList.add("is-new");
  ui.wordCard.classList.remove("hidden");
  refreshIcons();
}

function answerQuestion(selectedIndex) {
  if (!currentQuestion || currentQuestion.answered) return;
  currentQuestion.answered = true;
  const selected = currentQuestion.options[selectedIndex];
  const correct = Boolean(selected?.correct);
  const word = currentQuestion.word;

  state.attempts += 1;
  state.seenWords[word.id] = true;
  state.daily.count += 1;
  const previousMastery = masteryRecord(word.id);
  let nextStreak = 0;
  let justMastered = false;
  if (correct) {
    state.correct += 1;
    state.daily.correct += 1;
    nextStreak = Math.min((previousMastery.streak || 0) + 1, 3);
    justMastered = nextStreak >= 3 && !previousMastery.masteredAt;
    state.mastery[word.id] = {
      streak: nextStreak,
      masteredAt: nextStreak >= 3 ? Date.now() : 0,
    };
  } else {
    state.wrongCounts[word.id] = (state.wrongCounts[word.id] || 0) + 1;
    state.lastWrongAt[word.id] = Date.now();
    state.mastery[word.id] = { streak: 0, masteredAt: 0 };
  }

  [...ui.options.children].forEach((button, index) => {
    button.disabled = true;
    if (currentQuestion.options[index].correct) {
      button.classList.add("is-correct");
    } else if (index === selectedIndex) {
      button.classList.add("is-wrong");
    }
  });

  ui.answerIcon.className = `answer-icon ${correct ? "correct" : "wrong"}`;
  ui.answerIcon.innerHTML = `<i data-lucide="${correct ? "check" : "x"}"></i>`;
  ui.answerTitle.textContent = justMastered
    ? "已掌握"
    : correct
      ? "回答正确"
      : "这次没答对";
  ui.masteryMessage.textContent = correct
    ? `连续答对 ${nextStreak} / 3${justMastered ? " · 已掌握" : ""}`
    : "连续答对 0 / 3 · 进度已重置";
  ui.resultMeaning.textContent = word.meaning;
  ui.resultExample.textContent = word.example;
  ui.resultExampleZh.textContent = word.exampleZh;
  ui.resultDefinition.textContent = word.definition;
  ui.definitionSource.textContent = word.definitionSource;
  ui.resultFrequency.textContent =
    `${word.coveredSets} / 18 套试卷出现过 · 词频排名 #${word.rank}`;
  ui.resultForms.textContent = word.forms;
  ui.answerPanel.classList.remove("hidden");

  saveState();
  updatePersistentUi();
  refreshIcons();
  if (justMastered) {
    questionDecks.clear();
    showToast("已掌握，后续不再出现");
  }
  setTimeout(() => {
    ui.answerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 60);
}

function updatePersistentUi() {
  const wrongEntries = getWrongEntries();
  const wrongCount = wrongEntries.length;
  ui.todayCount.textContent = String(state.daily.count);
  ui.wrongBadge.textContent = wrongCount > 99 ? "99+" : String(wrongCount);
  ui.wrongBadge.classList.toggle("hidden", wrongCount === 0);
  ui.wrongTotal.textContent = `${wrongCount} 个`;
  renderStats(wrongEntries);
  if (currentView === "wrong") renderWrongBook();
  if (currentView === "mastered") renderMastered();
}

function getWrongEntries() {
  return Object.entries(state.wrongCounts)
    .map(([id, count]) => ({
      word: wordMap.get(id),
      count,
      lastWrongAt: state.lastWrongAt[id] || 0,
      mastered: isMastered(id),
    }))
    .filter((entry) => entry.word && entry.count > 0)
    .sort((a, b) => b.count - a.count || b.lastWrongAt - a.lastWrongAt);
}

function getMasteredEntries() {
  return Object.entries(state.mastery)
    .map(([id, record]) => ({
      word: wordMap.get(id),
      streak: Number(record.streak || 0),
      masteredAt: Number(record.masteredAt || 0),
    }))
    .filter(
      (entry) => entry.word && entry.masteredAt && entry.streak >= 3,
    )
    .sort((a, b) => b.masteredAt - a.masteredAt);
}

function renderWrongBook() {
  const query = ui.wrongSearch.value.trim().toLowerCase();
  const entries = getWrongEntries().filter(({ word }) => {
    if (!query) return true;
    return (
      word.word.toLowerCase().includes(query) ||
      word.meaning.toLowerCase().includes(query)
    );
  });

  ui.wrongList.innerHTML = entries
    .map(
      ({ word, count }) => `
        <details class="wrong-item" data-id="${escapeHtml(word.id)}">
          <summary>
            <div class="wrong-word-line">
              <span class="level-chip ${word.level === "中频" ? "is-medium" : word.level === "低频" ? "is-low" : ""}">${word.level}</span>
              <strong>${escapeHtml(word.word)}</strong>
              ${isMastered(word.id) ? '<span class="mastery-chip">已掌握</span>' : ""}
            </div>
            <span class="wrong-count">错 ${count} 次</span>
            <p class="wrong-summary">${escapeHtml(shortMeaning(word.meaning))}</p>
          </summary>
          <div class="wrong-detail">
            <p class="ipa">${escapeHtml(word.ipa)}</p>
            <p class="wrong-summary">词频 #${word.rank} · 出现 ${word.occurrences} 次 · ${word.coveredSets}/18 套</p>
            <p>${escapeHtml(word.meaning)}</p>
            <p class="example-en">${escapeHtml(word.example)}</p>
            <p class="example-zh">${escapeHtml(word.exampleZh)}</p>
            <button class="danger-text-button" type="button" data-remove-id="${escapeHtml(word.id)}">
              <i data-lucide="x"></i>
              从错题本移除
            </button>
          </div>
        </details>
      `,
    )
    .join("");

  ui.wrongEmpty.classList.toggle("hidden", entries.length > 0);
  const emptyTitle = ui.wrongEmpty.querySelector("h3");
  const emptyCopy = ui.wrongEmpty.querySelector("p");
  if (entries.length === 0) {
    emptyTitle.textContent = query ? "没有匹配的错词" : "还没有错题";
    emptyCopy.textContent = query
      ? "换个单词或释义关键词试试。"
      : "答错的单词会自动收进这里。";
  }
  refreshIcons();
}

function renderMastered() {
  const query = ui.masteredSearch.value.trim().toLowerCase();
  const entries = getMasteredEntries();
  ui.masteredTotal.textContent = `${entries.length} 个`;
  const filtered = entries.filter(({ word }) => {
    if (!query) return true;
    return (
      word.word.toLowerCase().includes(query) ||
      word.meaning.toLowerCase().includes(query)
    );
  });

  ui.masteredList.innerHTML = filtered
    .map(
      ({ word }) => `
        <details class="wrong-item is-mastered" data-id="${escapeHtml(word.id)}">
          <summary>
            <div class="wrong-word-line">
              <span class="level-chip ${word.level === "中频" ? "is-medium" : word.level === "低频" ? "is-low" : ""}">${word.level}</span>
              <strong>${escapeHtml(word.word)}</strong>
              <span class="mastery-chip">3 / 3</span>
            </div>
            <p class="wrong-summary">${escapeHtml(shortMeaning(word.meaning))}</p>
          </summary>
          <div class="wrong-detail">
            <p class="ipa">${escapeHtml(word.ipa)}</p>
            <p class="wrong-summary">词频 #${word.rank} · 出现 ${word.occurrences} 次 · ${word.coveredSets}/18 套</p>
            <p>${escapeHtml(word.meaning)}</p>
            <p class="example-en">${escapeHtml(word.example)}</p>
            <p class="example-zh">${escapeHtml(word.exampleZh)}</p>
            <button class="compact-button restore-button" type="button" data-restore-id="${escapeHtml(word.id)}">
              <i data-lucide="rotate-ccw"></i>
              重新学习
            </button>
          </div>
        </details>
      `,
    )
    .join("");

  ui.masteredEmpty.classList.toggle("hidden", filtered.length > 0);
  const emptyTitle = ui.masteredEmpty.querySelector("h3");
  const emptyCopy = ui.masteredEmpty.querySelector("p");
  if (filtered.length === 0) {
    emptyTitle.textContent = query ? "没有匹配的已掌握词" : "还没有已掌握词";
    emptyCopy.textContent = query
      ? "换个单词或释义关键词试试。"
      : "连续答对同一个词 3 次后会出现在这里。";
  }
  refreshIcons();
}

function renderStats(wrongEntries = getWrongEntries()) {
  const accuracy = state.attempts
    ? Math.round((state.correct / state.attempts) * 100)
    : 0;
  ui.metricAttempts.textContent = String(state.attempts);
  ui.metricAccuracy.textContent = `${accuracy}%`;
  ui.metricWrong.textContent = String(wrongEntries.length);
  ui.metricMastered.textContent = String(getMasteredEntries().length);

  const seenIds = Object.keys(state.seenWords).filter(
    (id) => state.seenWords[id] && wordMap.has(id),
  );
  const highSeen = seenIds.filter((id) => wordMap.get(id).level === "高频").length;
  const mediumSeen = seenIds.filter((id) => wordMap.get(id).level === "中频").length;
  const lowSeen = seenIds.filter((id) => wordMap.get(id).level === "低频").length;
  const masteredEntries = getMasteredEntries();
  const highMastered = masteredEntries.filter(
    ({ word }) => word.level === "高频",
  ).length;
  const mediumMastered = masteredEntries.filter(
    ({ word }) => word.level === "中频",
  ).length;
  const lowMastered = masteredEntries.filter(
    ({ word }) => word.level === "低频",
  ).length;
  const highTotal = (levelPools.get("高频") || []).length;
  const mediumTotal = (levelPools.get("中频") || []).length;
  const lowTotal = (levelPools.get("低频") || []).length;
  ui.uniqueCount.textContent = `已练 ${seenIds.length} 词`;
  ui.progressHighText.textContent =
    `已练 ${highSeen}/${highTotal} · 掌握 ${highMastered}`;
  ui.progressMediumText.textContent =
    `已练 ${mediumSeen}/${mediumTotal} · 掌握 ${mediumMastered}`;
  ui.progressLowText.textContent =
    `已练 ${lowSeen}/${lowTotal} · 掌握 ${lowMastered}`;
  ui.progressHigh.style.width = `${highTotal ? Math.min(100, Math.max(1.5, (highMastered / highTotal) * 100)) : 0}%`;
  ui.progressMedium.style.width = `${mediumTotal ? Math.min(100, Math.max(1.5, (mediumMastered / mediumTotal) * 100)) : 0}%`;
  ui.progressLow.style.width = `${lowTotal ? Math.min(100, Math.max(1.5, (lowMastered / lowTotal) * 100)) : 0}%`;

  const top = wrongEntries.slice(0, 5);
  ui.topMistakes.innerHTML = top
    .map(
      ({ word, count }, index) => `
        <div class="mistake-row">
          <span class="mistake-rank">${index + 1}</span>
          <div class="mistake-word">
            <strong>${escapeHtml(word.word)}</strong>
            <span>${word.level} · #${word.rank} · 出现 ${word.occurrences} 次</span>
          </div>
          <span class="mistake-count">错 ${count} 次</span>
        </div>
      `,
    )
    .join("");
  ui.topMistakesEmpty.classList.toggle("hidden", top.length > 0);
}

function setView(view) {
  currentView = view;
  ui.studyView.classList.toggle("hidden", view !== "study");
  ui.wrongView.classList.toggle("hidden", view !== "wrong");
  ui.masteredView.classList.toggle("hidden", view !== "mastered");
  ui.statsView.classList.toggle("hidden", view !== "stats");
  ui.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  if (view === "wrong") renderWrongBook();
  if (view === "mastered") renderMastered();
  if (view === "stats") renderStats();
  document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
}

function startReview(level = "全部") {
  const reviewWords = getReviewWords(level);
  if (reviewWords.length === 0) {
    showToast("当前范围还没有错题");
    return;
  }
  if (level !== "全部") {
    state.selectedLevel = level;
  } else {
    state.selectedLevel = "全部";
  }
  syncLevelSegments();
  setNewQuestion({ review: true, level: state.selectedLevel });
  setView("study");
}

function syncLevelSegments() {
  ui.segments.forEach((segment) => {
    segment.classList.toggle(
      "active",
      segment.dataset.level === state.selectedLevel,
    );
  });
}

function speakCurrentWord() {
  const word = currentQuestion?.word.word;
  if (!word || !("speechSynthesis" in window)) {
    showToast("当前浏览器不支持朗读");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word.split("/")[0].trim());
  utterance.lang = "en-GB";
  utterance.rate = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function bindEvents() {
  ui.options.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option-index]");
    if (!button) return;
    answerQuestion(Number(button.dataset.optionIndex));
  });

  ui.nextButton.addEventListener("click", () => {
    setNewQuestion({
      review: Boolean(currentQuestion?.review),
      level: state.selectedLevel,
    });
  });

  ui.speakButton.addEventListener("click", speakCurrentWord);

  ui.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      state.selectedLevel = segment.dataset.level;
      saveState();
      syncLevelSegments();
      setNewQuestion({ review: false, level: state.selectedLevel });
    });
  });

  ui.navItems.forEach((item) => {
    item.addEventListener("click", () => setView(item.dataset.view));
  });

  ui.quickReview.addEventListener("click", () => startReview("全部"));
  ui.reviewWrong.addEventListener("click", () => startReview("全部"));
  ui.viewMastered.addEventListener("click", () => setView("mastered"));
  ui.wrongSearch.addEventListener("input", renderWrongBook);
  ui.masteredSearch.addEventListener("input", renderMastered);

  ui.wrongList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-id]");
    if (!removeButton) return;
    const id = removeButton.dataset.removeId;
    const word = wordMap.get(id);
    delete state.wrongCounts[id];
    delete state.lastWrongAt[id];
    saveState();
    updatePersistentUi();
    renderWrongBook();
    showToast(`${word?.word || "该词"}已移出错题本`);
  });

  ui.masteredList.addEventListener("click", (event) => {
    const restoreButton = event.target.closest("[data-restore-id]");
    if (!restoreButton) return;
    const id = restoreButton.dataset.restoreId;
    const word = wordMap.get(id);
    delete state.mastery[id];
    questionDecks.clear();
    saveState();
    updatePersistentUi();
    renderMastered();
    showToast(`${word?.word || "该词"}已重新加入学习`);
  });

  ui.resetProgress.addEventListener("click", () => {
    if (!window.confirm("清空所有答题记录和错题本？此操作无法撤销。")) return;
    state = defaultState();
    questionDecks.clear();
    saveState();
    syncLevelSegments();
    currentQuestion = null;
    setNewQuestion({ review: false, level: state.selectedLevel });
    updatePersistentUi();
    renderWrongBook();
    renderMastered();
    setView("study");
    showToast("学习记录已清空");
  });
}

async function initialize() {
  if (window.location.protocol === "file:") {
    ui.loadingState.innerHTML =
      "<p>请通过本地服务器打开应用，或使用下方提供的访问地址。</p>";
    return;
  }

  try {
    const response = await fetch("./data/words.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    words = await response.json();
    wordMap = new Map(words.map((word) => [word.id, word]));
    buildIndexes();
    syncLevelSegments();
    bindEvents();
    ui.loadingState.classList.add("hidden");
    setNewQuestion({ review: false, level: state.selectedLevel });
    updatePersistentUi();
    renderWrongBook();
    refreshIcons();
    registerServiceWorker();
  } catch (error) {
    ui.loadingState.innerHTML = `
      <p>词表加载失败</p>
      <button class="compact-button" type="button" onclick="location.reload()">重新加载</button>
    `;
    console.error(error);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

initialize();
