#!/usr/bin/env python3
"""
Unit tests for the MotoGP 2026 Championship Calculator.
"""

import unittest
from motogp_calc import (
    get_sprint_points,
    get_gp_points,
    check_tiebreak,
    does_marquez_win,
    does_marquez_clinch_portimao,
    min_marquez_points_overall,
    min_marquez_points_portimao,
    calculate_permutations_summary,
    evaluate_live_race_state,
    CURRENT_STANDINGS,
    REMAINING_TRACKS
)

class TestMotoGPCalculator(unittest.TestCase):

    def test_sprint_scoring_system(self):
        """Verify official MotoGP Sprint points distribution (1st to 9th)."""
        expected = {
            1: 12, 2: 9, 3: 7, 4: 6, 5: 5,
            6: 4, 7: 3, 8: 2, 9: 1, 10: 0, 11: 0, None: 0
        }
        for pos, pts in expected.items():
            self.assertEqual(get_sprint_points(pos), pts)

    def test_gp_scoring_system(self):
        """Verify official MotoGP Grand Prix points distribution (1st to 15th)."""
        expected = {
            1: 25, 2: 20, 3: 16, 4: 13, 5: 11,
            6: 10, 7: 9, 8: 8, 9: 7, 10: 6,
            11: 5, 12: 4, 13: 3, 14: 2, 15: 1,
            16: 0, 20: 0, None: 0
        }
        for pos, pts in expected.items():
            self.assertEqual(get_gp_points(pos), pts)

    def test_fim_tiebreak_rule(self):
        """Verify FIM 1.28.7 rule: Sunday GP wins break ties."""
        # Marc (445 pts, 7 GP wins) vs Martin (445 pts, 3 GP wins)
        self.assertEqual(check_tiebreak(445, 7, 445, 3), 1)

        # Equal points, Rider B has more wins
        self.assertEqual(check_tiebreak(431, 7, 431, 8), -1)

        # Rider A has more points
        self.assertEqual(check_tiebreak(432, 7, 431, 8), 1)

    def test_magic_14_points(self):
        """
        Proof of Magic 14:
        If Jorge Martin scores the maximum possible (74 points = 445),
        Marc Marquez scoring 14 points (445 points) wins the title via tie-break.
        """
        # Martin sweeps everything (74 pts, +2 GP wins -> 3 GP wins)
        # Marc scores 14 pts
        self.assertTrue(does_marquez_win(marc_pts_earned=14, martin_pts_earned=74, bezzecchi_pts_earned=0,
                                        martin_gp_wins_added=2, bezzecchi_gp_wins_added=0))

        # Marc scores 13 pts, Martin scores 74 pts -> Martin wins (445 vs 444)
        self.assertFalse(does_marquez_win(marc_pts_earned=13, martin_pts_earned=74, bezzecchi_pts_earned=0,
                                         martin_gp_wins_added=2, bezzecchi_gp_wins_added=0))

    def test_portimao_clinch_conditions(self):
        """
        Portimão Clinch Conditions:
        Lead after Portimao must be >= 37 points.
        Initial lead = 60 points.
        Marc clinches if Marc_pts >= Martin_pts - 23.
        """
        # Martin scores 37 (wins all in Portimao): Marc needs 14
        self.assertEqual(min_marquez_points_portimao(37), 14)
        self.assertTrue(does_marquez_clinch_portimao(14, 37, 0))
        self.assertFalse(does_marquez_clinch_portimao(13, 37, 0))

        # Martin scores 25 (wins GP, 0 in sprint): Marc needs 2
        self.assertEqual(min_marquez_points_portimao(25), 2)
        self.assertTrue(does_marquez_clinch_portimao(2, 25, 0))
        self.assertFalse(does_marquez_clinch_portimao(1, 25, 0))

        # Martin scores 23 or fewer: Marc clinches with 0 points
        self.assertEqual(min_marquez_points_portimao(23), 0)
        self.assertEqual(min_marquez_points_portimao(10), 0)
        self.assertEqual(min_marquez_points_portimao(0), 0)
        self.assertTrue(does_marquez_clinch_portimao(0, 23, 0))

    def test_overall_minimum_points(self):
        """Verify min points needed across both rounds for various Martin point totals."""
        # Martin scores 74 -> Marc needs 14
        self.assertEqual(min_marquez_points_overall(74), 14)
        # Martin scores 60 -> Marc needs 0 (tiebreak win at 431)
        self.assertEqual(min_marquez_points_overall(60), 0)
        # Martin scores 50 -> Marc needs 0
        self.assertEqual(min_marquez_points_overall(50), 0)
        # Martin scores 65 -> Marc needs 5
        self.assertEqual(min_marquez_points_overall(65), 5)

    def test_permutation_summary_validity(self):
        """Verify permutation statistics."""
        summary = calculate_permutations_summary()
        self.assertEqual(summary["total_combinations"], 655360000)
        self.assertGreater(summary["win_percentage"], 99.99)
        self.assertEqual(summary["magic_number_points"], 14)

    def test_current_standings_integrity(self):
        """Check top 3 riders and their point gap."""
        marc = CURRENT_STANDINGS[0]
        martin = CURRENT_STANDINGS[1]
        bezzecchi = CURRENT_STANDINGS[2]

        self.assertEqual(marc.name, "Marc Márquez")
        self.assertEqual(marc.points, 431)
        self.assertEqual(marc.gp_wins, 7)

        self.assertEqual(martin.name, "Jorge Martín")
        self.assertEqual(martin.points, 371)
        self.assertEqual(marc.points - martin.points, 60)

        self.assertEqual(bezzecchi.name, "Marco Bezzecchi")
        self.assertEqual(bezzecchi.points, 357)
        self.assertEqual(marc.points - bezzecchi.points, 74)

    def test_live_portimao_sprint_clinch(self):
        """
        In Portimão Sprint, 62 pts remain afterwards (Portimão GP 25 + Valencia 37).
        Starting gap is 60 pts (431 vs 371).
        Marc clinches on Saturday if he outscores Martín by >= 2 pts (reaching >= 62 lead)
        AND eliminates Bezzecchi.
        """
        # Marc P3 (+7 -> 438), Martin P4 (+6 -> 377), Bezzecchi P1 (+12 -> 369)
        # Gap vs Martin = 61 < 62 -> NOT clinched (needs 1 more pt)
        res = evaluate_live_race_state("portimao_sprint", marc_pos=3, martin_pos=4, bezzecchi_pos=1)
        self.assertFalse(res["is_champion_live"])
        self.assertEqual(res["extra_pts_needed"], 1)
        self.assertFalse(res["martin"]["eliminated"])
        self.assertTrue(res["bezzecchi"]["eliminated"])  # 369 + 62 = 431 < 438

        # Marc P2 (+9 -> 440), Martin P3 (+7 -> 378), Bezzecchi P1 (+12 -> 369)
        # Gap vs Martin = 62 -> CLINCHED via FIM GP wins tiebreaker!
        res2 = evaluate_live_race_state("portimao_sprint", marc_pos=2, martin_pos=3, bezzecchi_pos=1)
        self.assertTrue(res2["is_champion_live"])
        self.assertEqual(res2["extra_pts_needed"], 0)
        self.assertTrue(res2["martin"]["eliminated"])
        self.assertTrue(res2["bezzecchi"]["eliminated"])

        # Marc P1 (+12 -> 443), Martin DNF (0 -> 371), Bezzecchi P2 (+9 -> 366)
        # Gap = 72 -> CLINCHED with huge cushion
        res3 = evaluate_live_race_state("portimao_sprint", marc_pos=1, martin_pos=None, bezzecchi_pos=2)
        self.assertTrue(res3["is_champion_live"])
        self.assertEqual(res3["marc"]["live_pts"], 443)
        self.assertEqual(res3["martin"]["gap_to_marc"], 72)

    def test_live_portimao_gp_bezzecchi_tiebreak_edge_case(self):
        """
        Suppose after Portimão Sprint, Marc is still 431, Martin is 371, Bezzecchi won Sprint (369).
        In Portimão GP: Marc DNF (0 -> 431), Martin DNF (0 -> 371), Bezzecchi P1 (+25 -> 394, 7 GP wins).
        Remaining = 37 pts (Valencia).
        Bezzecchi max final = 394 + 37 = 431 pts AND max GP wins = 7 + 1 = 8 > Marc's 7!
        So Marc has NOT clinched!
        """
        res = evaluate_live_race_state(
            "portimao_gp",
            marc_pos=None,
            martin_pos=None,
            bezzecchi_pos=1,
            marc_base_pts=431,
            martin_base_pts=371,
            bezzecchi_base_pts=369,
        )
        self.assertTrue(res["martin"]["eliminated"])
        self.assertFalse(res["bezzecchi"]["eliminated"])
        self.assertFalse(res["is_champion_live"])
        self.assertEqual(res["extra_pts_needed"], 1)

        # If Marc finishes P15 (+1 -> 432), Bezzecchi max is 431 -> Marc CLINCHES!
        res2 = evaluate_live_race_state(
            "portimao_gp",
            marc_pos=15,
            martin_pos=None,
            bezzecchi_pos=1,
            marc_base_pts=431,
            martin_base_pts=371,
            bezzecchi_base_pts=369,
        )
        self.assertTrue(res2["is_champion_live"])

    def test_live_valencia_gp_finale(self):
        """In Valencia GP (0 pts remaining), equal points with Martin -> Marc wins on GP wins tiebreaker."""
        # Suppose entering Valencia GP: Marc 431, Martin 420.
        # In Valencia GP: Martin P1 (+25 -> 445, 2 GP wins), Marc P3 (+16 -> 447) -> Marc wins outright
        res = evaluate_live_race_state(
            "valencia_gp",
            marc_pos=3,
            martin_pos=1,
            bezzecchi_pos=2,
            marc_base_pts=431,
            martin_base_pts=420,
            bezzecchi_base_pts=380,
        )
        self.assertTrue(res["is_champion_live"])

        # Exact tie at 445: Marc P4 (+13 -> 444) vs Martin P1 (+25 -> 445) -> Martin ahead!
        res2 = evaluate_live_race_state(
            "valencia_gp",
            marc_pos=4,
            martin_pos=1,
            bezzecchi_pos=2,
            marc_base_pts=431,
            martin_base_pts=420,
            bezzecchi_base_pts=380,
        )
        self.assertFalse(res2["is_champion_live"])
        self.assertEqual(res2["extra_pts_needed"], 1)

if __name__ == "__main__":
    unittest.main()
