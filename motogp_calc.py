#!/usr/bin/env python3
"""
MotoGP 2026 Championship Calculator
Analyzes all combinations for Marc Márquez to win the 2026 MotoGP World Championship
taking into account the current leaderboard and remaining tracks as of November 18, 2026.
"""

import sys
import argparse
import itertools
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

# --- Official Points Scales ---
SPRINT_POINTS: Dict[int, int] = {
    1: 12, 2: 9, 3: 7, 4: 6, 5: 5, 6: 4, 7: 3, 8: 2, 9: 1
}

GP_POINTS: Dict[int, int] = {
    1: 25, 2: 20, 3: 16, 4: 13, 5: 11, 6: 10, 7: 9, 8: 8,
    9: 7, 10: 6, 11: 5, 12: 4, 13: 3, 14: 2, 15: 1
}

def get_sprint_points(position: Optional[int]) -> int:
    """Return points for Sprint position (None or >9 gives 0)."""
    if position is None or position < 1 or position > 9:
        return 0
    return SPRINT_POINTS.get(position, 0)

def get_gp_points(position: Optional[int]) -> int:
    """Return points for Grand Prix position (None or >15 gives 0)."""
    if position is None or position < 1 or position > 15:
        return 0
    return GP_POINTS.get(position, 0)

# --- Current State as of November 18, 2026 ---
@dataclass
class Rider:
    name: str
    number: int
    team: str
    points: int
    gp_wins: int
    podiums: int
    pole_positions: int

CURRENT_STANDINGS = [
    Rider("Marc Márquez", 93, "Ducati Lenovo Team", 431, 7, 8, 4),
    Rider("Jorge Martín", 89, "Aprilia Racing", 371, 1, 9, 3),
    Rider("Marco Bezzecchi", 72, "Aprilia Racing", 357, 6, 12, 5),
    Rider("Pedro Acosta", 37, "Red Bull KTM Factory Racing", 309, 1, 7, 2),
    Rider("Ai Ogura", 79, "Trackhouse MotoGP Team", 294, 1, 5, 1),
    Rider("Fabio Di Giannantonio", 49, "Pertamina Enduro VR46 Racing Team", 282, 0, 4, 1),
    Rider("Raúl Fernández", 25, "Trackhouse MotoGP Team", 258, 0, 3, 1),
    Rider("Álex Márquez", 73, "BK8 Gresini Racing MotoGP", 197, 0, 2, 0),
    Rider("Francesco Bagnaia", 63, "Ducati Lenovo Team", 173, 0, 4, 2),
]

REMAINING_TRACKS = [
    {
        "round": 21,
        "name": "Grande Prémio de Portugal",
        "circuit": "Autódromo Internacional do Algarve (Portimão)",
        "location": "Portimão, Portugal",
        "dates": "November 20 – November 22, 2026",
        "length_km": 4.592,
        "turns": 15,
        "laps_sprint": 12,
        "laps_gp": 25,
        "max_points": 37,
    },
    {
        "round": 22,
        "name": "Gran Premio Motul de la Comunitat Valenciana",
        "circuit": "Circuit Ricardo Tormo",
        "location": "Valencia, Spain",
        "dates": "November 27 – November 29, 2026",
        "length_km": 4.005,
        "turns": 14,
        "laps_sprint": 13,
        "laps_gp": 27,
        "max_points": 37,
    }
]

MAX_POINTS_PER_ROUND = 12 + 25  # 37 points
TOTAL_REMAINING_POINTS = 2 * MAX_POINTS_PER_ROUND  # 74 points

# --- Championship Math & Tie-Break Logic ---
def check_tiebreak(rider_a_points: int, rider_a_gp_wins: int,
                   rider_b_points: int, rider_b_gp_wins: int) -> int:
    """
    Compares two riders under FIM Rule 1.28.7:
    Returns 1 if rider A wins, -1 if rider B wins, 0 if still tied.
    (Under FIM rules, tie is broken by number of Grand Prix Sunday wins).
    """
    if rider_a_points > rider_b_points:
        return 1
    elif rider_a_points < rider_b_points:
        return -1
    else:
        # Tie on points: Sunday GP wins decide
        if rider_a_gp_wins > rider_b_gp_wins:
            return 1
        elif rider_a_gp_wins < rider_b_gp_wins:
            return -1
        else:
            return 0

def does_marquez_win(marc_pts_earned: int, martin_pts_earned: int, bezzecchi_pts_earned: int,
                      martin_gp_wins_added: int = 0, bezzecchi_gp_wins_added: int = 0) -> bool:
    """
    Returns True if Marc Marquez wins the 2026 MotoGP Championship given additional points earned.
    """
    marc_final_pts = 431 + marc_pts_earned
    martin_final_pts = 371 + martin_pts_earned
    bezzecchi_final_pts = 357 + bezzecchi_pts_earned

    marc_gp_wins = 7  # Marc has 7
    martin_gp_wins = 1 + martin_gp_wins_added
    bezzecchi_gp_wins = 6 + bezzecchi_gp_wins_added

    # Compare Marc vs Martin
    vs_martin = check_tiebreak(marc_final_pts, marc_gp_wins, martin_final_pts, martin_gp_wins)
    if vs_martin < 0:
        return False

    # Compare Marc vs Bezzecchi
    vs_bezzecchi = check_tiebreak(marc_final_pts, marc_gp_wins, bezzecchi_final_pts, bezzecchi_gp_wins)
    if vs_bezzecchi < 0:
        return False

    return True

def does_marquez_clinch_portimao(marc_portimao_pts: int, martin_portimao_pts: int,
                                bezzecchi_portimao_pts: int, martin_gp_wins_portimao: int = 0) -> bool:
    """
    Checks if Marc clinches the title in Portimão (Round 21).
    After Portimao, only 37 points remain in Valencia.
    Marc clinches if his lead over any rival after Portimao cannot be overturned in Valencia.
    """
    marc_pts = 431 + marc_portimao_pts
    martin_pts = 371 + martin_portimao_pts
    bezzecchi_pts = 357 + bezzecchi_portimao_pts

    # Valencia max points = 37 (Sprint 12 + GP 25)
    # Check Martin: Martin can gain at most 37 pts in Valencia.
    # Max Martin final points = martin_pts + 37.
    # Martin's max GP wins at end of season = 1 + martin_gp_wins_portimao + 1 (in Valencia) = 2 or 3.
    # Since Marc has 7 GP wins, Marc always wins tiebreak against Martin!
    # Therefore, if marc_pts >= martin_pts + 37, Martin CANNOT beat Marc!
    # That is: marc_pts - martin_pts >= 37.
    if marc_pts - martin_pts < 37:
        return False

    # Check Bezzecchi:
    # Max Bezzecchi final points = bezzecchi_pts + 37.
    # If Marc has even 432 pts, Bezzecchi's max season points is 357 + 37 + 37 = 431.
    # So if marc_portimao_pts >= 1, Bezzecchi is eliminated.
    # If marc_portimao_pts == 0 (marc_pts == 431), Bezzecchi can tie at 431 if bezzecchi scores 37 in Portimao and 37 in Valencia.
    # If Bezzecchi ties at 431, he has 6 + 1 + 1 = 8 GP wins vs Marc's 7, so Bezzecchi could beat Marc!
    # Therefore, for Marc to clinch in Portimao against Bezzecchi when Marc scores 0:
    # Bezzecchi must score <= 36 in Portimao (so Bezzecchi can at most reach 357 + 36 + 37 = 430 < 431).
    if marc_pts == 431 and bezzecchi_portimao_pts == 37:
        return False

    return True

def min_marquez_points_overall(martin_total_pts: int) -> int:
    """
    Given Jorge Martin's total points scored across both rounds (0..74),
    returns the minimum points Marc Marquez needs to guarantee the championship.
    Because Marc wins tiebreak against Martin, Marc needs:
    431 + M >= 371 + J  =>  M >= J - 60
    """
    needed = martin_total_pts - 60
    return max(0, needed)

def min_marquez_points_portimao(martin_portimao_pts: int) -> int:
    """
    Given Jorge Martin's points scored in Portimão (0..37),
    returns the minimum points Marc Marquez needs in Portimão to clinch the title there.
    Condition: 431 + M - (371 + J) >= 37  =>  M >= J - 23.
    (Also if M == 0, Bezzecchi cannot score 37, but practically J - 23 is the Martin condition).
    """
    needed = martin_portimao_pts - 23
    return max(0, needed)


# --- Live Race Evaluation Logic ---
SESSION_CONFIGS: Dict[str, Dict] = {
    "portimao_sprint": {
        "label": "Portimão Saturday Sprint (Round 21)",
        "is_sprint": True,
        "remaining_pts_after": 62,      # Portimao GP (25) + Valencia Sprint (12) + Valencia GP (25)
        "remaining_gp_wins_after": 2,
    },
    "portimao_gp": {
        "label": "Portimão Sunday Grand Prix (Round 21)",
        "is_sprint": False,
        "remaining_pts_after": 37,      # Valencia Sprint (12) + Valencia GP (25)
        "remaining_gp_wins_after": 1,
    },
    "valencia_sprint": {
        "label": "Valencia Saturday Sprint (Round 22)",
        "is_sprint": True,
        "remaining_pts_after": 25,      # Valencia GP (25)
        "remaining_gp_wins_after": 1,
    },
    "valencia_gp": {
        "label": "Valencia Sunday Grand Prix (Round 22)",
        "is_sprint": False,
        "remaining_pts_after": 0,       # Season complete
        "remaining_gp_wins_after": 0,
    },
}


def evaluate_live_race_state(
    session_key: str,
    marc_pos: Optional[int],
    martin_pos: Optional[int],
    bezzecchi_pos: Optional[int] = None,
    marc_base_pts: int = 431,
    martin_base_pts: int = 371,
    bezzecchi_base_pts: int = 357,
    marc_base_wins: int = 7,
    martin_base_wins: int = 1,
    bezzecchi_base_wins: int = 6,
) -> Dict:
    """
    Evaluates in real time whether Marc Márquez is mathematically World Champion
    if the current live race finishes in the given positions.

    Accounts for:
    - Exact Sprint vs GP scoring scales
    - Remaining points available in all subsequent sessions
    - FIM Rule 1.28.7 tiebreaker (Sunday GP wins) against BOTH Jorge Martín and Marco Bezzecchi
    """
    if session_key not in SESSION_CONFIGS:
        raise ValueError(f"Unknown session_key: {session_key}")

    cfg = SESSION_CONFIGS[session_key]
    is_sprint = cfg["is_sprint"]
    rem_pts = cfg["remaining_pts_after"]
    rem_wins = cfg["remaining_gp_wins_after"]

    pts_fn = get_sprint_points if is_sprint else get_gp_points

    marc_race_pts = pts_fn(marc_pos)
    martin_race_pts = pts_fn(martin_pos)
    bezz_race_pts = pts_fn(bezzecchi_pos)

    marc_live_pts = marc_base_pts + marc_race_pts
    martin_live_pts = martin_base_pts + martin_race_pts
    bezz_live_pts = bezzecchi_base_pts + bezz_race_pts

    marc_live_wins = marc_base_wins + (1 if (not is_sprint and marc_pos == 1) else 0)
    martin_live_wins = martin_base_wins + (1 if (not is_sprint and martin_pos == 1) else 0)
    bezz_live_wins = bezzecchi_base_wins + (1 if (not is_sprint and bezzecchi_pos == 1) else 0)

    def rival_is_eliminated(rival_live_pts: int, rival_live_wins: int) -> Tuple[bool, int]:
        """Returns (eliminated, extra_points_marc_needs_to_eliminate_rival)."""
        rival_max_pts = rival_live_pts + rem_pts
        rival_max_wins = rival_live_wins + rem_wins

        if marc_live_pts > rival_max_pts:
            return True, 0
        if marc_live_pts == rival_max_pts:
            if marc_live_wins > rival_max_wins:
                return True, 0
            # Rival could tie or beat on GP wins, so Marc needs 1 more point
            return False, 1
        # marc_live_pts < rival_max_pts
        diff = rival_max_pts - marc_live_pts
        if marc_live_wins > rival_max_wins:
            return False, diff
        return False, diff + 1

    martin_elim, pts_needed_vs_martin = rival_is_eliminated(martin_live_pts, martin_live_wins)
    bezz_elim, pts_needed_vs_bezz = rival_is_eliminated(bezz_live_pts, bezz_live_wins)

    is_champion_live = martin_elim and bezz_elim
    extra_pts_needed = max(pts_needed_vs_martin, pts_needed_vs_bezz)

    return {
        "session_key": session_key,
        "session_label": cfg["label"],
        "is_sprint": is_sprint,
        "remaining_pts_after": rem_pts,
        "is_champion_live": is_champion_live,
        "extra_pts_needed": extra_pts_needed,
        "marc": {
            "pos": marc_pos,
            "race_pts": marc_race_pts,
            "live_pts": marc_live_pts,
            "live_wins": marc_live_wins,
        },
        "martin": {
            "pos": martin_pos,
            "race_pts": martin_race_pts,
            "live_pts": martin_live_pts,
            "live_wins": martin_live_wins,
            "gap_to_marc": marc_live_pts - martin_live_pts,
            "eliminated": martin_elim,
            "pts_needed_to_eliminate": pts_needed_vs_martin,
        },
        "bezzecchi": {
            "pos": bezzecchi_pos,
            "race_pts": bezz_race_pts,
            "live_pts": bezz_live_pts,
            "live_wins": bezz_live_wins,
            "gap_to_marc": marc_live_pts - bezz_live_pts,
            "eliminated": bezz_elim,
            "pts_needed_to_eliminate": pts_needed_vs_bezz,
        },
    }

# --- Finishing Position Formatting & Combinations ---
def format_points_breakdown(points: int) -> List[str]:
    """Returns sample realistic track finishing positions that achieve `points`."""
    if points <= 0:
        return ["DNF or outside points (P10+ Sprint, P16+ GP)"]

    options = []
    # Single race finishes
    for pos, pts in GP_POINTS.items():
        if pts == points:
            options.append(f"P{pos} in GP ({pts} pts)")
    for pos, pts in SPRINT_POINTS.items():
        if pts == points:
            options.append(f"P{pos} in Sprint ({pts} pts)")

    # Two-race combinations within a weekend (Sprint + GP)
    for sp_pos, sp_pts in SPRINT_POINTS.items():
        for gp_pos, gp_pts in GP_POINTS.items():
            if sp_pts + gp_pts == points and len(options) < 6:
                combo_str = f"P{sp_pos} Sprint ({sp_pts} pts) + P{gp_pos} GP ({gp_pts} pts)"
                if combo_str not in options:
                    options.append(combo_str)

    if not options:
        # Multi-race combinations
        options.append(f"Any combination totaling {points} pts")
    return options

def generate_portimao_clinch_table() -> List[Dict]:
    """Generates the full clinch table for the Portuguese Grand Prix."""
    rows = []
    for j_pts in range(37, -1, -1):
        m_needed = min_marquez_points_portimao(j_pts)
        samples = format_points_breakdown(m_needed)
        rows.append({
            "martin_pts": j_pts,
            "marquez_needed_pts": m_needed,
            "lead_after_portimao": 60 + m_needed - j_pts,
            "sample_finish": samples[0] if samples else "0 pts"
        })
    return rows

def calculate_permutations_summary() -> Dict:
    """
    Calculates exhaustive discrete permutations summary for valid finishing positions
    for Marc Márquez and Jorge Martín across both weekends.
    """
    sprint_positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, None]  # None = 0 pts
    gp_positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, None]

    # Portimao weekend finishes: (sprint_pos, gp_pos)
    portimao_finishes = list(itertools.product(sprint_positions, gp_positions))
    # Valencia weekend finishes
    valencia_finishes = list(itertools.product(sprint_positions, gp_positions))

    # Total 2-round finishes per rider = 10 * 16 * 10 * 16 = 25,600 possible race finishes
    # Let's count how many result in Marquez winning vs Martin winning
    total_scenarios = 0
    marquez_wins = 0
    clinch_portimao_count = 0

    # For fast calculation, group by total points scored
    marc_portimao_pt_counts: Dict[int, int] = {}
    for sp, gp in portimao_finishes:
        pts = get_sprint_points(sp) + get_gp_points(gp)
        marc_portimao_pt_counts[pts] = marc_portimao_pt_counts.get(pts, 0) + 1

    martin_portimao_pt_counts: Dict[int, int] = {}
    for sp, gp in portimao_finishes:
        pts = get_sprint_points(sp) + get_gp_points(gp)
        martin_portimao_pt_counts[pts] = martin_portimao_pt_counts.get(pts, 0) + 1

    marc_valencia_pt_counts: Dict[int, int] = {}
    for sp, gp in valencia_finishes:
        pts = get_sprint_points(sp) + get_gp_points(gp)
        marc_valencia_pt_counts[pts] = marc_valencia_pt_counts.get(pts, 0) + 1

    martin_valencia_pt_counts: Dict[int, int] = {}
    for sp, gp in valencia_finishes:
        pts = get_sprint_points(sp) + get_gp_points(gp)
        martin_valencia_pt_counts[pts] = martin_valencia_pt_counts.get(pts, 0) + 1

    # Portimao clinch count
    for m_pts, m_c in marc_portimao_pt_counts.items():
        for j_pts, j_c in martin_portimao_pt_counts.items():
            pair_count = m_c * j_c
            # Total 25,600 * 25,600 = 655,360,000 combinations
            # In Portimão:
            if m_pts >= j_pts - 23:
                clinch_portimao_count += pair_count * (len(valencia_finishes) ** 2)

    # Full 2-round win count
    # Marc total pts distribution:
    marc_total_counts: Dict[int, int] = {}
    for m_p, c1 in marc_portimao_pt_counts.items():
        for m_v, c2 in marc_valencia_pt_counts.items():
            tot = m_p + m_v
            marc_total_counts[tot] = marc_total_counts.get(tot, 0) + c1 * c2

    martin_total_counts: Dict[int, int] = {}
    for j_p, c1 in martin_portimao_pt_counts.items():
        for j_v, c2 in martin_valencia_pt_counts.items():
            tot = j_p + j_v
            martin_total_counts[tot] = martin_total_counts.get(tot, 0) + c1 * c2

    total_combinations = sum(marc_total_counts.values()) * sum(martin_total_counts.values())

    for m_tot, m_c in marc_total_counts.items():
        for j_tot, j_c in martin_total_counts.items():
            combos = m_c * j_c
            total_scenarios += combos
            # Marc wins if 431 + m_tot >= 371 + j_tot  <=>  m_tot >= j_tot - 60
            if m_tot >= j_tot - 60:
                marquez_wins += combos

    win_pct = (marquez_wins / total_scenarios) * 100 if total_scenarios else 0
    portimao_clinch_pct = (clinch_portimao_count / total_scenarios) * 100 if total_scenarios else 0

    return {
        "total_combinations": total_scenarios,
        "marquez_wins": marquez_wins,
        "win_percentage": win_pct,
        "martin_wins": total_scenarios - marquez_wins,
        "martin_win_percentage": 100.0 - win_pct,
        "clinch_in_portimao_pct": portimao_clinch_pct,
        "magic_number_points": 14,
    }

# --- CLI Presentation Functions ---
def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title.center(66)}")
    print("=" * 70)

def print_standings():
    print_header("CURRENT MOTOGP 2026 LEADERBOARD (As of Nov 18, 2026)")
    print(f"{'Pos':<4} {'#':<4} {'Rider':<22} {'Team':<30} {'Pts':<6} {'GP Wins':<8}")
    print("-" * 76)
    for idx, r in enumerate(CURRENT_STANDINGS, 1):
        status = ""
        if r.name == "Marc Márquez":
            status = " [LEADER]"
        elif r.name == "Jorge Martín":
            status = f" [-{431 - r.points}]"
        elif r.name == "Marco Bezzecchi":
            status = f" [-{431 - r.points}]"
        else:
            status = " [ELIMINATED]"
        print(f"{idx:<4} #{r.number:<3} {r.name + status:<22} {r.team:<30} {r.points:<6} {r.gp_wins:<8}")
    print("-" * 76)

def print_remaining_tracks():
    print_header("REMAINING TRACKS ON THE 2026 CALENDAR")
    for t in REMAINING_TRACKS:
        print(f"Round {t['round']}: {t['name']}")
        print(f"  Circuit:  {t['circuit']}")
        print(f"  Dates:    {t['dates']}")
        print(f"  Specs:    {t['length_km']} km, {t['turns']} turns | Sprint: {t['laps_sprint']} laps, GP: {t['laps_gp']} laps")
        print(f"  Max Pts:  {t['max_points']} points available (Sprint: 12, GP: 25)\n")

def print_magic_rules():
    print_header("CHAMPIONSHIP MATHEMATICS & TIE-BREAKER SUMMARY")
    print("""
Key Facts & Magic Numbers:
• Current Points: Marc Márquez (431) | Jorge Martín (371, -60) | Marco Bezzecchi (357, -74)
• Remaining Points: 74 points maximum across Portugal and Valencia (2x Sprint: 12, 2x GP: 25)
• Tie-Break Rule (FIM 1.28.7): Decided by Sunday Grand Prix wins (Sprint wins DO NOT count).
  - Marc Márquez: 7 GP wins
  - Jorge Martín: 1 GP win (can reach at most 3 wins)
  -> Marc Márquez ALWAYS wins the tie-break against Jorge Martín on equal points!

• THE MAGIC 14:
  - Jorge Martín's maximum possible points: 371 + 74 = 445.
  - Marc Márquez needs only 14 points (431 + 14 = 445) to GUARANTEE the championship,
    even if Jorge Martín wins every single remaining race!
  - 14 points is less than a 3rd place in a single Sunday GP (16 pts)!

• MATCH POINT IN PORTIMÃO (Round 21):
  - After Portimão, only 37 points remain in Valencia.
  - Marc clinches the title in Portimão if he leaves leading by >= 37 points.
  - Lead equation: Marc Clinches if (Marc Portimão Pts) >= (Martín Portimão Pts) - 23.
  - If Martín scores 37: Marc clinches with >= 14 pts.
  - If Martín scores 25 (e.g. wins GP, 0 in Sprint): Marc clinches with >= 2 pts.
  - If Martín scores <= 23: Marc clinches even if Marc scores 0 points!
""")

def print_portimao_clinch_matrix():
    print_header("PORTIMÃO (ROUND 21) CLINCH MATRIX")
    print("If Jorge Martín scores [X] pts in Portimão, Marc Márquez needs [Y] pts to clinch:")
    print(f"{'Martín Portimão Pts':<22} {'Marc Needs (Min)':<18} {'Sample Minimum Result':<35}")
    print("-" * 75)
    key_points = [37, 34, 31, 28, 25, 22, 20, 16, 13, 11, 9, 7, 5, 0]
    for j_pts in key_points:
        m_pts = min_marquez_points_portimao(j_pts)
        samples = format_points_breakdown(m_pts)
        sample_str = samples[0] if samples else "0 pts"
        print(f"{j_pts:<22} {m_pts:<18} {sample_str:<35}")
    print("-" * 75)

def simulate_custom(m_port_sp: Optional[int], m_port_gp: Optional[int],
                    m_val_sp: Optional[int], m_val_gp: Optional[int],
                    j_port_sp: Optional[int], j_port_gp: Optional[int],
                    j_val_sp: Optional[int], j_val_gp: Optional[int]):
    """Simulates a custom race scenario and prints detailed results."""
    m_p_sp = get_sprint_points(m_port_sp)
    m_p_gp = get_gp_points(m_port_gp)
    m_port_total = m_p_sp + m_p_gp

    m_v_sp = get_sprint_points(m_val_sp)
    m_v_gp = get_gp_points(m_val_gp)
    m_val_total = m_v_sp + m_v_gp

    m_total_pts = m_port_total + m_val_total
    m_final = 431 + m_total_pts

    j_p_sp = get_sprint_points(j_port_sp)
    j_p_gp = get_gp_points(j_port_gp)
    j_port_total = j_p_sp + j_p_gp

    j_v_sp = get_sprint_points(j_val_sp)
    j_v_gp = get_gp_points(j_val_gp)
    j_val_total = j_v_sp + j_v_gp

    j_total_pts = j_port_total + j_val_total
    j_final = 371 + j_total_pts

    print_header("CUSTOM SCENARIO SIMULATION RESULT")
    print(f"ROUND 21: PORTIMÃO")
    print(f"  Marc Márquez:  Sprint P{m_port_sp or 'DNF'} ({m_p_sp} pts) | GP P{m_port_gp or 'DNF'} ({m_p_gp} pts) => {m_port_total} pts")
    print(f"  Jorge Martín:  Sprint P{j_port_sp or 'DNF'} ({j_p_sp} pts) | GP P{j_port_gp or 'DNF'} ({j_p_gp} pts) => {j_port_total} pts")
    portimao_gap = (431 + m_port_total) - (371 + j_port_total)
    clinched_portimao = portimao_gap >= 37
    print(f"  Lead after Portimão: {portimao_gap} pts " + ("[CHAMPIONSHIP CLINCHED IN PORTIMÃO!]" if clinched_portimao else "[Title fight continues to Valencia]"))

    print(f"\nROUND 22: VALENCIA")
    print(f"  Marc Márquez:  Sprint P{m_val_sp or 'DNF'} ({m_v_sp} pts) | GP P{m_val_gp or 'DNF'} ({m_v_gp} pts) => {m_val_total} pts")
    print(f"  Jorge Martín:  Sprint P{j_val_sp or 'DNF'} ({j_v_sp} pts) | GP P{j_val_gp or 'DNF'} ({j_v_gp} pts) => {j_val_total} pts")

    print(f"\nFINAL STANDINGS:")
    print(f"  1. Marc Márquez:  {m_final} pts (+{m_total_pts} scored)")
    print(f"  2. Jorge Martín:  {j_final} pts (+{j_total_pts} scored)")
    final_gap = m_final - j_final
    print(f"  Points Margin:    {final_gap} pts")

    if m_final > j_final:
        print("\n🏆 VERDICT: MARC MÁRQUEZ WINS THE 2026 MOTOGP WORLD CHAMPIONSHIP!")
    elif m_final == j_final:
        print("\n🏆 VERDICT: MARC MÁRQUEZ WINS THE 2026 WORLD CHAMPIONSHIP ON TIE-BREAKER!")
        print("  (Tie broken by Sunday GP wins: Marc Márquez has 7 vs Jorge Martín's max 3)")
    else:
        print("\n❌ VERDICT: Jorge Martín wins the 2026 MotoGP World Championship.")

def main():
    parser = argparse.ArgumentParser(description="MotoGP 2026 Marc Marquez Championship Calculator")
    parser.add_argument("command", nargs="?", default="all",
                        choices=["all", "standings", "tracks", "clinch", "summary", "simulate"],
                        help="Action to perform")
    parser.add_argument("--marc-port-sp", type=int, default=3, help="Marc finish in Portimao Sprint (1-9)")
    parser.add_argument("--marc-port-gp", type=int, default=3, help="Marc finish in Portimao GP (1-15)")
    parser.add_argument("--marc-val-sp", type=int, default=5, help="Marc finish in Valencia Sprint (1-9)")
    parser.add_argument("--marc-val-gp", type=int, default=5, help="Marc finish in Valencia GP (1-15)")

    parser.add_argument("--martin-port-sp", type=int, default=1, help="Martin finish in Portimao Sprint (1-9)")
    parser.add_argument("--martin-port-gp", type=int, default=1, help="Martin finish in Portimao GP (1-15)")
    parser.add_argument("--martin-val-sp", type=int, default=1, help="Martin finish in Valencia Sprint (1-9)")
    parser.add_argument("--martin-val-gp", type=int, default=1, help="Martin finish in Valencia GP (1-15)")

    args = parser.parse_args()

    if args.command == "standings":
        print_standings()
    elif args.command == "tracks":
        print_remaining_tracks()
    elif args.command == "clinch":
        print_portimao_clinch_matrix()
    elif args.command == "summary":
        summary = calculate_permutations_summary()
        print_header("STATISTICAL COMBINATIONS SUMMARY")
        print(f"Total Discrete Race Finishes Combinations: {summary['total_combinations']:,}")
        print(f"Marc Márquez Championship Win Probability:  {summary['win_percentage']:.4f}% ({summary['marquez_wins']:,} / {summary['total_combinations']:,})")
        print(f"Marc Márquez Clinches in Portimão:          {summary['clinch_in_portimao_pct']:.2f}%")
        print(f"Absolute Magic Number (Points needed):      {summary['magic_number_points']} pts")
    elif args.command == "simulate":
        simulate_custom(args.marc_port_sp, args.marc_port_gp, args.marc_val_sp, args.marc_val_gp,
                        args.martin_port_sp, args.martin_port_gp, args.martin_val_sp, args.martin_val_gp)
    else:
        # Default: show complete analysis
        print_standings()
        print_remaining_tracks()
        print_magic_rules()
        print_portimao_clinch_matrix()
        summary = calculate_permutations_summary()
        print_header("EXHAUSTIVE OUTCOME SPACE ANALYSIS")
        print(f"• Total Race Position Combinations: {summary['total_combinations']:,}")
        print(f"• Marc Márquez Championship Win Rate: {summary['win_percentage']:.4f}% ({summary['marquez_wins']:,} / {summary['total_combinations']:,})")
        print(f"• Title Clinched Early in Portimão:    {summary['clinch_in_portimao_pct']:.2f}% of all combinations")
        print(f"• Absolute Magic Number:             {summary['magic_number_points']} pts (100% title guarantee)")

if __name__ == "__main__":
    main()
