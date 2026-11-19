# MotoGP 2026 Championship Calculator: Marc Márquez Title Scenarios

An interactive calculator and mathematical simulation suite built to analyze all possible finishing combinations for **Marc Márquez** to win the **2026 FIM MotoGP™ World Championship**, accounting for the current official leaderboard and the remaining tracks as of **November 18, 2026**.

---

## 📊 Current State of Play (As of November 18, 2026)

Following Round 20 (Qatar GP), the championship enters its final double-header with only two contenders mathematically capable of winning the title:

| Pos | # | Rider | Team | Points | GP Wins | Podiums | Title Status |
|---|---|---|---|---|---|---|---|
| **1** | **#93** | **Marc Márquez** | **Ducati Lenovo Team** | **431** | **7** | 8 | **Championship Leader** |
| 2 | #89 | Jorge Martín | Aprilia Racing | 371 | 1 | 9 | -60 pts (Sole active challenger) |
| 3 | #72 | Marco Bezzecchi | Aprilia Racing | 357 | 6 | 12 | -74 pts (Eliminated if Marc scores >=1 pt) |
| 4 | #37 | Pedro Acosta | Red Bull KTM Factory Racing | 309 | 1 | 7 | -122 pts (Mathematically eliminated) |
| 5 | #79 | Ai Ogura | Trackhouse MotoGP Team | 294 | 1 | 5 | Mathematically eliminated |
| 6 | #49 | Fabio Di Giannantonio | Pertamina Enduro VR46 Racing | 282 | 0 | 4 | Mathematically eliminated |

---

## 🏎️ Remaining Tracks on the 2026 Calendar

| Round | Grand Prix | Circuit | Dates | Sprint (Sat) | Feature GP (Sun) | Max Points |
|---|---|---|---|---|---|---|
| **Round 21** | **Grande Prémio de Portugal** | Autódromo Internacional do Algarve (Portimão) | Nov 20–22, 2026 | 12 laps (12 pts) | 25 laps (25 pts) | **37 pts** |
| **Round 22** | **Gran Premio de la Comunitat Valenciana** | Circuit Ricardo Tormo (Cheste, Valencia) | Nov 27–29, 2026 | 13 laps (12 pts) | 27 laps (25 pts) | **37 pts** |

**Total Maximum Points Available Across Both Rounds:** **74 points** ($2 \times 37$).

---

## 🧮 Mathematical Rules & Magic Numbers

### 1. FIM Sporting Regulation 1.28.7 (Tie-Breaker Rule)
In the event of a tie in points at the end of the season, ties are decided by:
1. **Number of Sunday Grand Prix main race victories** (Sprint wins **do not** count as GP victories).
2. Number of 2nd places in Sunday GPs, then 3rd places, etc.

> **Tie-break Guarantee:** Marc Márquez currently has **7 Sunday GP victories**, while Jorge Martín has **1**. With only 2 Sunday GPs left, Martín can reach at most 3 GP victories. **Therefore, Marc Márquez mathematically wins ANY points tie against Jorge Martín.**

### 2. The Magic 14 Points (Absolute Guarantee)
* Jorge Martín's maximum possible points: $371 + 74 = \mathbf{445\text{ pts}}$.
* Marc Márquez needs only **14 points** across the 2 rounds ($431 + 14 = \mathbf{445\text{ pts}}$) to tie Martín.
* Because Marc wins the tiebreaker, **14 points guarantees Marc the 2026 World Championship outright**, even if Martín wins every remaining race.
* 14 points can be scored by:
  * A single **3rd place in any Sunday GP** (16 pts), OR
  * A **4th place in a Sunday GP** (13 pts) + **9th place in a Sprint** (1 pt), OR
  * A **2nd place in a Sprint** (9 pts) + **5th in a Sprint** (5 pts).

### 3. Match Point at Portimão (Round 21, Nov 20–22)
After Portimão, only 37 points remain in Valencia. Marc clinches the title in Portimão if his lead over Martín after Sunday's race is **$\ge 37$ points**:
$$\text{Marc Portimão Pts} \ge \text{Jorge Portimão Pts} - 23$$

* If Martín scores **37 pts** (sweeps Portimão): Marc clinches in Portugal with $\ge 14$ pts.
* If Martín scores **25 pts** (wins GP, 0 in sprint): Marc clinches with $\ge 2$ pts.
* If Martín scores **$\le 23$ pts**: **Marc clinches the World Title in Portimão EVEN WITH 0 POINTS.**

---

## 🚀 Running the Calculator

### Option 1: Interactive Web Application (with Live Race Tracker)
Launch the built-in local server & MotoGP API proxy:
```bash
python3 serve.py
```
Then open [http://localhost:8080](http://localhost:8080) in your web browser.

Features included in the Web App:
- **🔴 LIVE Race Tracker (SSE)**: `serve.py` runs a single on-demand background poller against the official public MotoGP Live Timing API (`https://api.motogp.pulselive.com/motogp/v1/timing-gateway/livetiming-lite`) and pushes real-time updates to all open browser tabs over **Server-Sent Events** (`/api/live-stream`). Auto-detects the active session (Portimão/Valencia Sprint or GP) and calculates in real time whether **Marc Márquez #93 is mathematically 2026 World Champion as it stands** (accounting for remaining points and FIM Rule 1.28.7 tiebreakers against both Jorge Martín and Marco Bezzecchi). Includes a **▶ Demo Live Race** mode to preview live updates before lights out and **📥 Sync Standings** (`/api/standings`).
- **Interactive Race Weekend Simulator**: Adjust finishing positions for Marc Márquez and Jorge Martín across Portimão Sprint/GP and Valencia Sprint/GP with instant verdict banners and celebration effects.
- **Portimão Clinch Matrix**: Interactive slider to see the exact points and finish requirements for any Jorge Martín scenario in Portugal.
- **Reverse Combinations Solver**: Select Martín's total points and get a list of single-race and multi-race finishes that deliver the title.
- **Official Standings & Remaining Track Specs**.

### Option 2: Python CLI Tool
Run the CLI tool directly from terminal:
```bash
# Complete overview (standings, tracks, rules, Portimão clinch matrix, permutations)
python3 motogp_calc.py

# Standings only
python3 motogp_calc.py standings

# Portimão clinch matrix table
python3 motogp_calc.py clinch

# Custom scenario simulation
python3 motogp_calc.py simulate --marc-port-sp 3 --marc-port-gp 3 --martin-port-sp 1 --martin-port-gp 1
```

### Option 3: Automated Unit Tests
Verify mathematical consistency and FIM scoring rules:
```bash
python3 test_calculator.py
```
