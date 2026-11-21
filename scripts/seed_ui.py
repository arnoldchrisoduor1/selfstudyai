"""Seed local SQLite with rich demo data for UI visualization."""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "selfstudy.db"

NOW = datetime.now(timezone.utc)
ISO = NOW.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def uid() -> str:
    return str(uuid.uuid4())


def day(offset: int) -> str:
    return (NOW.date() + timedelta(days=offset)).isoformat()


def ts(offset_days: int = 0, hour: int = 12) -> str:
    d = NOW + timedelta(days=offset_days)
    d = d.replace(hour=hour, minute=0, second=0, microsecond=0)
    return d.isoformat().replace("+00:00", "Z")


def main() -> None:
    if not DB.exists():
        raise SystemExit(f"missing db: {DB}")

    con = sqlite3.connect(DB)
    cur = con.cursor()
    tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    print("tables:", len(tables))

    wipe = [
        "integrity_events",
        "test_questions",
        "review_logs",
        "points_ledger",
        "daily_activity",
        "card_states",
        "attempts",
        "session_questions",
        "study_sessions",
        "tests",
        "questions",
        "chunk_embeddings",
        "chunks",
        "topics",
        "sources",
        "goals",
        "subjects",
        "local_profile",
        "usage_events",
        "credit_reservations",
        "credits_ledger",
        "auth_sessions",
        "email_tokens",
        "sync_cursors",
        "users",
        "settings",
    ]
    for t in wipe:
        if t in tables:
            cur.execute(f"DELETE FROM {t}")

    cur.execute(
        "INSERT INTO local_profile (id, display_name, created_at, updated_at, version) VALUES (?,?,?,?,1)",
        (uid(), "Alex Learner", ISO, ISO),
    )

    sub_cs, sub_hist, sub_bio = uid(), uid(), uid()
    for sid, name, desc in [
        (sub_cs, "Computer Science", "Algorithms, systems, and practical coding."),
        (sub_hist, "World History", "Modern eras and primary sources."),
        (sub_bio, "Biology", "Cells, genetics, and physiology."),
    ]:
        cur.execute(
            "INSERT INTO subjects (id, name, description, created_at, updated_at, version) VALUES (?,?,?,?,?,1)",
            (sid, name, desc, ISO, ISO),
        )

    for sid, title in [
        (sub_cs, "Ship spaced-review habit"),
        (sub_hist, "Cover 20th century timeline"),
        (sub_bio, "Master cell division"),
    ]:
        cur.execute(
            "INSERT INTO goals (id, subject_id, title, created_at, updated_at, version) VALUES (?,?,?,?,?,1)",
            (uid(), sid, title, ISO, ISO),
        )

    src_cs, src_hist, src_bio = uid(), uid(), uid()
    for sid, subject_id, title, kind, file_name in [
        (src_cs, sub_cs, "Algorithms Notes", "notes", "algorithms.md"),
        (src_hist, sub_hist, "Cold War Primer", "book", "cold-war.md"),
        (src_bio, sub_bio, "Mitosis Lab Notes", "notes", "mitosis.md"),
    ]:
        cur.execute(
            """INSERT INTO sources (
                id, subject_id, title, kind, file_name, content_hash, status,
                error, progress, needs_reembed, created_at, updated_at, version
            ) VALUES (?,?,?,?,?,?, 'ready', NULL, 100, 0, ?, ?, 1)""",
            (sid, subject_id, title, kind, file_name, f"hash-{uid()}", ISO, ISO),
        )

    topic_cs, topic_hist, topic_bio = uid(), uid(), uid()
    for tid, source_id, title, position in [
        (topic_cs, src_cs, "Graph algorithms", 0),
        (topic_hist, src_hist, "Cold War alliances", 0),
        (topic_bio, src_bio, "Mitosis phases", 0),
    ]:
        cur.execute(
            """INSERT INTO topics (
                id, source_id, parent_id, title, position, is_core, created_at, updated_at, version
            ) VALUES (?,?,NULL,?,?,1,?,?,1)""",
            (tid, source_id, title, position, ISO, ISO),
        )

    for source_id, topic_id, position, text in [
        (src_cs, topic_cs, 0, "BFS explores neighbors level by level using a queue."),
        (src_cs, topic_cs, 1, "Dijkstra finds shortest paths with non-negative edge weights."),
        (src_hist, topic_hist, 0, "NATO formed in 1949 as a collective defense alliance."),
        (src_hist, topic_hist, 1, "The Warsaw Pact answered NATO with a Soviet-led bloc."),
        (src_bio, topic_bio, 0, "Prophase condenses chromosomes; the nuclear envelope breaks down."),
        (src_bio, topic_bio, 1, "Anaphase pulls sister chromatids toward opposite poles."),
    ]:
        cur.execute(
            """INSERT INTO chunks (
                id, source_id, topic_id, position, text, token_count, page_ref, created_at, updated_at, version
            ) VALUES (?,?,?,?,?,?,NULL,?,?,1)""",
            (uid(), source_id, topic_id, position, text, len(text.split()), ISO, ISO),
        )

    q_rows: list[str] = []
    defs = [
        (sub_cs, src_cs, topic_cs, "mcq", "Which structure does BFS use?",
         ["Stack", "Queue", "Heap", "Tree"], "Queue",
         "BFS uses a queue to visit nodes level by level."),
        (sub_cs, src_cs, topic_cs, "mcq", "Dijkstra requires edge weights to be:",
         ["Negative", "Non-negative", "Integer only", "Zero"], "Non-negative",
         "Classic Dijkstra assumes non-negative weights."),
        (sub_cs, src_cs, topic_cs, "written", "Explain why BFS finds shortest paths in unweighted graphs.",
         None, None, "Each edge has equal cost, so first visit is minimal hops."),
        (sub_hist, src_hist, topic_hist, "mcq", "NATO was founded in:",
         ["1945", "1949", "1955", "1961"], "1949",
         "NATO was established in 1949."),
        (sub_hist, src_hist, topic_hist, "written", "What problem did the Warsaw Pact address for the USSR?",
         None, None, "It formalized a Soviet-led military counterweight to NATO."),
        (sub_bio, src_bio, topic_bio, "mcq", "Sister chromatids separate during:",
         ["Prophase", "Metaphase", "Anaphase", "Telophase"], "Anaphase",
         "Anaphase separates sister chromatids."),
        (sub_bio, src_bio, topic_bio, "written", "Describe what happens in prophase.",
         None, None, "Chromosomes condense and the nuclear envelope breaks down."),
        (sub_cs, src_cs, topic_cs, "mcq", "A priority queue is essential to:",
         ["BFS", "DFS", "Dijkstra", "Binary search"], "Dijkstra",
         "Dijkstra repeatedly extracts the closest unsettled node."),
    ]
    for subject_id, source_id, topic_id, kind, stem, options, correct, explanation in defs:
        qid = uid()
        q_rows.append(qid)
        is_gold = 1 if "Dijkstra" in stem and kind == "mcq" else 0
        cur.execute(
            """INSERT INTO questions (
                id, subject_id, source_id, topic_id, kind, cognitive_level, stem,
                options, correct_option, model_answer, explanation, grounding, citations,
                is_gold, gold_status, status, generated_by, prompt_version, created_at, version
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
            (
                qid,
                subject_id,
                source_id,
                topic_id,
                kind,
                "remember" if kind == "mcq" else "understand",
                stem,
                json.dumps(options) if options else None,
                correct,
                explanation if kind == "written" else None,
                explanation,
                "notes",
                json.dumps([{"source_id": source_id, "excerpt": text_excerpt(stem)}]),
                is_gold,
                "confirmed" if is_gold else "none",
                "active",
                "seed",
                "ui-1",
                ISO,
            ),
        )

    session_id = uid()
    cur.execute(
        """INSERT INTO study_sessions (
            id, subject_id, scope, grounding_mode, burst_size, started_at, ended_at, mode, version
        ) VALUES (?,?,?,?,?,?,NULL,'practice',1)""",
        (
            session_id,
            sub_cs,
            json.dumps({"source_ids": [src_cs], "topic_ids": [topic_cs]}),
            "notes",
            4,
            ts(-1, 10),
        ),
    )
    for i, qid in enumerate(q_rows[:4]):
        cur.execute(
            """INSERT INTO session_questions (
                id, session_id, question_id, burst_index, position, item_kind, version
            ) VALUES (?,?,?,?,?,'review',1)""",
            (uid(), session_id, qid, 0, i),
        )

    attempt_ids: list[str] = []
    for i, qid in enumerate(q_rows):
        aid = uid()
        attempt_ids.append(aid)
        score = 0.55 + (i % 5) * 0.1
        verdict = "correct" if score >= 0.7 else "partial"
        created = ts(-(i % 12), 14 + (i % 3))
        cur.execute(
            """INSERT INTO attempts (
                id, question_id, session_id, test_id, answer_text, selected_option,
                score, verdict, feedback, graded_by, confidence, original_score,
                original_verdict, time_taken_ms, created_at, version
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
            (
                aid,
                qid,
                session_id if i < 4 else None,
                None,
                "seed answer",
                "Queue" if i == 0 else None,
                score,
                verdict,
                "Seeded feedback for UI.",
                "seed",
                0.8,
                score,
                verdict,
                12000 + i * 500,
                created,
            ),
        )

    for i, qid in enumerate(q_rows):
        due_offset = -2 if i % 3 == 0 else (0 if i % 3 == 1 else 3)
        cur.execute(
            """INSERT INTO card_states (
                id, question_id, due, stability, difficulty, state, reps, lapses,
                last_review, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                uid(),
                qid,
                ts(due_offset, 9),
                2.5 + i * 0.3,
                5.0,
                "review" if i > 1 else "learning",
                1 + i,
                i // 4,
                ts(-1, 15),
                ISO,
                ISO,
            ),
        )

    # Heatmap: 60 days, strong streak last 8 days
    for offset in range(-60, 1):
        if offset >= -7:
            answered = 6 + (abs(offset) % 3)
            goal_met = 1
        elif offset % 5 == 0:
            answered = 0
            goal_met = 0
        else:
            answered = 1 + (abs(offset) % 5)
            goal_met = 1 if answered >= 4 else 0
        points = answered * 12
        cur.execute(
            """INSERT INTO daily_activity (
                id, date, questions_answered, points_earned, minutes_studied, goal_met, version
            ) VALUES (?,?,?,?,?,?,1)""",
            (uid(), day(offset), answered, points, answered * 3, goal_met),
        )

    # Points ledger — one row per day, no attempt collision except first few unique awards
    for i, aid in enumerate(attempt_ids):
        cur.execute(
            """INSERT INTO points_ledger (
                id, amount, reason, attempt_id, test_id, multiplier_breakdown, created_at, version
            ) VALUES (?,?,?,?,NULL,?,?,1)""",
            (
                uid(),
                15 + i * 3,
                "answer",
                aid,
                json.dumps({"base": 10, "streak": 1.2}),
                ts(-(i % 10), 18),
            ),
        )
    for offset in range(-60, 0):
        cur.execute(
            """INSERT INTO points_ledger (
                id, amount, reason, attempt_id, test_id, multiplier_breakdown, created_at, version
            ) VALUES (?,?,?,?,NULL,?,?,1)""",
            (
                uid(),
                8 + (abs(offset) % 20),
                "daily_seed",
                None,
                json.dumps({"base": 8}),
                ts(offset, 19),
            ),
        )

    for i, (status, score, integrity) in enumerate(
        [
            ("submitted", 0.82, "clean"),
            ("submitted", 0.64, "flagged"),
            ("draft", None, "unverified"),
        ]
    ):
        tid = uid()
        cur.execute(
            """INSERT INTO tests (
                id, subject_id, config, status, started_at, submitted_at, time_limit_s,
                score, pass, integrity_status, created_at, updated_at, version
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)""",
            (
                tid,
                sub_cs if i < 2 else sub_bio,
                json.dumps(
                    {
                        "question_count": 5,
                        "kinds": ["mcq", "written"],
                        "pass_threshold": 0.7,
                        "focus_mode": True,
                    }
                ),
                status,
                ts(-3 + i, 11),
                ts(-3 + i, 12) if status == "submitted" else None,
                1800,
                score,
                1 if score and score >= 0.7 else (0 if score is not None else None),
                integrity,
                ts(-3 + i, 10),
                ts(-3 + i, 12),
            ),
        )
        for pos, qid in enumerate(q_rows[i : i + 3]):
            cur.execute(
                "INSERT INTO test_questions (id, test_id, question_id, position, version) VALUES (?,?,?,?,1)",
                (uid(), tid, qid, pos),
            )
        if integrity == "flagged":
            cur.execute(
                "INSERT INTO integrity_events (id, test_id, kind, at, meta, version) VALUES (?,?,?,?,?,1)",
                (uid(), tid, "blur", ts(-2, 11), json.dumps({"count": 2})),
            )

    for key, value in [
        ("learning_daily_goal", "10"),
        ("learning_timezone", "UTC"),
        ("learning_desired_retention", "0.9"),
        ("learning_new_questions_per_day", "5"),
    ]:
        cur.execute(
            "INSERT INTO settings (id, setting_key, value, created_at, updated_at, version) VALUES (?,?,?,?,?,1)",
            (uid(), key, value, ISO, ISO),
        )

    user_id = uid()
    cur.execute(
        "INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES (?,?,?,1,?,?)",
        (user_id, "demo@selfstudy.local", "seed-not-for-login", ISO, ISO),
    )
    cur.execute(
        "INSERT INTO credits_ledger (id, user_id, amount, kind, reference, created_at) VALUES (?,?,?,?,?,?)",
        (uid(), user_id, 500, "topup", "seed", ISO),
    )

    con.commit()

    counts = {}
    for t in [
        "subjects",
        "sources",
        "topics",
        "chunks",
        "questions",
        "card_states",
        "daily_activity",
        "points_ledger",
        "tests",
        "study_sessions",
        "attempts",
    ]:
        counts[t] = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print("seeded:", counts)
    print("open_session_id:", session_id)
    print("tip: set localStorage self-study-active-session =", session_id)
    print("db:", DB)
    con.close()


def text_excerpt(stem: str) -> str:
    return stem[:48]


if __name__ == "__main__":
    main()
