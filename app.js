// MotoGP 2026 Championship Calculator Frontend Logic

function svgIcon(id, extraClass = "icon-sm") {
  return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#ic-${id}"/></svg>`;
}

function countryTag(code) {
  const c = code.toLowerCase();
  return `<span class="country-tag ${c}">${code.toUpperCase()}</span>`;
}

const SPRINT_POINTS = { 1: 12, 2: 9, 3: 7, 4: 6, 5: 5, 6: 4, 7: 3, 8: 2, 9: 1 };
const GP_POINTS = {
  1: 25, 2: 20, 3: 16, 4: 13, 5: 11, 6: 10, 7: 9, 8: 8,
  9: 7, 10: 6, 11: 5, 12: 4, 13: 3, 14: 2, 15: 1
};

const BASE_STANDINGS = {
  marc: { name: "Marc Márquez", number: 93, points: 431, gpWins: 7, team: "Ducati Lenovo Team" },
  martin: { name: "Jorge Martín", number: 89, points: 371, gpWins: 1, team: "Aprilia Racing" },
  bezzecchi: { name: "Marco Bezzecchi", number: 72, points: 357, gpWins: 6, team: "Aprilia Racing" }
};

function getSprintPts(pos) {
  pos = parseInt(pos, 10);
  return SPRINT_POINTS[pos] || 0;
}

function getGpPts(pos) {
  pos = parseInt(pos, 10);
  return GP_POINTS[pos] || 0;
}

// Populate position dropdowns
function populateSelect(id, isSprint) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = "";

  const dnfOpt = document.createElement("option");
  dnfOpt.value = "0";
  dnfOpt.textContent = isSprint ? "Sin pts (P10+ / DNF) - 0 pts" : "Sin pts (P16+ / DNF) - 0 pts";
  select.appendChild(dnfOpt);

  const maxPos = isSprint ? 9 : 15;
  const pointsMap = isSprint ? SPRINT_POINTS : GP_POINTS;

  for (let p = 1; p <= maxPos; p++) {
    const opt = document.createElement("option");
    opt.value = p.toString();
    opt.textContent = `P${p} (${pointsMap[p]} pts)`;
    select.appendChild(opt);
  }
}

// Current simulator state
function getSimulatorState() {
  return {
    mPortSp: parseInt(document.getElementById("m-port-sp")?.value || "0", 10),
    mPortGp: parseInt(document.getElementById("m-port-gp")?.value || "0", 10),
    mValSp: parseInt(document.getElementById("m-val-sp")?.value || "0", 10),
    mValGp: parseInt(document.getElementById("m-val-gp")?.value || "0", 10),

    jPortSp: parseInt(document.getElementById("j-port-sp")?.value || "0", 10),
    jPortGp: parseInt(document.getElementById("j-port-gp")?.value || "0", 10),
    jValSp: parseInt(document.getElementById("j-val-sp")?.value || "0", 10),
    jValGp: parseInt(document.getElementById("j-val-gp")?.value || "0", 10),
  };
}

function setSimulatorState(state) {
  if (state.mPortSp !== undefined) document.getElementById("m-port-sp").value = state.mPortSp;
  if (state.mPortGp !== undefined) document.getElementById("m-port-gp").value = state.mPortGp;
  if (state.mValSp !== undefined) document.getElementById("m-val-sp").value = state.mValSp;
  if (state.mValGp !== undefined) document.getElementById("m-val-gp").value = state.mValGp;

  if (state.jPortSp !== undefined) document.getElementById("j-port-sp").value = state.jPortSp;
  if (state.jPortGp !== undefined) document.getElementById("j-port-gp").value = state.jPortGp;
  if (state.jValSp !== undefined) document.getElementById("j-val-sp").value = state.jValSp;
  if (state.jValGp !== undefined) document.getElementById("j-val-gp").value = state.jValGp;

  updateSimulatorCalculations();
}

function updateSimulatorCalculations() {
  const s = getSimulatorState();

  // Points earned
  const mPortSpPts = getSprintPts(s.mPortSp);
  const mPortGpPts = getGpPts(s.mPortGp);
  const mPortTot = mPortSpPts + mPortGpPts;

  const mValSpPts = getSprintPts(s.mValSp);
  const mValGpPts = getGpPts(s.mValGp);
  const mValTot = mValSpPts + mValGpPts;

  const mTotalScored = mPortTot + mValTot;
  const mFinalPts = BASE_STANDINGS.marc.points + mTotalScored;

  const jPortSpPts = getSprintPts(s.jPortSp);
  const jPortGpPts = getGpPts(s.jPortGp);
  const jPortTot = jPortSpPts + jPortGpPts;

  const jValSpPts = getSprintPts(s.jValSp);
  const jValGpPts = getGpPts(s.jValGp);
  const jValTot = jValSpPts + jValGpPts;

  const jTotalScored = jPortTot + jValTot;
  const jFinalPts = BASE_STANDINGS.martin.points + jTotalScored;

  // GP Wins calculation
  const mGpWins = BASE_STANDINGS.marc.gpWins + (s.mPortGp === 1 ? 1 : 0) + (s.mValGp === 1 ? 1 : 0);
  const jGpWins = BASE_STANDINGS.martin.gpWins + (s.jPortGp === 1 ? 1 : 0) + (s.jValGp === 1 ? 1 : 0);

  // Portugal status
  const portimaoMarcLead = (BASE_STANDINGS.marc.points + mPortTot) - (BASE_STANDINGS.martin.points + jPortTot);
  const clinchedInPortimao = portimaoMarcLead >= 37;

  // Final Verdict
  let champion = "marc";
  let tieBreakUsed = false;

  if (mFinalPts > jFinalPts) {
    champion = "marc";
  } else if (mFinalPts < jFinalPts) {
    champion = "martin";
  } else {
    // Tie on points: Sunday GP wins decide
    tieBreakUsed = true;
    if (mGpWins >= jGpWins) {
      champion = "marc";
    } else {
      champion = "martin";
    }
  }

  // Update UI Elements
  document.getElementById("res-marc-port").textContent = `+${mPortTot} pts`;
  document.getElementById("res-martin-port").textContent = `+${jPortTot} pts`;
  document.getElementById("res-port-lead").textContent = `${portimaoMarcLead} pts`;

  document.getElementById("res-marc-val").textContent = `+${mValTot} pts`;
  document.getElementById("res-martin-val").textContent = `+${jValTot} pts`;

  document.getElementById("res-marc-final").textContent = `${mFinalPts} pts`;
  document.getElementById("res-martin-final").textContent = `${jFinalPts} pts`;
  document.getElementById("res-final-gap").textContent = `${mFinalPts - jFinalPts} pts`;

  const verdictCard = document.getElementById("verdict-card");
  const verdictBadge = document.getElementById("verdict-badge");
  const verdictTitle = document.getElementById("verdict-title");
  const verdictTiming = document.getElementById("verdict-timing");
  const verdictNote = document.getElementById("verdict-note");

  if (champion === "marc") {
    verdictCard.style.borderColor = "var(--accent-gold)";
    verdictBadge.className = "outcome-badge champion";
    verdictBadge.innerHTML = `${svgIcon("trophy")} CAMPEÓN DEL MUNDO 2026`;
    verdictTitle.textContent = "Marc Márquez #93";

    if (clinchedInPortimao) {
      verdictTiming.innerHTML = `${countryTag("pt")} ¡CAMPEÓN EN PORTIMÃO (Ronda 21)!`;
      verdictTiming.style.color = "var(--accent-gold)";
      verdictNote.innerHTML = `Ventaja tras Portugal: <strong>${portimaoMarcLead} pts</strong> (>= 37 pts necesarios). ¡Valencia sería un paseo triunfal!`;
    } else {
      verdictTiming.innerHTML = `${countryTag("es")} SE DECIDE EN VALENCIA (Ronda 22)`;
      verdictTiming.style.color = "var(--accent-blue)";
      verdictNote.innerHTML = tieBreakUsed
        ? `Empate a <strong>${mFinalPts} pts</strong>. Marc gana por desempate con <strong>${mGpWins} victorias en domingo</strong> frente a las ${jGpWins} de Jorge.`
        : `Marc gana por <strong>${mFinalPts - jFinalPts} pts</strong> (Total: ${mFinalPts} frente a ${jFinalPts}).`;
    }
  } else {
    verdictCard.style.borderColor = "var(--accent-blue)";
    verdictBadge.className = "outcome-badge rival";
    verdictBadge.textContent = "PIERDE EL TÍTULO";
    verdictTitle.textContent = "Jorge Martín #89";
    verdictTiming.innerHTML = "SE DECIDE EN VALENCIA";
    verdictTiming.style.color = "var(--accent-blue)";
    verdictNote.innerHTML = `Jorge Martín remonta los 60 puntos de desventaja, sumando ${jTotalScored} pts frente a los ${mTotalScored} pts de Marc.`;
  }
}

// Preset Handlers
const PRESETS = {
  default: {
    mPortSp: 3, mPortGp: 3, mValSp: 4, mValGp: 4,
    jPortSp: 1, jPortGp: 2, jValSp: 1, jValGp: 1
  },
  worstCase: {
    // Martin sweeps every remaining session (all 74 pts)
    mPortSp: 0, mPortGp: 3, mValSp: 0, mValGp: 0,
    jPortSp: 1, jPortGp: 1, jValSp: 1, jValGp: 1
  },
  clinchPortimaoP3: {
    // Martin wins Portimao (37 pts), Marc takes P3 in GP (16 pts) -> Clinches on Sunday!
    mPortSp: 0, mPortGp: 3, mValSp: 0, mValGp: 0,
    jPortSp: 1, jPortGp: 1, jValSp: 1, jValGp: 1
  },
  martinDnfPortimao: {
    // Martin crashes in Portimao Sprint + GP (0 pts)
    mPortSp: 0, mPortGp: 0, mValSp: 0, mValGp: 0,
    jPortSp: 0, jPortGp: 0, jValSp: 1, jValGp: 1
  },
  marcZeroPortimao: {
    // Marc scores 0 in Portimao, Martin sweeps Portimao -> Valencia showdown
    mPortSp: 0, mPortGp: 0, mValSp: 2, mValGp: 3,
    jPortSp: 1, jPortGp: 1, jValSp: 1, jValGp: 1
  },
  valenciaShowdown: {
    // Margin cut to 23 pts after Portugal, decided at Circuit Ricardo Tormo
    mPortSp: 0, mPortGp: 0, mValSp: 5, mValGp: 4,
    jPortSp: 1, jPortGp: 1, jValSp: 1, jValGp: 2
  }
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (p) setSimulatorState(p);
}

// Clinch Matrix Generator & Interactive Filter
function initClinchMatrix() {
  const slider = document.getElementById("matrix-martin-slider");
  const valueDisplay = document.getElementById("matrix-slider-val");
  const resultCard = document.getElementById("matrix-interactive-result");
  const tbody = document.getElementById("clinch-table-body");

  function renderRows() {
    tbody.innerHTML = "";
    for (let jPts = 37; jPts >= 0; jPts--) {
      const mNeeded = Math.max(0, jPts - 23);
      const leadAfter = 60 + mNeeded - jPts;

      let sampleFinish = "DNF o fuera de puntos (0 pts)";
      if (mNeeded >= 14) sampleFinish = "P3 en GP (16 pts) o P1 Sprint (12) + P14 GP (2)";
      else if (mNeeded >= 13) sampleFinish = "P4 en GP (13 pts)";
      else if (mNeeded >= 11) sampleFinish = "P5 en GP (11 pts)";
      else if (mNeeded >= 10) sampleFinish = "P6 en GP (10 pts)";
      else if (mNeeded >= 9) sampleFinish = "P7 en GP (9 pts) o P2 Sprint (9)";
      else if (mNeeded >= 7) sampleFinish = "P9 en GP (7 pts) o P3 Sprint (7)";
      else if (mNeeded >= 5) sampleFinish = "P11 en GP (5 pts) o P5 Sprint (5)";
      else if (mNeeded >= 2) sampleFinish = "P14 en GP (2 pts) o P8 Sprint (2)";
      else if (mNeeded >= 1) sampleFinish = "P15 en GP (1 pt) o P9 Sprint (1)";

      const tr = document.createElement("tr");
      tr.id = `matrix-row-${jPts}`;
      tr.innerHTML = `
        <td><strong>${jPts} pts</strong></td>
        <td><span style="color: ${mNeeded === 0 ? 'var(--accent-green)' : 'var(--accent-gold)'}; font-weight: 800;">${mNeeded} pts</span></td>
        <td class="col-hide-sm">${leadAfter} pts</td>
        <td><span style="color: var(--text-main); font-size: 0.82rem;">${sampleFinish}</span></td>
      `;
      tbody.appendChild(tr);
    }
  }

  function updateInteractiveView(jPts) {
    valueDisplay.textContent = `${jPts} puntos`;
    const mNeeded = Math.max(0, jPts - 23);
    const leadAfter = 60 + mNeeded - jPts;

    let sampleFinish = "DNF o P10+ en Sprint, P16+ en GP (0 pts)";
    if (mNeeded >= 14) sampleFinish = "3.º en el GP del domingo (16 pts) o 1.º en Sprint (12) + 14.º en GP (2)";
    else if (mNeeded >= 13) sampleFinish = "4.º en el GP del domingo (13 pts)";
    else if (mNeeded >= 11) sampleFinish = "5.º en el GP del domingo (11 pts)";
    else if (mNeeded >= 8) sampleFinish = "8.º en el GP del domingo (8 pts)";
    else if (mNeeded >= 5) sampleFinish = "11.º en el GP del domingo (5 pts) o 5.º en Sprint (5 pts)";
    else if (mNeeded >= 2) sampleFinish = "14.º en el GP del domingo (2 pts) o 8.º en Sprint (2 pts)";
    else if (mNeeded >= 1) sampleFinish = "15.º en el GP del domingo (1 pt) o 9.º en Sprint (1 pt)";

    resultCard.innerHTML = `
      <div style="font-size: 1rem; font-weight: 700; color: white; margin-bottom: 6px;">
        Si Jorge Martín suma <span style="color: #60a5fa;">${jPts} pts</span> en Portimão:
      </div>
      <div style="font-size: 1.2rem; font-weight: 900; color: ${mNeeded === 0 ? 'var(--accent-green)' : 'var(--accent-gold)'}; margin-bottom: 8px;">
        Marc necesita al menos ${mNeeded} puntos en Portimão
      </div>
      <div style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 6px;">
        <strong>Objetivo de ejemplo:</strong> ${sampleFinish}
      </div>
      <div style="font-size: 0.82rem; color: var(--text-muted);">
        Ventaja al llegar a Valencia: <strong>${leadAfter} pts</strong> (se requieren &gt;= 37 pts para cerrar el título).
      </div>
    `;

    // Highlight row
    document.querySelectorAll("#clinch-table-body tr").forEach(r => r.style.backgroundColor = "");
    const selectedRow = document.getElementById(`matrix-row-${jPts}`);
    if (selectedRow) {
      selectedRow.style.backgroundColor = "rgba(225, 6, 0, 0.25)";
    }
  }

  renderRows();
  slider.addEventListener("input", (e) => {
    updateInteractiveView(parseInt(e.target.value, 10));
  });
  updateInteractiveView(37); // default max
}

// Reverse Solver (Find all winning combinations for Marc)
function initReverseSolver() {
  const selectMartinTotal = document.getElementById("solver-martin-pts");
  const outputDiv = document.getElementById("solver-combinations-output");

  if (!selectMartinTotal || !outputDiv) return;

  function runSolver() {
    const jTotal = parseInt(selectMartinTotal.value, 10);
    const mNeeded = Math.max(0, jTotal - 60);

    const ways = [];
    // Explore single GP finish
    for (let pos = 1; pos <= 15; pos++) {
      if (GP_POINTS[pos] >= mNeeded) {
        ways.push(`Un solo <strong>P${pos}</strong> en el GP de Portimão o Valencia (${GP_POINTS[pos]} pts)`);
      }
    }
    // Explore single Sprint finish
    for (let pos = 1; pos <= 9; pos++) {
      if (SPRINT_POINTS[pos] >= mNeeded) {
        ways.push(`Un solo <strong>P${pos}</strong> en cualquiera de los dos Sprints (${SPRINT_POINTS[pos]} pts)`);
      }
    }

    let html = `
      <div style="background: rgba(11, 14, 20, 0.7); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-top: 12px;">
        <h4 style="color: var(--accent-gold); margin-bottom: 8px;">Resultado: Jorge Martín suma ${jTotal} pts en total</h4>
        <p style="font-size: 0.9rem; margin-bottom: 10px;">
          Puntos mínimos que necesita Marc entre ambos GP: <strong style="color: white; font-size: 1.05rem;">${mNeeded} pts</strong>
          (Total Marc: ${431 + mNeeded} pts frente a Martín: ${371 + jTotal} pts).
        </p>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">Formas directas de lograrlo en una sola carrera:</div>
        <ul style="list-style: disc; padding-left: 20px; font-size: 0.84rem; line-height: 1.75;">
    `;

    if (mNeeded === 0) {
      html += `<li>¡Marc sería campeón incluso sumando <strong>0 puntos</strong> (gana en puntos o por desempate en victorias de domingo)!</li>`;
    } else {
      ways.slice(0, 8).forEach(w => {
        html += `<li>${w}</li>`;
      });
      html += `<li>...además de cualquier combinación de 2, 3 o 4 carreras que sume al menos ${mNeeded} puntos.</li>`;
    }

    html += `</ul></div>`;
    outputDiv.innerHTML = html;
  }

  selectMartinTotal.addEventListener("change", runSolver);
  runSolver();
}

// ============================================================================
// LIVE RACE TRACKER & REAL-TIME MATHEMATICAL CHAMPIONSHIP ENGINE
// ============================================================================

const DIRECT_LIVE_TIMING_URL = "https://api.motogp.pulselive.com/motogp/v1/timing-gateway/livetiming-lite";

const LIVE_SESSION_CONFIGS = {
  portimao_sprint: {
    label: "Sprint de Portimão (Ronda 21)",
    shortLabel: "Portimão SPR",
    isSprint: true,
    remainingPtsAfter: 62, // Portimao GP (25) + Valencia Sprint (12) + Valencia GP (25)
    remainingGpWinsAfter: 2,
    simMarcId: "m-port-sp",
    simMartinId: "j-port-sp",
  },
  portimao_gp: {
    label: "Carrera GP de Portimão (Ronda 21)",
    shortLabel: "Portimão GP",
    isSprint: false,
    remainingPtsAfter: 37, // Valencia Sprint (12) + Valencia GP (25)
    remainingGpWinsAfter: 1,
    simMarcId: "m-port-gp",
    simMartinId: "j-port-gp",
  },
  valencia_sprint: {
    label: "Sprint de Valencia (Ronda 22)",
    shortLabel: "Valencia SPR",
    isSprint: true,
    remainingPtsAfter: 25, // Valencia GP (25)
    remainingGpWinsAfter: 1,
    simMarcId: "m-val-sp",
    simMartinId: "j-val-sp",
  },
  valencia_gp: {
    label: "Carrera GP de Valencia (Ronda 22)",
    shortLabel: "Valencia GP",
    isSprint: false,
    remainingPtsAfter: 0,
    remainingGpWinsAfter: 0,
    simMarcId: "m-val-gp",
    simMartinId: "j-val-gp",
  },
};

const liveState = {
  isPolling: false,
  pollTimer: null,
  eventSource: null,
  isDemo: false,
  demoTimer: null,
  demoStep: 0,
  lastPayload: null,
  lastSource: "API oficial MotoGP",
  baseline: {
    marc: { pts: 431, wins: 7 },
    martin: { pts: 371, wins: 1 },
    bezzecchi: { pts: 357, wins: 6 },
  },
};

function getSessionPoints(pos, isSprint) {
  if (!pos || pos < 1) return 0;
  return isSprint ? getSprintPts(pos) : getGpPts(pos);
}

/**
 * Exact real-time mathematical evaluation of whether Marc Márquez is World Champion
 * if the live race finishes in the current positions.
 */
function evaluateLiveRaceState(sessionKey, positions, baseline) {
  const cfg = LIVE_SESSION_CONFIGS[sessionKey] || LIVE_SESSION_CONFIGS.portimao_gp;
  const isSprint = cfg.isSprint;
  const remPts = cfg.remainingPtsAfter;
  const remWins = cfg.remainingGpWinsAfter;

  const marcRacePts = getSessionPoints(positions.marc, isSprint);
  const martinRacePts = getSessionPoints(positions.martin, isSprint);
  const bezzRacePts = getSessionPoints(positions.bezzecchi, isSprint);

  const marcLivePts = baseline.marc.pts + marcRacePts;
  const martinLivePts = baseline.martin.pts + martinRacePts;
  const bezzLivePts = baseline.bezzecchi.pts + bezzRacePts;

  const marcLiveWins = baseline.marc.wins + (!isSprint && positions.marc === 1 ? 1 : 0);
  const martinLiveWins = baseline.martin.wins + (!isSprint && positions.martin === 1 ? 1 : 0);
  const bezzLiveWins = baseline.bezzecchi.wins + (!isSprint && positions.bezzecchi === 1 ? 1 : 0);

  function checkRival(rivalLivePts, rivalLiveWins) {
    const rivalMaxPts = rivalLivePts + remPts;
    const rivalMaxWins = rivalLiveWins + remWins;

    if (marcLivePts > rivalMaxPts) {
      return { eliminated: true, ptsNeeded: 0, cushion: marcLivePts - rivalMaxPts, tiebreakWin: false, maxPts: rivalMaxPts };
    }
    if (marcLivePts === rivalMaxPts) {
      if (marcLiveWins > rivalMaxWins) {
        return { eliminated: true, ptsNeeded: 0, cushion: 0, tiebreakWin: true, maxPts: rivalMaxPts };
      }
      return { eliminated: false, ptsNeeded: 1, cushion: -1, tiebreakWin: false, maxPts: rivalMaxPts };
    }
    const diff = rivalMaxPts - marcLivePts;
    const needed = marcLiveWins > rivalMaxWins ? diff : diff + 1;
    return { eliminated: false, ptsNeeded: needed, cushion: -needed, tiebreakWin: false, maxPts: rivalMaxPts };
  }

  const martinCheck = checkRival(martinLivePts, martinLiveWins);
  const bezzCheck = checkRival(bezzLivePts, bezzLiveWins);

  const isChampionLive = martinCheck.eliminated && bezzCheck.eliminated;
  const extraPtsNeeded = Math.max(martinCheck.ptsNeeded, bezzCheck.ptsNeeded);
  const minCushion = Math.min(martinCheck.cushion, bezzCheck.cushion);

  // Compute actionable hint: what position does Marc need right now to clinch?
  let targetPosForClinch = null;
  if (!isChampionLive) {
    const maxScoringPos = isSprint ? 9 : 15;
    for (let candidatePos = maxScoringPos; candidatePos >= 1; candidatePos--) {
      const testEval = evaluateHypotheticalMarcPos(cfg, candidatePos, positions, baseline);
      if (testEval) {
        targetPosForClinch = candidatePos;
        break;
      }
    }
  }

  return {
    sessionKey,
    cfg,
    isChampionLive,
    extraPtsNeeded,
    minCushion,
    targetPosForClinch,
    marc: {
      pos: positions.marc,
      racePts: marcRacePts,
      livePts: marcLivePts,
      liveWins: marcLiveWins,
    },
    martin: {
      pos: positions.martin,
      racePts: martinRacePts,
      livePts: martinLivePts,
      liveWins: martinLiveWins,
      gapToMarc: marcLivePts - martinLivePts,
      ...martinCheck,
    },
    bezzecchi: {
      pos: positions.bezzecchi,
      racePts: bezzRacePts,
      livePts: bezzLivePts,
      liveWins: bezzLiveWins,
      gapToMarc: marcLivePts - bezzLivePts,
      ...bezzCheck,
    },
  };
}

function evaluateHypotheticalMarcPos(cfg, candidatePos, positions, baseline) {
  const isSprint = cfg.isSprint;
  const remPts = cfg.remainingPtsAfter;
  const remWins = cfg.remainingGpWinsAfter;

  const marcLivePts = baseline.marc.pts + getSessionPoints(candidatePos, isSprint);
  const marcLiveWins = baseline.marc.wins + (!isSprint && candidatePos === 1 ? 1 : 0);

  // If Marc moves into candidatePos and Martin/Bezzecchi was in that exact spot,
  // assume rival stays at current points (conservative check).
  const martinLivePts = baseline.martin.pts + getSessionPoints(positions.martin, isSprint);
  const martinLiveWins = baseline.martin.wins + (!isSprint && positions.martin === 1 ? 1 : 0);
  const bezzLivePts = baseline.bezzecchi.pts + getSessionPoints(positions.bezzecchi, isSprint);
  const bezzLiveWins = baseline.bezzecchi.wins + (!isSprint && positions.bezzecchi === 1 ? 1 : 0);

  const beatsMartin =
    marcLivePts > martinLivePts + remPts ||
    (marcLivePts === martinLivePts + remPts && marcLiveWins > martinLiveWins + remWins);
  const beatsBezz =
    marcLivePts > bezzLivePts + remPts ||
    (marcLivePts === bezzLivePts + remPts && marcLiveWins > bezzLiveWins + remWins);

  return beatsMartin && beatsBezz;
}

/**
 * Detect which of the 4 remaining race sessions the API payload represents.
 */
function detectSessionKeyFromHead(head) {
  const override = document.getElementById("live-session-override")?.value || "auto";
  if (override !== "auto" && LIVE_SESSION_CONFIGS[override]) {
    return { sessionKey: override, isRaceSession: true, autoDetected: false };
  }

  const circuitText = `${head.circuit_name || ""} ${head.event_tv_name || ""} ${head.event_shortname || ""}`.toLowerCase();
  const sessShort = String(head.session_shortname || "").toUpperCase().trim();
  const sessName = String(head.session_name || "").toLowerCase();

  const isValencia =
    circuitText.includes("valencia") ||
    circuitText.includes("tormo") ||
    circuitText.includes("cheste") ||
    String(head.event_shortname || "").toUpperCase() === "VAL";

  const isSprint =
    sessShort === "SPR" ||
    sessShort === "SPRINT" ||
    sessName.includes("sprint");

  const isGrandPrix =
    sessShort === "RAC" ||
    sessShort === "RACE" ||
    sessShort === "GP" ||
    (sessName.includes("race") && !sessName.includes("sprint"));

  const isRaceSession = isSprint || isGrandPrix;

  let sessionKey;
  if (isValencia) {
    sessionKey = isSprint ? "valencia_sprint" : "valencia_gp";
  } else {
    sessionKey = isSprint ? "portimao_sprint" : "portimao_gp";
  }

  return { sessionKey, isRaceSession, autoDetected: true };
}

function normalizeRidersList(rawRiderField) {
  if (!rawRiderField) return [];
  const arr = Array.isArray(rawRiderField) ? rawRiderField : Object.values(rawRiderField);
  return arr
    .filter(r => r && typeof r === "object")
    .map(r => {
      const numStr = String(r.rider_number ?? "").trim();
      const status = String(r.status_name || "CL").toUpperCase().trim();
      const isDnf = ["NC", "RT", "DNF", "DNS", "DSQ", "EX", "OUT", "ST"].includes(status);
      const rawPos = parseInt(r.pos, 10);
      const pos = !isDnf && !isNaN(rawPos) && rawPos > 0 ? rawPos : null;
      const fullName =
        [r.rider_name, r.rider_surname].filter(Boolean).join(" ").trim() ||
        r.rider_shortname ||
        `Rider #${numStr}`;

      return {
        order: parseInt(r.order, 10) || (pos || 999),
        pos,
        number: numStr,
        name: fullName,
        shortname: r.rider_shortname || fullName,
        team: r.team_name || "",
        bike: r.bike_name || "",
        gapFirst: r.gap_first || "",
        gapPrev: r.gap_prev || "",
        lastLapTime: r.last_lap_time || r.lap_time || "—",
        lastLap: r.last_lap ?? r.num_lap ?? null,
        status,
        isDnf,
        onPit: Boolean(r.on_pit),
      };
    })
    .sort((a, b) => {
      if (a.pos !== null && b.pos !== null) return a.pos - b.pos;
      if (a.pos !== null) return -1;
      if (b.pos !== null) return 1;
      return a.order - b.order;
    });
}

function findContender(riders, numberStr, nameMatchFn) {
  const byNum = riders.find(r => r.number === numberStr);
  if (byNum) return byNum;
  return riders.find(r => nameMatchFn(r.name.toLowerCase(), r.shortname.toLowerCase())) || null;
}

function formatSessionStatus(statusId, statusName) {
  const code = String(statusId || statusName || "").toUpperCase().trim();
  const map = {
    S: "EN PISTA",
    I: "EN PISTA",
    F: "BANDERA A CUADROS",
    N: "SIN COMENZAR",
    R: "BANDERA ROJA",
    C: "CANCELADA",
    D: "RETRASADA",
  };
  return map[code] || (code ? code : "DESCONOCIDO");
}

function updateHeaderPill(mode, text) {
  const pill = document.getElementById("header-live-pill");
  const label = document.getElementById("header-live-pill-text");
  if (!pill || !label) return;
  pill.className = `live-status-pill ${mode}`;
  label.textContent = text;
}

function renderLiveData(payload, sourceLabel) {
  liveState.lastPayload = payload;
  liveState.lastSource = sourceLabel || liveState.lastSource;

  const head = payload?.head || {};
  const riders = normalizeRidersList(payload?.rider);

  const { sessionKey, isRaceSession } = detectSessionKeyFromHead(head);
  const cfg = LIVE_SESSION_CONFIGS[sessionKey];

  // Update metadata strip
  document.getElementById("live-feed-source").textContent = liveState.lastSource;
  const catName = head.category || "MotoGP";
  const eventLabel = head.event_tv_name || head.circuit_name || head.event_shortname || "MotoGP Session";
  const sessLabel = head.session_shortname || head.session_name || "—";
  document.getElementById("live-session-name").textContent = `${catName} • ${eventLabel} (${sessLabel})`;
  document.getElementById("live-session-status").textContent = formatSessionStatus(head.session_status_id, head.session_status_name);

  // Lap info
  const totalLaps = parseInt(head.num_laps, 10);
  const leaderLap = riders[0]?.lastLap;
  if (!isNaN(totalLaps) && totalLaps > 0) {
    const currentLap = leaderLap ? Math.min(leaderLap, totalLaps) : (head.remaining ? Math.max(0, totalLaps - parseInt(head.remaining, 10)) : 0);
    document.getElementById("live-lap-info").textContent = `Vuelta ${currentLap} / ${totalLaps}`;
  } else if (head.remaining && head.remaining !== "0") {
    document.getElementById("live-lap-info").textContent = `Restante: ${head.remaining}`;
  } else {
    document.getElementById("live-lap-info").textContent = "—";
  }

  document.getElementById("live-last-updated").textContent = new Date().toLocaleTimeString("es-ES");

  // Check category & race session warnings
  const warnBox = document.getElementById("live-session-warning");
  warnBox.style.borderColor = "";
  warnBox.style.color = "";
  const isMotoGP = String(catName).toLowerCase().includes("motogp") || !head.category;
  if (!isMotoGP) {
    warnBox.className = "session-warning-banner visible";
    warnBox.innerHTML = `${svgIcon("alert")} <span>La señal en directo muestra ahora <strong>${catName}</strong> (${sessLabel}), no MotoGP. Esperando al inicio de la sesión de MotoGP.</span>`;
  } else if (!isRaceSession && !liveState.isDemo) {
    warnBox.className = "session-warning-banner visible";
    warnBox.innerHTML = `${svgIcon("alert")} <span>La señal en directo corresponde a <strong>${sessLabel}</strong> (sesión no puntuable). Se muestra el cálculo hipotético para <strong>${cfg.label}</strong> como si fuese el orden de carrera.</span>`;
  } else {
    warnBox.className = "session-warning-banner";
    warnBox.innerHTML = "";
  }

  // Locate contenders
  const marcRider = findContender(riders, "93", (full, sh) => full.includes("marc") && full.includes("rquez"));
  const martinRider = findContender(riders, "89", (full, sh) => full.includes("mart") && (full.includes("jorge") || sh.includes("mart")));
  const bezzRider = findContender(riders, "72", (full) => full.includes("bezzecchi"));

  const positions = {
    marc: marcRider ? marcRider.pos : null,
    martin: martinRider ? martinRider.pos : null,
    bezzecchi: bezzRider ? bezzRider.pos : null,
  };

  // Run exact mathematical evaluation
  const result = evaluateLiveRaceState(sessionKey, positions, liveState.baseline);

  // Update Hero Verdict Banner
  const banner = document.getElementById("live-verdict-banner");
  const kicker = document.getElementById("live-verdict-kicker");
  const headline = document.getElementById("live-verdict-headline");
  const sub = document.getElementById("live-verdict-sub");
  const hint = document.getElementById("live-verdict-hint");

  if (!isMotoGP || riders.length === 0) {
    banner.className = "live-verdict-banner waiting";
    kicker.innerHTML = `${svgIcon("radio")} ESPERANDO PILOTOS DE MOTOGP EN PISTA`;
    headline.textContent = !isMotoGP ? `En pista ahora: ${catName}` : "Sin pilotos en los tiempos en directo";
    sub.innerHTML = `Evaluando para <strong>${cfg.label}</strong>. En cuanto aparezcan los pilotos de MotoGP en los tiempos oficiales, el estado matemático del título se actualizará solo.`;
    hint.innerHTML = `Conexión en directo activa — o pulsa <strong>Carrera demo</strong> para probar las actualizaciones.`;
  } else if (result.isChampionLive) {
    banner.className = "live-verdict-banner champion-now";
    kicker.innerHTML = `${svgIcon("trophy")} MATEMÁTICAMENTE CAMPEÓN DEL MUNDO 2026 • ${cfg.shortLabel}`;
    headline.textContent = "¡MARC MÁRQUEZ #93 ES CAMPEÓN DEL MUNDO!";
    sub.innerHTML = `En directo: <strong>Marc ${result.marc.livePts} pts</strong> frente a Martín <strong>${result.martin.livePts} pts</strong> (Ventaja: <strong>+${result.martin.gapToMarc}</strong>) y Bezzecchi <strong>${result.bezzecchi.livePts} pts</strong>. Solo quedarán <strong>${cfg.remainingPtsAfter} pts</strong> en juego tras esta carrera.`;

    if (result.minCushion > 0) {
      hint.innerHTML = `${svgIcon("check")} <span><strong>Margen de campeón: +${result.minCushion} pts</strong> sobre el corte matemático — ni Martín (máx. ${result.martin.maxPts}) ni Bezzecchi (máx. ${result.bezzecchi.maxPts}) pueden alcanzar a Marc.</span>`;
    } else if (result.martin.tiebreakWin) {
      hint.innerHTML = `${svgIcon("check")} <span><strong>¡Campeón por desempate FIM 1.28.7!</strong> Aunque Martín sume los ${cfg.remainingPtsAfter} pts restantes e iguale en ${result.marc.livePts}, Marc gana en victorias de domingo (${result.marc.liveWins} frente a un máx. de ${result.martin.liveWins + cfg.remainingGpWinsAfter}).</span>`;
    } else {
      hint.innerHTML = `${svgIcon("check")} <span><strong>¡Matemáticamente inalcanzable!</strong> Si la carrera termina así, Marc Márquez logra su 9.º Mundial.</span>`;
    }
  } else {
    banner.className = "live-verdict-banner still-alive";
    kicker.innerHTML = `${svgIcon("clock")} AÚN HAY MUNDIAL TAL COMO ESTÁ LA CARRERA • ${cfg.shortLabel}`;
    headline.textContent = `AÚN NO ES CAMPEÓN — FALTAN +${result.extraPtsNeeded} PT${result.extraPtsNeeded === 1 ? "" : "S"}`;
    sub.innerHTML = `En directo: <strong>Marc ${result.marc.livePts} pts</strong> frente a Martín <strong>${result.martin.livePts} pts</strong> (Ventaja: <strong>${result.martin.gapToMarc >= 0 ? "+" : ""}${result.martin.gapToMarc}</strong>). Con <strong>${cfg.remainingPtsAfter} pts</strong> restantes tras esta carrera, Martín aún podría llegar a <strong>${result.martin.maxPts} pts</strong>.`;

    if (result.targetPosForClinch !== null) {
      const targetPts = getSessionPoints(result.targetPosForClinch, cfg.isSprint);
      hint.innerHTML = `${svgIcon("target")} <span><strong>Objetivo en pista:</strong> Marc necesita subir a <strong>P${result.targetPosForClinch} (+${targetPts} pts)</strong> ahora mismo — o que Martín pierda <strong>${result.extraPtsNeeded} pt${result.extraPtsNeeded === 1 ? "" : "s"}</strong> — para ser campeón.</span>`;
    } else {
      hint.innerHTML = `${svgIcon("target")} <span><strong>Objetivo en pista:</strong> Hace falta un giro de <strong>+${result.extraPtsNeeded} pts</strong> respecto a Martín para cerrar el título hoy.</span>`;
    }
  }

  // Update Contender Cards
  updateContenderCard("marc", marcRider, result.marc, {
    footerText: result.isChampionLive ? `${svgIcon("trophy")} CAMPEÓN TAL COMO ESTÁ` : "Líder del Mundial",
    footerRight: `${result.martin.gapToMarc >= 0 ? "+" : ""}${result.martin.gapToMarc} vs Martín`,
    footerClass: result.isChampionLive ? "eliminated" : "",
  });

  updateContenderCard("martin", martinRider, result.martin, {
    footerText: result.martin.eliminated ? `${svgIcon("x")} ELIMINADO` : `${svgIcon("bolt")} Con opciones (Faltan +${result.martin.ptsNeeded})`,
    footerRight: `Máx: ${result.martin.maxPts}`,
    footerClass: result.martin.eliminated ? "eliminated" : "danger",
  });

  updateContenderCard("bezz", bezzRider, result.bezzecchi, {
    footerText: result.bezzecchi.eliminated ? `${svgIcon("x")} ELIMINADO` : `${svgIcon("bolt")} Con opciones (Faltan +${result.bezzecchi.ptsNeeded})`,
    footerRight: `Máx: ${result.bezzecchi.maxPts}`,
    footerClass: result.bezzecchi.eliminated ? "eliminated" : "danger",
  });

  // Render Live Timing Tower
  renderLiveTimingTower(riders, cfg.isSprint);

  // Sync to Simulator Tab if enabled
  const syncCheckbox = document.getElementById("live-sync-simulator");
  if (syncCheckbox && syncCheckbox.checked && isMotoGP && riders.length > 0) {
    const maxPos = cfg.isSprint ? 9 : 15;
    const marcVal = positions.marc && positions.marc <= maxPos ? positions.marc : 0;
    const martinVal = positions.martin && positions.martin <= maxPos ? positions.martin : 0;
    const mSel = document.getElementById(cfg.simMarcId);
    const jSel = document.getElementById(cfg.simMartinId);
    if (mSel && jSel) {
      mSel.value = String(marcVal);
      jSel.value = String(martinVal);
      updateSimulatorCalculations();
    }
  }

  // Update Header Pill
  if (liveState.isDemo) {
    const lapTxt = document.getElementById("live-lap-info").textContent;
    updateHeaderPill("demo", `DEMO • ${lapTxt}`);
  } else if (liveState.isPolling) {
    const modeTag = liveState.eventSource ? "SSE DIRECTO" : "API DIRECTO";
    updateHeaderPill("live", `${modeTag} • ${cfg.shortLabel}`);
  }
}

function updateContenderCard(prefix, riderObj, evalObj, footerInfo) {
  const posEl = document.getElementById(`live-${prefix}-pos`);
  const statusEl = document.getElementById(`live-${prefix}-track-status`);
  const racePtsEl = document.getElementById(`live-${prefix}-race-pts`);
  const totalPtsEl = document.getElementById(`live-${prefix}-total-pts`);
  const gapEl = document.getElementById(`live-${prefix}-gap`);
  const lapEl = document.getElementById(`live-${prefix}-lap`);
  const footerEl = document.getElementById(`live-${prefix}-footer`);

  if (!riderObj) {
    posEl.textContent = "—";
    posEl.className = "contender-pos-badge";
    statusEl.textContent = "Sin tiempos";
    gapEl.textContent = "—";
    lapEl.textContent = "—";
  } else if (riderObj.isDnf || riderObj.pos === null) {
    posEl.textContent = riderObj.status || "DNF";
    posEl.className = "contender-pos-badge dnf";
    statusEl.textContent = "Abandono / No clasificado";
    gapEl.textContent = "FUERA";
    lapEl.textContent = riderObj.lastLapTime || "—";
  } else {
    posEl.textContent = `P${riderObj.pos}`;
    posEl.className = riderObj.pos <= 3 ? "contender-pos-badge podium" : "contender-pos-badge";
    statusEl.textContent = riderObj.onPit ? "En boxes" : "En pista";
    gapEl.textContent = riderObj.pos === 1 ? "LÍDER" : (riderObj.gapFirst ? `+${riderObj.gapFirst.replace(/^\+/, "")}` : "—");
    lapEl.textContent = riderObj.lastLapTime || "—";
  }

  racePtsEl.textContent = `+${evalObj.racePts}`;
  totalPtsEl.textContent = `${evalObj.livePts}`;

  footerEl.className = `contender-status-footer ${footerInfo.footerClass || ""}`;
  footerEl.innerHTML = `<span>${footerInfo.footerText}</span><strong>${footerInfo.footerRight}</strong>`;
}

function renderLiveTimingTower(riders, isSprint) {
  const tbody = document.getElementById("live-timing-tbody");
  if (!tbody) return;

  if (!riders || riders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
          La señal en directo no muestra pilotos en este momento.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  riders.forEach(r => {
    const tr = document.createElement("tr");
    let numClass = "number-tag";
    if (r.number === "93") {
      tr.className = "row-marc";
      numClass += " num-93";
    } else if (r.number === "89") {
      tr.className = "row-martin";
      numClass += " num-89";
    } else if (r.number === "72") {
      tr.className = "row-bezz";
      numClass += " num-72";
    }

    const pts = getSessionPoints(r.pos, isSprint);
    const posDisplay = r.pos !== null ? `<strong>P${r.pos}</strong>` : `<span style="color: #f87171; font-weight: 700;">${r.status || "DNF"}</span>`;
    const gapDisplay = r.pos === 1 ? `<span style="color: var(--accent-gold); font-weight: 700;">LÍDER</span>` : (r.isDnf ? "FUERA" : (r.gapFirst || "—"));
    const statusBadge = r.isDnf
      ? `<span class="badge-tag" style="background: rgba(239,68,68,0.2); color: #f87171;">${r.status}</span>`
      : r.onPit
        ? `<span class="badge-tag" style="background: rgba(245,158,11,0.2); color: #fbbf24;">BOXES</span>`
        : `<span class="badge-tag" style="background: rgba(16,185,129,0.15); color: #34d399;">PISTA</span>`;

    tr.innerHTML = `
      <td>${posDisplay}</td>
      <td>
        <div class="rider-cell">
          <span class="${numClass}">${r.number || "—"}</span>
          <strong>${r.name}</strong>
        </div>
      </td>
      <td class="col-hide-sm" style="color: var(--text-muted); font-size: 0.8rem;">${r.team || r.bike || "—"}</td>
      <td style="font-family: monospace; font-size: 0.82rem;">${gapDisplay}</td>
      <td class="col-hide-sm" style="font-family: monospace; font-size: 0.82rem;">${r.lastLapTime || "—"}</td>
      <td>${statusBadge}</td>
      <td><strong style="color: ${pts > 0 ? "var(--accent-gold)" : "var(--text-muted)"};">${pts > 0 ? `+${pts}` : "0"}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Fetch live timing via local serve.py proxy first, falling back to direct MotoGP API.
 */
async function fetchLiveTimingOnce() {
  if (liveState.isDemo) return;

  try {
    // 1. Try local proxy (/api/live-timing) when running via serve.py
    let payload = null;
    let sourceLabel = "MotoGP Official API (via local proxy)";

    if (window.location.protocol.startsWith("http")) {
      try {
        const res = await fetch("/api/live-timing", { cache: "no-store" });
        if (res.ok) {
          const wrapper = await res.json();
          if (wrapper && wrapper.ok && wrapper.data) {
            payload = wrapper.data;
          } else if (wrapper && wrapper.error) {
            throw new Error(wrapper.error);
          }
        }
      } catch (proxyErr) {
        // Fallback to direct public API fetch
        sourceLabel = "MotoGP Official API (direct)";
        const directRes = await fetch(DIRECT_LIVE_TIMING_URL, { cache: "no-store" });
        if (!directRes.ok) {
          throw new Error(`Proxy failed (${proxyErr.message}); Direct HTTP ${directRes.status}`);
        }
        payload = await directRes.json();
      }
    } else {
      // Opened via file:// -> try direct fetch
      sourceLabel = "MotoGP Official API (direct)";
      const directRes = await fetch(DIRECT_LIVE_TIMING_URL, { cache: "no-store" });
      if (!directRes.ok) {
        throw new Error(`HTTP ${directRes.status} from MotoGP API`);
      }
      payload = await directRes.json();
    }

    if (!payload) {
      throw new Error("Empty payload received from live timing endpoint");
    }

    renderLiveData(payload, sourceLabel);
  } catch (err) {
    console.warn("Live timing fetch error:", err);
    showLiveConnectionError(err.message);
  }
}

async function syncOfficialStandings() {
  const btn = document.getElementById("btn-sync-standings");
  if (btn) btn.innerHTML = `${svgIcon("clock")} Sincronizando...`;

  try {
    const res = await fetch("/api/standings", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const wrapper = await res.json();
    if (!wrapper.ok || !wrapper.data || !Array.isArray(wrapper.data.riders)) {
      throw new Error(wrapper.error || "Invalid standings response");
    }

    const riders = wrapper.data.riders;
    const findPts = (numStr, surname) => {
      const r = riders.find(
        x => String(x.number) === numStr || String(x.full_name || "").toLowerCase().includes(surname)
      );
      return r ? parseInt(r.points, 10) : null;
    };

    const mPts = findPts("93", "marc");
    const jPts = findPts("89", "mart");
    const bPts = findPts("72", "bezzecchi");

    if (mPts !== null) liveState.baseline.marc.pts = mPts;
    if (jPts !== null) liveState.baseline.martin.pts = jPts;
    if (bPts !== null) liveState.baseline.bezzecchi.pts = bPts;

    syncBaselineInputsFromState();
    if (liveState.lastPayload) {
      renderLiveData(liveState.lastPayload, liveState.lastSource);
    }

    const warnBox = document.getElementById("live-session-warning");
    warnBox.className = "session-warning-banner visible";
    warnBox.style.borderColor = "rgba(16, 185, 129, 0.5)";
    warnBox.style.color = "#34d399";
    warnBox.innerHTML = `${svgIcon("check")} <span>Clasificación oficial 2026 sincronizada: Marc ${liveState.baseline.marc.pts} pts • Martín ${liveState.baseline.martin.pts} pts • Bezzecchi ${liveState.baseline.bezzecchi.pts} pts.</span>`;
  } catch (err) {
    const warnBox = document.getElementById("live-session-warning");
    warnBox.style.borderColor = "";
    warnBox.style.color = "";
    warnBox.className = "session-warning-banner visible";
    warnBox.innerHTML = `${svgIcon("alert")} <span>No se pudo sincronizar la clasificación oficial (${err.message}). Puedes editar los puntos manualmente en <strong>Pts previos</strong>.</span>`;
  } finally {
    if (btn) btn.innerHTML = `${svgIcon("download")} Sincronizar pts`;
  }
}

function showLiveConnectionError(message) {
  updateHeaderPill("error", "SIN CONEXIÓN API");
  document.getElementById("live-session-status").textContent = "Error de conexión";
  document.getElementById("live-last-updated").textContent = new Date().toLocaleTimeString("es-ES");

  const warnBox = document.getElementById("live-session-warning");
  warnBox.style.borderColor = "";
  warnBox.style.color = "";
  warnBox.className = "session-warning-banner visible";
  warnBox.innerHTML = `${svgIcon("alert")} <span>No se pudo conectar con la API de MotoGP (<code>${message}</code>). Asegúrate de tener <code>python3 serve.py</code> en marcha con acceso a internet — o pulsa <strong>Carrera demo</strong> para probar sin conexión.</span>`;
}

function startLivePolling() {
  stopDemoRace();
  // Clean up any existing stream/timer before starting
  if (liveState.eventSource) {
    liveState.eventSource.close();
    liveState.eventSource = null;
  }
  if (liveState.pollTimer) {
    clearInterval(liveState.pollTimer);
    liveState.pollTimer = null;
  }

  liveState.isPolling = true;
  const btn = document.getElementById("btn-live-toggle");
  btn.innerHTML = `${svgIcon("stop", "")} <span>Desconectar</span>`;
  btn.classList.add("active");

  const intervalMs = parseInt(document.getElementById("live-poll-interval")?.value || "5000", 10);

  // Use Server-Sent Events (SSE) when served via serve.py over HTTP/HTTPS
  if (window.location.protocol.startsWith("http") && typeof EventSource !== "undefined") {
    updateHeaderPill("live", "CONECTANDO SSE...");
    const streamUrl = `/api/live-stream?interval=${encodeURIComponent(intervalMs)}`;
    const es = new EventSource(streamUrl);
    liveState.eventSource = es;

    es.onopen = () => {
      if (!liveState.isPolling) return;
      updateHeaderPill("live", "SSE • CONECTADO");
    };

    es.addEventListener("timing", (ev) => {
      if (!liveState.isPolling || liveState.isDemo) return;
      try {
        const wrapper = JSON.parse(ev.data);
        if (wrapper && wrapper.ok && wrapper.data) {
          renderLiveData(wrapper.data, "API oficial MotoGP (Stream SSE)");
        } else {
          showLiveConnectionError(wrapper?.error || "Error en los tiempos oficiales");
        }
      } catch (parseErr) {
        showLiveConnectionError(`Datos SSE no válidos: ${parseErr.message}`);
      }
    });

    es.onerror = () => {
      if (!liveState.isPolling) return;
      // EventSource automatically retries using the server's retry: 3000 directive
      updateHeaderPill("error", "RECONECTANDO SSE...");
      document.getElementById("live-session-status").textContent = "Reconectando SSE...";
    };
    return;
  }

  // Fallback for file:// mode: direct HTTP polling
  updateHeaderPill("live", "CONECTANDO A API...");
  fetchLiveTimingOnce();
  liveState.pollTimer = setInterval(fetchLiveTimingOnce, intervalMs);
}

function stopLivePolling() {
  liveState.isPolling = false;
  if (liveState.eventSource) {
    liveState.eventSource.close();
    liveState.eventSource = null;
  }
  if (liveState.pollTimer) {
    clearInterval(liveState.pollTimer);
    liveState.pollTimer = null;
  }
  const btn = document.getElementById("btn-live-toggle");
  if (btn) {
    btn.innerHTML = `${svgIcon("radio", "")} <span>Conectar directo</span>`;
    btn.classList.remove("active");
  }
  if (!liveState.isDemo) {
    updateHeaderPill("", "DIRECTO LISTO");
  }
}

// ============================================================================
// REALISTIC DEMO LIVE RACE (Portimão Sunday GP Lap-by-Lap Simulation)
// ============================================================================

const DEMO_PORTIMAO_GP_FRAMES = [
  // Frame 1: Lap 1 — Martin leads P1 (+25), Marc P10 (+6). Lead = 437 vs 396 (+41? Wait: 431+6=437, 371+25=396, gap 41 >= 37! Let's make Martin have 12 pts from Sprint or test a tighter battle!)
  // Actually, if we assume pre-Portimao GP standings where Martin WON Portimao Sprint (+12 -> 383) and Marc got 0 in Sprint (431):
  // Wait: let's keep standard baseline (431/371) OR demonstrate Portimao GP where Marc needs 14 pts if Martin already won Sprint, OR use Portimao Sprint!
  // Let's simulate Portimão Sunday GP with baseline 431 vs 383 (as if Martín won Saturday Sprint +12, Marc 0 in Sprint) OR even better: keep user's current baseline (431 vs 371) and simulate Portimão SATURDAY SPRINT where Marc can clinch early if lead >= 62!
  // Let's check Portimão Saturday Sprint (remaining = 62 pts):
  // Marc starts 431, Martin 371 (gap 60). Marc needs to outscore Martin by >= 2 pts in the Sprint to hit +62 lead and clinch on Saturday!
  // Frame 1 (Lap 1): Martin P2 (+9), Marc P5 (+5) -> Gap 56 (Still alive!)
  // Frame 2 (Lap 3): Martin P3 (+7), Marc P4 (+6) -> Gap 59 (Still alive, needs +3 pts!)
  // Frame 3 (Lap 5): Martin P4 (+6), Marc P3 (+7) -> Gap 61 (Still alive, needs +1 pt!)
  // Frame 4 (Lap 7): Martin P5 (+5), Marc P2 (+9) -> Gap 64 -> 🏆 MATHEMATICALLY WORLD CHAMPION AS IT STANDS!
  // Frame 5 (Lap 9): Martin P2 (+9), Marc P1 (+12) -> Gap 63 -> 🏆 CHAMPION (Cushion +1 pt)!
  // Frame 6 (Lap 11): Martin crashes (DNF, 0 pts), Marc P1 (+12) -> Gap 72 -> 🏆 CHAMPION (+10 pt cushion)!
  // Frame 7 (Lap 12 - Checkered Flag): Marc P1 (+12), Bezzecchi P2 (+9), Martin DNF -> 🏆 2026 WORLD CHAMPION!
  {
    lap: 1, status: "S",
    order: [
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.000", lapTime: "1'39.812" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "0.214", lapTime: "1'40.026" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "0.511", lapTime: "1'40.323" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "0.788", lapTime: "1'40.600" },
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "1.042", lapTime: "1'40.854" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "1.390", lapTime: "1'41.202" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "1.612", lapTime: "1'41.424" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "1.950", lapTime: "1'41.762" },
    ],
  },
  {
    lap: 3, status: "S",
    order: [
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.000", lapTime: "1'38.401" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "0.312", lapTime: "1'38.510" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "0.594", lapTime: "1'38.790" },
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.720", lapTime: "1'38.215" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "1.125", lapTime: "1'38.902" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "1.840", lapTime: "1'39.011" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "2.190", lapTime: "1'39.154" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "2.601", lapTime: "1'39.320" },
    ],
  },
  {
    lap: 5, status: "S",
    order: [
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.000", lapTime: "1'38.290" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "0.280", lapTime: "1'38.301" },
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.415", lapTime: "1'37.984" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "0.790", lapTime: "1'38.612" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "1.340", lapTime: "1'38.711" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "2.110", lapTime: "1'38.950" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "2.710", lapTime: "1'39.100" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "3.150", lapTime: "1'39.240" },
    ],
  },
  {
    lap: 7, status: "S",
    order: [
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.000", lapTime: "1'38.210" },
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.195", lapTime: "1'37.890" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "0.610", lapTime: "1'38.410" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "1.020", lapTime: "1'38.512" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "1.245", lapTime: "1'38.890" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "2.480", lapTime: "1'39.012" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "3.120", lapTime: "1'39.180" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "3.680", lapTime: "1'39.290" },
    ],
  },
  {
    lap: 9, status: "S",
    order: [
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.000", lapTime: "1'37.842" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "0.490", lapTime: "1'38.015" },
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.785", lapTime: "1'38.310" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "1.120", lapTime: "1'38.490" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "1.780", lapTime: "1'38.620" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "2.910", lapTime: "1'38.980" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "3.610", lapTime: "1'39.140" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "4.200", lapTime: "1'39.310" },
    ],
  },
  {
    lap: 11, status: "S",
    order: [
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.000", lapTime: "1'37.910" },
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "0.840", lapTime: "1'38.280" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "1.310", lapTime: "1'38.410" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "2.050", lapTime: "1'38.580" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "3.140", lapTime: "1'38.890" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "4.010", lapTime: "1'39.110" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "4.750", lapTime: "1'39.290" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "OUT", lapTime: "1'38.015", status: "NC" },
    ],
  },
  {
    lap: 12, status: "F",
    order: [
      { number: "93", name: "Marc", surname: "MÁRQUEZ", team: "Ducati Lenovo Team", gap: "0.000", lapTime: "1'38.120" },
      { number: "72", name: "Marco", surname: "BEZZECCHI", team: "Aprilia Racing", gap: "1.142", lapTime: "1'38.422" },
      { number: "37", name: "Pedro", surname: "ACOSTA", team: "Red Bull KTM Factory Racing", gap: "1.890", lapTime: "1'38.610" },
      { number: "63", name: "Francesco", surname: "BAGNAIA", team: "Ducati Lenovo Team", gap: "2.615", lapTime: "1'38.790" },
      { number: "73", name: "Álex", surname: "MÁRQUEZ", team: "BK8 Gresini Racing MotoGP", gap: "3.820", lapTime: "1'38.990" },
      { number: "79", name: "Ai", surname: "OGURA", team: "Trackhouse MotoGP Team", gap: "4.680", lapTime: "1'39.150" },
      { number: "49", name: "Fabio", surname: "DI GIANNANTONIO", team: "Pertamina Enduro VR46", gap: "5.410", lapTime: "1'39.340" },
      { number: "89", name: "Jorge", surname: "MARTÍN", team: "Aprilia Racing", gap: "OUT", lapTime: "1'38.015", status: "NC" },
    ],
  },
];

function buildDemoPayload(frame) {
  const riderObj = {};
  frame.order.forEach((r, idx) => {
    const isDnf = r.status === "NC";
    riderObj[String(idx + 1)] = {
      order: idx + 1,
      pos: isDnf ? -1 : idx + 1,
      rider_number: r.number,
      rider_name: r.name,
      rider_surname: r.surname,
      rider_shortname: r.surname,
      team_name: r.team,
      gap_first: r.gap,
      last_lap_time: r.lapTime,
      last_lap: frame.lap,
      status_name: r.status || "CL",
      on_pit: false,
    };
  });

  return {
    head: {
      category: "MotoGP",
      circuit_name: "Autódromo Internacional do Algarve",
      event_tv_name: "Grande Prémio de Portugal",
      event_shortname: "POR",
      session_shortname: "SPR",
      session_name: "Sprint",
      num_laps: 12,
      remaining: String(Math.max(0, 12 - frame.lap)),
      session_status_id: frame.status,
      session_status_name: frame.status,
    },
    rider: riderObj,
  };
}

function startDemoRace() {
  stopLivePolling();
  liveState.isDemo = true;
  liveState.demoStep = 0;

  const btn = document.getElementById("btn-live-demo");
  btn.innerHTML = `${svgIcon("stop", "")} <span>Parar demo</span>`;
  btn.classList.add("active");

  const runFrame = () => {
    const frame = DEMO_PORTIMAO_GP_FRAMES[liveState.demoStep];
    renderLiveData(buildDemoPayload(frame), "Simulación Sprint de Portimão (Demo)");
    liveState.demoStep = (liveState.demoStep + 1) % DEMO_PORTIMAO_GP_FRAMES.length;
  };

  runFrame();
  if (liveState.demoTimer) clearInterval(liveState.demoTimer);
  liveState.demoTimer = setInterval(runFrame, 3000);
}

function stopDemoRace() {
  liveState.isDemo = false;
  if (liveState.demoTimer) {
    clearInterval(liveState.demoTimer);
    liveState.demoTimer = null;
  }
  const btn = document.getElementById("btn-live-demo");
  if (btn) {
    btn.innerHTML = `${svgIcon("play", "")} <span>Carrera demo</span>`;
    btn.classList.remove("active");
  }
  if (!liveState.isPolling) {
    updateHeaderPill("", "DIRECTO LISTO");
  }
}

function syncBaselineInputsFromState() {
  document.getElementById("base-marc-pts").value = liveState.baseline.marc.pts;
  document.getElementById("base-marc-wins").value = liveState.baseline.marc.wins;
  document.getElementById("base-martin-pts").value = liveState.baseline.martin.pts;
  document.getElementById("base-martin-wins").value = liveState.baseline.martin.wins;
  document.getElementById("base-bezz-pts").value = liveState.baseline.bezzecchi.pts;
  document.getElementById("base-bezz-wins").value = liveState.baseline.bezzecchi.wins;
}

function readBaselineFromInputs() {
  liveState.baseline.marc.pts = parseInt(document.getElementById("base-marc-pts").value, 10) || 0;
  liveState.baseline.marc.wins = parseInt(document.getElementById("base-marc-wins").value, 10) || 0;
  liveState.baseline.martin.pts = parseInt(document.getElementById("base-martin-pts").value, 10) || 0;
  liveState.baseline.martin.wins = parseInt(document.getElementById("base-martin-wins").value, 10) || 0;
  liveState.baseline.bezzecchi.pts = parseInt(document.getElementById("base-bezz-pts").value, 10) || 0;
  liveState.baseline.bezzecchi.wins = parseInt(document.getElementById("base-bezz-wins").value, 10) || 0;

  if (liveState.lastPayload) {
    renderLiveData(liveState.lastPayload, liveState.lastSource);
  }
}

function initLiveTracker() {
  const toggleBtn = document.getElementById("btn-live-toggle");
  const refreshBtn = document.getElementById("btn-live-refresh");
  const intervalSel = document.getElementById("live-poll-interval");
  const demoBtn = document.getElementById("btn-live-demo");
  const sessionOverride = document.getElementById("live-session-override");
  const syncStandingsBtn = document.getElementById("btn-sync-standings");
  const toggleBaselineBtn = document.getElementById("btn-toggle-baseline");
  const resetBaselineBtn = document.getElementById("btn-reset-baseline");
  const headerPill = document.getElementById("header-live-pill");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (liveState.isPolling) stopLivePolling();
      else startLivePolling();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (liveState.isDemo) stopDemoRace();
      fetchLiveTimingOnce();
    });
  }

  if (intervalSel) {
    intervalSel.addEventListener("change", () => {
      if (liveState.isPolling) startLivePolling();
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      if (liveState.isDemo) stopDemoRace();
      else startDemoRace();
    });
  }

  if (sessionOverride) {
    sessionOverride.addEventListener("change", () => {
      if (liveState.lastPayload) {
        renderLiveData(liveState.lastPayload, liveState.lastSource);
      }
    });
  }

  if (syncStandingsBtn) {
    syncStandingsBtn.addEventListener("click", syncOfficialStandings);
  }

  if (toggleBaselineBtn) {
    toggleBaselineBtn.addEventListener("click", () => {
      document.getElementById("baseline-editor")?.classList.toggle("open");
    });
  }

  const toggleSettingsBtn = document.getElementById("btn-toggle-live-settings");
  if (toggleSettingsBtn) {
    toggleSettingsBtn.addEventListener("click", () => {
      document.getElementById("live-secondary-panel")?.classList.toggle("open");
    });
  }

  if (resetBaselineBtn) {
    resetBaselineBtn.addEventListener("click", () => {
      liveState.baseline = {
        marc: { pts: 431, wins: 7 },
        martin: { pts: 371, wins: 1 },
        bezzecchi: { pts: 357, wins: 6 },
      };
      syncBaselineInputsFromState();
      if (liveState.lastPayload) {
        renderLiveData(liveState.lastPayload, liveState.lastSource);
      }
    });
  }

  ["base-marc-pts", "base-marc-wins", "base-martin-pts", "base-martin-wins", "base-bezz-pts", "base-bezz-wins"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", readBaselineFromInputs);
  });

  if (headerPill) {
    headerPill.addEventListener("click", () => {
      const liveTabBtn = document.querySelector('.tab-btn[data-tab="tab-live"]');
      if (liveTabBtn) liveTabBtn.click();
    });
  }
}

// Tab navigation
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab"));
      if (target) target.classList.add("active");
    });
  });
}

// Initialise everything on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  // Populate dropdowns
  ["m-port-sp", "m-val-sp", "j-port-sp", "j-val-sp"].forEach(id => populateSelect(id, true));
  ["m-port-gp", "m-val-gp", "j-port-gp", "j-val-gp"].forEach(id => populateSelect(id, false));

  // Attach change listeners to all simulator selects
  document.querySelectorAll(".rider-input-col select").forEach(sel => {
    sel.addEventListener("change", updateSimulatorCalculations);
  });

  // Attach preset buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      applyPreset(btn.getAttribute("data-preset"));
    });
  });

  initTabs();
  initLiveTracker();
  initClinchMatrix();
  initReverseSolver();

  // Set default initial scenario (P3 GP for Marc, P1/P2 for Martin)
  applyPreset("default");
});
