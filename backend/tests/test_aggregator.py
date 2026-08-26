import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.aggregator import DataAggregator


def make_payload(**overrides):
    payload = {
        "email": "jane@company.com",
        "full_name": "Jane Doe",
        "role": "Developer",
        "interval_seconds": 5,
        "process_name": "Code.exe",
        "window_title": "main.py - Visual Studio Code",
        "active_url": None,
        "is_idle": False,
    }
    payload.update(overrides)
    return payload


def test_process_heartbeat_creates_new_employee():
    aggregator = DataAggregator()
    result = aggregator.process_heartbeat(make_payload())

    assert "jane@company.com" in aggregator.employees
    assert result["category"] == "PRODUCTIVE"
    emp = aggregator.employees["jane@company.com"]
    assert emp["total_active_seconds"] == 5
    assert emp["other_productive_seconds"] == 5


def test_process_heartbeat_accumulates_core_work_seconds():
    aggregator = DataAggregator()
    aggregator.process_heartbeat(make_payload(window_title="Control ID Tool - Inspection #1"))
    aggregator.process_heartbeat(make_payload(window_title="Control ID Tool - Inspection #2"))

    emp = aggregator.employees["jane@company.com"]
    assert emp["control_id_seconds"] == 10
    assert emp["total_active_seconds"] == 10


def test_process_heartbeat_tracks_idle_separately():
    aggregator = DataAggregator()
    aggregator.process_heartbeat(make_payload(is_idle=True))

    emp = aggregator.employees["jane@company.com"]
    assert emp["total_idle_seconds"] == 5
    assert emp["total_active_seconds"] == 0


def test_process_heartbeat_flags_entertainment():
    aggregator = DataAggregator()
    aggregator.process_heartbeat(make_payload(
        process_name="chrome.exe",
        window_title="Cat video - YouTube",
        active_url="https://www.youtube.com/watch?v=xyz",
    ))

    emp = aggregator.employees["jane@company.com"]
    assert emp["unproductive_seconds"] == 5


def test_get_summary_stats_returns_dict():
    aggregator = DataAggregator()
    aggregator.process_heartbeat(make_payload())
    summary = aggregator.get_summary_stats()
    assert isinstance(summary, dict)
