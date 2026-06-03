const TEAMS = [
  { id: "argentina", code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { id: "brasil", code: "BR", name: "Brasil", flag: "🇧🇷" },
  { id: "francia", code: "FRA", name: "Francia", flag: "🇫🇷" },
  { id: "alemania", code: "ALE", name: "Alemania", flag: "🇩🇪" },
  { id: "espana", code: "ESP", name: "España", flag: "🇪🇸" },
  { id: "inglaterra", code: "ING", name: "Inglaterra", flag: "🏴" },
  { id: "italia", code: "ITA", name: "Italia", flag: "🇮🇹" },
  { id: "portugal", code: "POR", name: "Portugal", flag: "🇵🇹" },
];

let QUESTIONS = [];

const ROUNDS = [
  { key: "octavos", label: "Octavos de Final", topic: "Ortografía" },
  { key: "cuartos", label: "Cuartos de Final", topic: "Tildes" },
  { key: "semis", label: "Semifinal", topic: "Signos de puntuación" },
  { key: "final", label: "Final", topic: "Sintaxis" },
];

const WIN_BY_ADVANTAGE = 2;
const MAX_GOALS = 5;

const app = document.querySelector("#app");
const fxLayer = document.querySelector("#fx-layer");

let state = freshState();
let loadingTimer = null;
let fireworksTimer = null;
let championAudio = null;

function freshState() {
  return {
    selectedTeam: null,
    bracket: null,
    usedUserOpponents: [],
    currentRoundIndex: 0,
    userScores: { user: 0, rival: 0 },
    totalScores: { correct: 0, wrong: 0 },
    questionIndex: 0,
    screen: "select",
    currentQuestion: null,
    answering: false,
    loading: null,
  };
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function randomScore(winnerFirst) {
  const loser = Math.floor(Math.random() * WIN_BY_ADVANTAGE);
  return winnerFirst ? [WIN_BY_ADVANTAGE, loser] : [loser, WIN_BY_ADVANTAGE];
}

function teamById(id) {
  return TEAMS.find((team) => team.id === id);
}

function flagStrip() {
  return TEAMS.map((team) => flagIcon(team, "mini")).join("");
}

function teamLabel(team) {
  return `${flagIcon(team, "inline")} ${team.name}`;
}

function flagIcon(team, size = "") {
  return `<span class="flag-icon flag-${team.id} ${size}" role="img" aria-label="${team.flag} ${team.name}" title="${team.flag} ${team.name}"></span>`;
}

function createBracket(selectedTeam) {
  const others = shuffle(TEAMS.filter((team) => team.id !== selectedTeam.id));
  const userOpponent = others[0];
  const rest = others.slice(1);
  const octavos = [
    { id: "o-user", round: 0, teams: [selectedTeam.id, userOpponent.id], score: null, winner: null, userMatch: true },
    { id: "o-1", round: 0, teams: [rest[0].id, rest[1].id], score: null, winner: null },
    { id: "o-2", round: 0, teams: [rest[2].id, rest[3].id], score: null, winner: null },
    { id: "o-3", round: 0, teams: [rest[4].id, rest[5].id], score: null, winner: null },
  ];

  octavos.forEach((match) => {
    if (!match.userMatch) simulateMatch(match);
  });

  const cuartos = [
    { id: "c-user", round: 1, teams: [selectedTeam.id, octavos[1].winner], score: null, winner: null, userMatch: true },
    { id: "c-1", round: 1, teams: [octavos[2].winner, octavos[3].winner], score: null, winner: null },
  ];
  simulateMatch(cuartos[1]);

  const otherSemiPool = shuffle(
    TEAMS.filter((team) => team.id !== selectedTeam.id && team.id !== cuartos[1].winner).map((team) => team.id),
  );
  const semis = [
    { id: "s-user", round: 2, teams: [selectedTeam.id, cuartos[1].winner], score: null, winner: null, userMatch: true },
    { id: "s-1", round: 2, teams: [otherSemiPool[0], otherSemiPool[1]], score: null, winner: null },
  ];
  simulateMatch(semis[1]);

  const final = [
    { id: "f-user", round: 3, teams: [selectedTeam.id, semis[1].winner], score: null, winner: null, userMatch: true },
  ];

  return [octavos, cuartos, semis, final];
}

function simulateMatch(match) {
  const winnerSlot = Math.random() > 0.5 ? 0 : 1;
  match.winner = match.teams[winnerSlot];
  match.score = randomScore(winnerSlot === 0);
}

function currentUserMatch() {
  return state.bracket[state.currentRoundIndex].find((match) => match.userMatch);
}

function currentRival() {
  const match = currentUserMatch();
  return teamById(match.teams.find((id) => id !== state.selectedTeam.id));
}

function render() {
  app.classList.toggle("final-stage-page", state.currentRoundIndex === 3);
  document.body.classList.toggle("dark-loss", state.screen === "eliminated");
  if (state.screen !== "loading") clearLoadingTimer();
  if (state.screen !== "champion") stopFireworks();

  if (state.screen === "select") renderSelect();
  if (state.screen === "loading") renderLoading();
  if (state.screen === "bracket") renderBracketScreen();
  if (state.screen === "transition") renderTransition();
  if (state.screen === "question") renderQuestion();
  if (state.screen === "eliminated") renderEliminated();
  if (state.screen === "champion") renderChampion();
}

function renderSelect() {
  app.innerHTML = `
    <section class="screen select-screen">
      <div class="select-head">
        <h1 class="brand">Mundial de<br />Lengua y Literatura</h1>
        <p class="subtitle">ET 12</p>
        <h2 class="select-title">Elegí tu equipo</h2>
      </div>
      <div class="team-grid">
        ${TEAMS.map(
          (team) => `
            <button class="team-card" type="button" data-team="${team.id}" aria-label="Representar a ${team.flag} ${team.name}">
              ${flagIcon(team, "large")}
              <span class="team-name">${team.name}</span>
            </button>
          `,
        ).join("")}
      </div>
    </section>
  `;

  app.querySelectorAll("[data-team]").forEach((button) => {
    button.addEventListener("click", () => selectTeam(button.dataset.team));
  });
}

function selectTeam(teamId) {
  state.selectedTeam = teamById(teamId);
  state.bracket = createBracket(state.selectedTeam);
  state.usedUserOpponents = [currentRival().id];
  state.currentRoundIndex = 0;
  showLoading({
    target: "bracket",
    delay: 3000,
    title: teamLabel(state.selectedTeam),
    copy: "Cargando",
  });
}

function renderLoading() {
  const loading = state.loading || {
    target: "bracket",
    delay: 1200,
    title: teamLabel(state.selectedTeam),
    copy: "Cargando",
    buttonText: "JUGAR",
    ready: true,
  };

  app.innerHTML = `
    <section class="screen loading-screen">
      <div class="loading-ball" aria-hidden="true"></div>
      <h2 class="loading-title">${loading.title}</h2>
      <p class="loading-copy${loading.copy === "Cargando" ? " is-loading" : ""}">${loading.copy}</p>
      <button class="bracket-play loading-play" type="button" id="loading-play-button" ${loading.ready ? "" : "disabled"}>
        ${loading.buttonText || "JUGAR"}
      </button>
    </section>
  `;

  if (!loading.ready) {
    scheduleLoadingReady(loading.delay);
  }

  document.querySelector("#loading-play-button").addEventListener("click", finishLoading);
}

function goToBracket() {
  showLoading({
    target: "bracket",
    delay: 1200,
    title: "Ganaste el partido",
    copy: "Cargando",
  });
}

function renderGameFrame(content, options = {}) {
  const finalClass = state.currentRoundIndex === 3 ? " final-stage" : "";
  if (options.bracket) {
    app.innerHTML = `
      <section class="screen game-layout">
        <aside class="panel bracket-panel">
          ${renderBracket()}
        </aside>
        <section class="panel stage-panel${finalClass}">
          ${content}
        </section>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="screen single-layout">
      <section class="panel stage-panel${finalClass}">
        ${content}
      </section>
    </section>
  `;
}

function renderBracketScreen() {
  app.innerHTML = `
    <section class="screen bracket-screen">
      ${renderBracket()}
    </section>
  `;

  const playButton = document.querySelector("#bracket-play-button");
  if (playButton) playButton.addEventListener("click", beginMatchLoading);
}

function renderBracket() {
  return `
    <div class="bracket-board">
      ${ROUNDS.map(
        (round, index) => `
          <div class="bracket-column round-${index}">
            <p class="round-title">${round.label.replace(" de ", "<br />de ")}</p>
            <p class="round-topic">Temática: ${round.topic}</p>
            <div class="match-list matches-${index}">
              ${state.bracket[index].map(renderMatch).join("")}
            </div>
          </div>
        `,
      ).join("")}
    </div>
  `;
}

function renderMatch(match) {
  const locked = match.round > state.currentRoundIndex;
  const classes = ["match"];
  if (locked) classes.push("locked");
  if (!locked && match.userMatch && match.round === state.currentRoundIndex) classes.push("user-match");
  if (!locked && match.userMatch && match.winner === state.selectedTeam.id) classes.push("won");
  if (!locked && match.winner && !match.userMatch) classes.push("simulated");
  const score = locked ? ["", ""] : match.score || ["", ""];
  const teams = locked ? [null, null] : match.teams;

  return `
    <div class="${classes.join(" ")}">
      ${teams.map((teamId, index) => renderSlot(teamId, score[index], locked)).join("")}
      ${!locked && match.userMatch && match.round === state.currentRoundIndex ? `
        <button class="bracket-play" type="button" id="bracket-play-button">¡JUGAR!</button>
      ` : ""}
    </div>
  `;
}

function renderSlot(teamId, score, locked = false) {
  if (!teamId) {
    return `
      <div class="slot">
        <span>${locked ? "" : "•"}</span>
        <span>${locked ? "Por definir" : "---"}</span>
        <span class="score-pill">-</span>
      </div>
    `;
  }

  const team = teamById(teamId);
  return `
    <div class="slot">
      <span>${flagIcon(team, "tiny")}</span>
      <span>${team.name}</span>
      <span class="score-pill">${score === "" || score === null || score === undefined ? "-" : score}</span>
    </div>
  `;
}

function renderTransition() {
  const rival = currentRival();
  const round = ROUNDS[state.currentRoundIndex];
  renderGameFrame(`
    <div class="stage-topic">Temática: ${round.topic}</div>
    <div class="stage-kicker">${round.label}</div>
    <div class="versus">
      <div class="versus-team">
        ${flagIcon(state.selectedTeam, "hero")}
        <strong>${teamLabel(state.selectedTeam)}</strong>
      </div>
      <div class="vs-mark">VS</div>
      <div class="versus-team">
        ${flagIcon(rival, "hero")}
        <strong>${teamLabel(rival)}</strong>
      </div>
    </div>
    <button class="primary-action" type="button" id="play-button">¡A jugar!</button>
  `);

  document.querySelector("#play-button").addEventListener("click", beginMatchLoading);
}

function showLoading({ target, delay, title, copy, buttonText = "JUGAR" }) {
  clearLoadingTimer();
  state.loading = {
    target,
    delay,
    title,
    copy,
    buttonText,
    ready: false,
  };
  state.screen = "loading";
  render();
}

function scheduleLoadingReady(delay) {
  clearLoadingTimer();
  loadingTimer = window.setTimeout(() => {
    if (state.screen !== "loading" || !state.loading) return;
    state.loading.ready = true;
    render();
  }, delay);
}

function clearLoadingTimer() {
  if (!loadingTimer) return;
  window.clearTimeout(loadingTimer);
  loadingTimer = null;
}

function finishLoading() {
  if (!state.loading?.ready) return;

  const target = state.loading.target;
  state.loading = null;

  if (target === "match") {
    playStartSound();
    startMatch();
    return;
  }

  state.screen = target;
  render();
}

function beginMatchLoading() {
  const rival = currentRival();
  const round = ROUNDS[state.currentRoundIndex];
  showLoading({
    target: "match",
    delay: 900,
    title: `${teamLabel(state.selectedTeam)} vs. ${teamLabel(rival)}`,
    copy: `Temática: ${round.topic}`,
  });
}

function startMatch() {
  state.userScores = { user: 0, rival: 0 };
  state.questionIndex = 0;
  state.currentQuestion = nextQuestion();
  state.screen = "question";
  render();
}

function nextQuestion() {
  const roundKey = ROUNDS[state.currentRoundIndex].key;
  const roundQuestions = QUESTIONS.filter((question) => question.partido === roundKey);
  const availableQuestions = roundQuestions.length ? roundQuestions : QUESTIONS;
  const question = availableQuestions[state.questionIndex % availableQuestions.length];
  state.questionIndex += 1;
  return question;
}

function renderQuestion() {
  const rival = currentRival();
  const question = state.currentQuestion;
  const round = ROUNDS[state.currentRoundIndex];
  renderGameFrame(`
    <div class="match-head">
      <div>
        <div class="stage-topic">Temática: ${round.topic}</div>
        <div class="stage-kicker">${round.label}</div>
        <h2 class="panel-title">${teamLabel(state.selectedTeam)} vs. ${teamLabel(rival)}</h2>
      </div>
      <div class="scoreboard" aria-label="Marcador del partido">
        <div class="score-team">${flagIcon(state.selectedTeam, "score")}<strong>${state.selectedTeam.name}</strong></div>
        <div class="score-number">${state.userScores.user} - ${state.userScores.rival}</div>
        <div class="score-team">${flagIcon(rival, "score")}<strong>${rival.name}</strong></div>
      </div>
    </div>
    <div class="question-box">
      <div class="question-count">${question.topico}</div>
      <p class="question-text">${question.text}</p>
      <div class="answer-grid">
        ${question.options.map(
          (option, index) => `
            <button class="answer" type="button" data-answer="${index}">
              <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
              <span>${option}</span>
            </button>
          `,
        ).join("")}
      </div>
      <p class="question-rule">Cada acierto es un gol, cada error es un gol en contra.</p>
    </div>
  `);

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(Number(button.dataset.answer)));
  });
}

function answerQuestion(answerIndex) {
  if (state.answering) return;

  state.answering = true;
  const isCorrect = answerIndex === state.currentQuestion.answer;

  if (isCorrect) {
    state.userScores.user += 1;
    state.totalScores.correct += 1;
    showGoal();
  } else {
    state.userScores.rival += 1;
    state.totalScores.wrong += 1;
    showMiss();
  }

  renderQuestion();

  window.setTimeout(() => {
    state.answering = false;
    if (state.userScores.rival >= MAX_GOALS) {
      loseTournament();
      return;
    }
    if (playerWonMatch()) {
      winCurrentMatch();
      return;
    }
    state.currentQuestion = nextQuestion();
    render();
  }, 880);
}

function winCurrentMatch() {
  const match = currentUserMatch();
  rememberNextOpponent();
  match.winner = state.selectedTeam.id;
  match.score = [state.userScores.user, state.userScores.rival];

  if (state.currentRoundIndex === 1) {
    state.bracket[2][0].teams[1] = state.bracket[1][1].winner;
  }

  if (state.currentRoundIndex === 2) {
    state.bracket[3][0].teams[1] = state.bracket[2][1].winner;
  }

  if (state.currentRoundIndex === 3) {
    state.screen = "champion";
    render();
    playChampionSound();
    fireworks(90);
    return;
  }

  state.currentRoundIndex += 1;
  goToBracket();
}

function playerWonMatch() {
  const advantage = state.userScores.user - state.userScores.rival;
  return advantage >= WIN_BY_ADVANTAGE || state.userScores.user >= MAX_GOALS;
}

function loseTournament() {
  const match = currentUserMatch();
  const rivalId = currentRival().id;
  match.winner = rivalId;
  match.score = [state.userScores.user, state.userScores.rival];
  state.screen = "eliminated";
  render();
}

function rememberNextOpponent() {
  const rival = currentRival();
  if (rival && !state.usedUserOpponents.includes(rival.id)) {
    state.usedUserOpponents.push(rival.id);
  }
}

function renderEliminated() {
  const rival = currentRival();
  app.innerHTML = `
    <section class="screen eliminated-screen">
      <div class="abandoned-ball" aria-hidden="true"></div>
      <div class="result-panel">
        <h2 class="result-title">${flagIcon(state.selectedTeam, "title")} Eliminado</h2>
        <p class="result-copy">${teamLabel(rival)} llegó a ${MAX_GOALS} tantos. El torneo se reinicia desde Octavos de Final.</p>
        <button class="primary-action" type="button" id="restart-button">Volver a jugar</button>
      </div>
    </section>
  `;

  document.querySelector("#restart-button").addEventListener("click", resetGame);
}

function renderChampion() {
  const championName = state.selectedTeam.name.toUpperCase();
  app.innerHTML = `
    <section class="screen champion-lock">
      <div class="champion-content">
        <div class="trophy">🏆</div>
        <div class="champion-flag">${flagIcon(state.selectedTeam, "champion")}</div>
        <h1 class="result-title">¡Campeón Mundial!</h1>
        <div class="champion-summary" aria-label="Resumen del torneo">
          <p>Preguntas acertadas: <strong>${state.totalScores.correct}</strong></p>
          <p>Preguntas erradas: <strong>${state.totalScores.wrong}</strong></p>
        </div>
        <p class="result-copy">${championName} CONQUISTÓ LA GRAN FINAL. FELICITACIONES.</p>
        <button class="primary-action champion-restart" type="button" id="restart-button">Jugar de nuevo</button>
      </div>
    </section>
  `;

  document.querySelector("#restart-button").addEventListener("click", resetGame);
}

function resetGame() {
  clearLoadingTimer();
  stopFireworks();
  stopChampionSound();
  state = freshState();
  render();
}

function showOverlay(text, className = "") {
  const node = document.createElement("div");
  node.className = `feedback show ${className}`;
  node.textContent = text;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 900);
}

function showGoal() {
  showOverlay("¡GOL!");
  confetti(80);
  playGoalSound();
}

function showMiss() {
  showOverlay("¡BUZZ!", "miss");
  document.body.classList.add("shake");
  playTone(120, 0.28, "sawtooth");
  window.setTimeout(() => document.body.classList.remove("shake"), 430);
}

function playStartSound() {
  const audio = new Audio("sounds/inicio.mp3");
  audio.volume = 0.9;
  audio.play().catch(() => {
    playStartTone();
  });
}

function playStartTone() {
  playTone(420, 0.12, "triangle");
  window.setTimeout(() => playTone(560, 0.12, "triangle"), 90);
  window.setTimeout(() => playTone(760, 0.18, "sine"), 180);
}

function playChampionSound() {
  stopChampionSound();
  championAudio = new Audio("sounds/CAMPEON.mp3");
  championAudio.volume = 0.9;
  championAudio.play().catch(() => {
    playTone(660, 0.16, "triangle");
    window.setTimeout(() => playTone(880, 0.22, "sine"), 130);
  });
}

function stopChampionSound() {
  if (!championAudio) return;
  championAudio.pause();
  championAudio.currentTime = 0;
  championAudio = null;
}

function playGoalSound() {
  const audio = new Audio("sounds/goalsound_.mp3");
  audio.volume = 0.9;
  audio.play().catch(() => {
    playTone(620, 0.16, "sine");
    window.setTimeout(() => playTone(820, 0.14, "sine"), 90);
  });
}

function confetti(amount) {
  const colors = ["#ffd166", "#e63946", "#247ba0", "#06d6a0", "#f7fbff"];
  for (let i = 0; i < amount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--fall", `${1.1 + Math.random() * 1.2}s`);
    piece.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
    fxLayer.appendChild(piece);
    window.setTimeout(() => piece.remove(), 2400);
  }
}

function fireworks(amount) {
  clearFireworksTimer();

  for (let i = 0; i < amount; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${15 + Math.random() * 70}%`;
    spark.style.top = `${15 + Math.random() * 50}%`;
    spark.style.setProperty("--x", `${-180 + Math.random() * 360}px`);
    spark.style.setProperty("--y", `${-180 + Math.random() * 360}px`);
    spark.style.background = ["#fff2a8", "#ffd166", "#ffffff", "#f7c948"][i % 4];
    fxLayer.appendChild(spark);
    window.setTimeout(() => spark.remove(), 1600);
  }
  fireworksTimer = window.setTimeout(() => fireworks(36), 1300);
}

function clearFireworksTimer() {
  if (!fireworksTimer) return;
  window.clearTimeout(fireworksTimer);
  fireworksTimer = null;
}

function stopFireworks() {
  clearFireworksTimer();
  fxLayer.querySelectorAll(".spark").forEach((spark) => spark.remove());
}

function playTone(frequency, duration, type) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

async function loadQuestions() {
  try {
    const response = await fetch("questions.json");
    if (!response.ok) throw new Error("No se pudo cargar questions.json");
    QUESTIONS = await response.json();
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="screen single-layout">
        <section class="panel stage-panel">
          <h1 class="panel-title">No se pudieron cargar las preguntas</h1>
          <p class="result-copy">Abrí el juego desde un servidor local para que el archivo questions.json pueda leerse correctamente.</p>
        </section>
      </section>
    `;
  }
}

loadQuestions();
