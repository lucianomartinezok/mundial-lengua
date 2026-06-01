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

const QUESTIONS = [
  {
    id: 1,
    text: "¿Cuál es la opción correcta para esta prueba 1?",
    options: ["A (Correcta)", "B", "C", "D"],
    answer: 0,
  },
  {
    id: 2,
    text: "Selecciona la respuesta válida para la prueba 2.",
    options: ["A", "B (Correcta)", "C", "D"],
    answer: 1,
  },
  {
    id: 3,
    text: "¿Cuál de estas alternativas es la acertada en la prueba 3?",
    options: ["A", "B", "C (Correcta)", "D"],
    answer: 2,
  },
  {
    id: 4,
    text: "Marca la opción que corresponda para la prueba 4.",
    options: ["A", "B", "C", "D (Correcta)"],
    answer: 3,
  },
  {
    id: 5,
    text: "Pregunta genérica de testeo número 5.",
    options: ["A (Correcta)", "B", "C", "D"],
    answer: 0,
  },
  {
    id: 6,
    text: "Control de flujo de juego para la prueba 6.",
    options: ["A", "B (Correcta)", "C", "D"],
    answer: 1,
  },
];

const ROUNDS = [
  { key: "octavos", label: "Octavos de Final" },
  { key: "cuartos", label: "Cuartos de Final" },
  { key: "semis", label: "Semifinal" },
  { key: "final", label: "Final" },
];

const WINNING_GOALS = 2;

const app = document.querySelector("#app");
const fxLayer = document.querySelector("#fx-layer");

let state = freshState();

function freshState() {
  return {
    selectedTeam: null,
    bracket: null,
    usedUserOpponents: [],
    currentRoundIndex: 0,
    userScores: { user: 0, rival: 0 },
    questionIndex: 0,
    screen: "select",
    currentQuestion: null,
    answering: false,
  };
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function randomScore(winnerFirst) {
  const loser = Math.floor(Math.random() * WINNING_GOALS);
  return winnerFirst ? [WINNING_GOALS, loser] : [loser, WINNING_GOALS];
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
        <div class="flag-strip" aria-label="Banderas de países">${flagStrip()}</div>
        <h2 class="select-title">Elegí tu equipo</h2>
      </div>
      <div class="team-grid">
        ${TEAMS.map(
          (team) => `
            <button class="team-card" type="button" data-team="${team.id}" aria-label="Representar a ${team.flag} ${team.name}">
              ${flagIcon(team, "large")}
              <span class="team-name">${teamLabel(team)}</span>
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
  state.screen = "loading";
  render();
}

function renderLoading() {
  app.innerHTML = `
    <section class="screen loading-screen">
      <div class="loading-ball" aria-hidden="true"></div>
      <h2 class="loading-title">${teamLabel(state.selectedTeam)}</h2>
      <p class="loading-copy">Preparando el cuadro del Mundial...</p>
      <button class="primary-action" type="button" id="show-bracket-button">Ver llaves</button>
    </section>
  `;

  document.querySelector("#show-bracket-button").addEventListener("click", () => {
    state.screen = "bracket";
    render();
  });
}

function goToBracket() {
  state.screen = "bracket";
  render();
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
      <div class="bracket-stage-label">${ROUNDS[state.currentRoundIndex].label}</div>
      ${renderBracket()}
    </section>
  `;

  const playButton = document.querySelector("#bracket-play-button");
  if (playButton) playButton.addEventListener("click", startMatch);
}

function renderBracket() {
  return `
    <div class="bracket-board">
      ${ROUNDS.map(
        (round, index) => `
          <div class="bracket-column round-${index}">
            <p class="round-title">${round.label.replace(" de ", "<br />de ")}</p>
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
  const classes = ["match"];
  if (match.userMatch && match.round === state.currentRoundIndex) classes.push("user-match");
  if (match.userMatch && match.winner === state.selectedTeam.id) classes.push("won");
  if (match.winner && !match.userMatch) classes.push("simulated");
  const score = match.score || ["", ""];

  return `
    <div class="${classes.join(" ")}">
      ${match.teams.map((teamId, index) => renderSlot(teamId, score[index])).join("")}
      ${match.userMatch && match.round === state.currentRoundIndex ? `
        <button class="bracket-play" type="button" id="bracket-play-button">¡JUGAR!</button>
      ` : ""}
    </div>
  `;
}

function renderSlot(teamId, score) {
  if (!teamId) {
    return `
      <div class="slot">
        <span>•</span>
        <span>---</span>
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
  const title = ROUNDS[state.currentRoundIndex].label;
  renderGameFrame(`
    <div class="stage-kicker">${title}</div>
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

  document.querySelector("#play-button").addEventListener("click", startMatch);
}

function startMatch() {
  state.userScores = { user: 0, rival: 0 };
  state.questionIndex = 0;
  state.currentQuestion = nextQuestion();
  state.screen = "question";
  render();
}

function nextQuestion() {
  const question = QUESTIONS[state.questionIndex % QUESTIONS.length];
  state.questionIndex += 1;
  return question;
}

function renderQuestion() {
  const rival = currentRival();
  const question = state.currentQuestion;
  renderGameFrame(`
    <div class="match-head">
      <div>
        <div class="stage-kicker">${ROUNDS[state.currentRoundIndex].label}</div>
        <h2 class="panel-title">${teamLabel(state.selectedTeam)} vs. ${teamLabel(rival)}</h2>
      </div>
      <div class="scoreboard" aria-label="Marcador del partido">
        <div class="score-team">${flagIcon(state.selectedTeam, "score")}<strong>${teamLabel(state.selectedTeam)}</strong></div>
        <div class="score-number">${state.userScores.user} - ${state.userScores.rival}</div>
        <div class="score-team">${flagIcon(rival, "score")}<strong>${teamLabel(rival)}</strong></div>
      </div>
    </div>
    <div class="question-box">
      <div class="question-count">Tanda de preguntas · ${((state.questionIndex - 1) % 2) + 1} de 2</div>
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
    showGoal();
  } else {
    state.userScores.rival += 1;
    showMiss();
  }

  renderQuestion();

  window.setTimeout(() => {
    state.answering = false;
    if (state.userScores.user >= WINNING_GOALS) {
      winCurrentMatch();
      return;
    }
    if (state.userScores.rival >= WINNING_GOALS) {
      loseTournament();
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
    fireworks(90);
    return;
  }

  state.currentRoundIndex += 1;
  goToBracket();
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

function pickFinalOpponent() {
  const candidates = TEAMS.filter(
    (team) => team.id !== state.selectedTeam.id && !state.usedUserOpponents.includes(team.id),
  );
  return shuffle(candidates.length ? candidates : TEAMS.filter((team) => team.id !== state.selectedTeam.id))[0].id;
}

function renderEliminated() {
  const rival = currentRival();
  app.innerHTML = `
    <section class="screen eliminated-screen">
      <div class="abandoned-ball" aria-hidden="true"></div>
      <div class="result-panel">
        <h2 class="result-title">${flagIcon(state.selectedTeam, "title")} Eliminado</h2>
        <p class="result-copy">${teamLabel(rival)} llegó a ${WINNING_GOALS} tantos. El torneo se reinicia desde Octavos de Final.</p>
        <button class="primary-action" type="button" id="restart-button">Volver a jugar</button>
      </div>
    </section>
  `;

  document.querySelector("#restart-button").addEventListener("click", resetGame);
}

function renderChampion() {
  app.innerHTML = `
    <section class="screen champion-lock">
      <div class="champion-content">
        <div class="trophy">🏆</div>
        <h1 class="result-title">${flagIcon(state.selectedTeam, "title")} ¡Campeón Mundial! ${flagIcon(state.selectedTeam, "title")}</h1>
        <p class="result-copy">${teamLabel(state.selectedTeam)} conquistó la gran final. <span class="flag-strip compact">${flagStrip()}</span></p>
        <button class="ghost-action" type="button" id="restart-button">Jugar de nuevo</button>
      </div>
    </section>
  `;

  document.querySelector("#restart-button").addEventListener("click", resetGame);
}

function resetGame() {
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
  playTone(620, 0.16, "sine");
  window.setTimeout(() => playTone(820, 0.14, "sine"), 90);
}

function showMiss() {
  showOverlay("¡BUZZ!", "miss");
  document.body.classList.add("shake");
  playTone(120, 0.28, "sawtooth");
  window.setTimeout(() => document.body.classList.remove("shake"), 430);
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
  window.setTimeout(() => fireworks(36), 1300);
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

render();
