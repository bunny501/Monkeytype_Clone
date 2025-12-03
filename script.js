import { monkeyWords } from "./word.js";
import { quotes } from "./quotes.js";
import { drawGraph } from "./results.js";

const textDisplay = document.getElementById("text");
const input = document.getElementById("input");
const startBtn = document.getElementById("start");
const caret = document.getElementById("caret");

const testScreen = document.getElementById("test-screen");
const resultsScreen = document.getElementById("results-screen");

let words = [];
let currentWord = 0;
let currentLetter = 0;

let maxTime = 60;
let timeLeft;
let interval;

let wpmHistory = [];
let elapsedSeconds = 0;

// Mode selection
let mode = "words"; // words or quotes
document.getElementById("wordMode").onclick = () => mode = "words";
document.getElementById("quoteMode").onclick = () => mode = "quotes";

// Time buttons
document.querySelectorAll(".mode").forEach(btn => {
  if (btn.dataset.time) {
    btn.onclick = () => {
      maxTime = parseInt(btn.dataset.time);
      document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  }
});

/* -------------------------------------
      SOUND SYSTEM (NO MP3 FILES)
-------------------------------------- */
function playTone(freq = 600, duration = 40) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.value = 0.08;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    setTimeout(() => osc.stop(), duration);
  } catch (err) {
    // ignore audio errors
  }
}

const keySound = () => playTone(500, 30);
const errorSound = () => playTone(200, 60);
const finishSound = () => playTone(1000, 150);

/* -------------------------------------
      WORD/QUOTE GENERATION
-------------------------------------- */

function randomWords(count = 100) {
  return Array.from({ length: count }, () =>
    monkeyWords[Math.floor(Math.random() * monkeyWords.length)]
  );
}

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)].split(" ");
}

/* -------------------------------------
      RENDER DISPLAY WORDS
-------------------------------------- */

function renderWords() {
  textDisplay.innerHTML = "";
  words.forEach(word => {
    const span = document.createElement("span");
    span.classList.add("word");
    span.innerHTML = word.split("").map(c => `<span>${c}</span>`).join("");
    textDisplay.appendChild(span);
    textDisplay.append(" ");
  });
}

/* -------------------------------------
      CARET POSITION
-------------------------------------- */

function updateCaret() {
  const active = textDisplay.children[currentWord];
  if (!active) return;

  const letters = active.querySelectorAll("span");
  const target = letters[currentLetter] || letters[letters.length - 1];

  const rect = target.getBoundingClientRect();
  const parent = textDisplay.getBoundingClientRect();

  caret.style.left = `${rect.left - parent.left}px`;
  caret.style.top = `${rect.top - parent.top}px`;
}

/* -------------------------------------
      LIVE CHARACTER COUNT
-------------------------------------- */

function computeLiveCharCounts() {
  const correct = document.querySelectorAll(".correct").length;
  const incorrect = document.querySelectorAll(".incorrect").length;
  return { correct, incorrect };
}

/* -------------------------------------
      INPUT LISTENER
-------------------------------------- */

input.addEventListener("input", () => {
  const active = textDisplay.children[currentWord];
  const letters = active.querySelectorAll("span");
  const typed = input.value;

  // Clear old classes
  letters.forEach(l => l.classList.remove("correct", "incorrect"));

  // Typing sounds
  if (typed.length > currentLetter) keySound();
  else keySound();

  // Match letters
  for (let i = 0; i < letters.length; i++) {
    if (!typed[i]) continue;

    if (typed[i] === letters[i].textContent) {
      letters[i].classList.add("correct");
    } else {
      letters[i].classList.add("incorrect");
      errorSound();
    }
  }

  currentLetter = typed.length;
  updateCaret();

  // Move to next word on space
  if (typed.endsWith(" ")) {
    input.value = "";
    currentLetter = 0;
    currentWord++;
    updateCaret();
    scrollToActiveWord();
  }
});

/* -------------------------------------
      SMOOTH SCROLL
-------------------------------------- */

function scrollToActiveWord() {
  textDisplay.children[currentWord]?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* -------------------------------------
         START TEST
-------------------------------------- */

function startTest() {
  words = mode === "words" ? randomWords() : randomQuote();

  currentWord = 0;
  currentLetter = 0;
  elapsedSeconds = 0;
  wpmHistory = [];

  renderWords();
  updateCaret();

  input.value = "";
  input.focus();

  timeLeft = maxTime;
  startBtn.textContent = `${timeLeft}s`;

  interval = setInterval(() => {
    timeLeft--;
    elapsedSeconds++;

    const { correct, incorrect } = computeLiveCharCounts();
    const mins = elapsedSeconds / 60;

    const net = Math.round((correct / 5) / mins);
    wpmHistory.push(net);

    startBtn.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) endTest();
  }, 1000);
}

startBtn.onclick = startTest;

/* -------------------------------------
         END TEST
-------------------------------------- */

function endTest() {
  clearInterval(interval);

  finishSound();

  const { correct, incorrect } = computeLiveCharCounts();
  const mins = maxTime / 60;

  const netWPM = Math.round((correct / 5) / mins);
  const rawWPM = Math.round(((correct + incorrect) / 5) / mins);
  const accuracy = correct + incorrect === 0 ? 0 : (correct / (correct + incorrect)) * 100;

  const consistency = computeConsistency(wpmHistory);
  const keystrokes = correct + incorrect;

  document.getElementById("wpm").textContent = netWPM;
  document.getElementById("raw").textContent = rawWPM;
  document.getElementById("accuracy").textContent = accuracy.toFixed(2) + "%";
  document.getElementById("consistency").textContent = consistency + "%";
  document.getElementById("chars").textContent = `${correct} correct / ${incorrect} incorrect`;
  document.getElementById("keystrokes").textContent = keystrokes;

  // Personal Best
  const oldPB = localStorage.getItem("pb") || 0;
  const newPB = Math.max(netWPM, oldPB);
  localStorage.setItem("pb", newPB);
  document.getElementById("pb").textContent = newPB;

  testScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  drawGraph(wpmHistory);
}

/* -------------------------------------
      CONSISTENCY CALCULATION
-------------------------------------- */

function computeConsistency(arr) {
  if (arr.length < 2) return 100;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length;
  const stddev = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round((1 - stddev / avg) * 100)));
}

/* -------------------------------------
      RESTART + THEME
-------------------------------------- */

document.getElementById("restart").onclick = () => location.reload();
document.getElementById("theme-toggle").onclick = () =>
  document.body.classList.toggle("dark");
