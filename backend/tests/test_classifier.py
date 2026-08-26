import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.classifier import ActivityClassifier


def test_control_id_tool_by_title():
    classifier = ActivityClassifier()
    category, name, weight = classifier.classify("chrome.exe", "Control ID Tool - Inspection #421")
    assert category == "CORE_WORK"
    assert weight == 100


def test_youtube_by_domain():
    classifier = ActivityClassifier()
    category, name, weight = classifier.classify(
        "chrome.exe", "Some Video - YouTube", active_url="https://www.youtube.com/watch?v=abc"
    )
    assert category == "ENTERTAINMENT"
    assert name == "YouTube"
    assert weight == -100


def test_code_editor_is_productive():
    classifier = ActivityClassifier()
    category, name, weight = classifier.classify("Code.exe", "main.py - Visual Studio Code")
    assert category == "PRODUCTIVE"
    assert weight == 100


def test_unknown_process_defaults_to_neutral():
    classifier = ActivityClassifier()
    category, name, weight = classifier.classify("some_random_tool.exe", "Untitled Window")
    assert category == "NEUTRAL"
    assert weight == 0


def test_browser_without_known_url_is_neutral():
    classifier = ActivityClassifier()
    category, name, weight = classifier.classify("chrome.exe", "New Tab")
    assert category == "NEUTRAL"
    assert name == "Web Browser"
