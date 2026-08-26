import re
from typing import Tuple, Dict, Any, Optional

DEFAULT_RULES = [
    # 1. Core Target Work Tool (Highest Priority)
    {"pattern": r"control\s*id", "match_type": "TITLE", "category": "CORE_WORK", "display_name": "Control ID Tool", "weight": 100},
    {"pattern": r"^controlid(\.exe)?$", "match_type": "PROCESS", "category": "CORE_WORK", "display_name": "Control ID Tool", "weight": 100},
    {"pattern": r"control-id|controlid", "match_type": "DOMAIN", "category": "CORE_WORK", "display_name": "Control ID Web Tool", "weight": 100},

    # 2. Entertainment & Distractions
    {"pattern": r"youtube\.com|youtu\.be", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "YouTube", "weight": -100},
    {"pattern": r"youtube", "match_type": "TITLE", "category": "ENTERTAINMENT", "display_name": "YouTube Video", "weight": -100},
    {"pattern": r"netflix\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Netflix", "weight": -100},
    {"pattern": r"twitch\.tv", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Twitch", "weight": -100},
    {"pattern": r"facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|reddit\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Social Media", "weight": -80},
    {"pattern": r"^spotify(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "Spotify", "weight": -30},
    {"pattern": r"^steam(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "Steam Gaming", "weight": -100},

    # 3. Productive Development & Collaboration Tools
    {"pattern": r"^(code|devenv|idea64|pycharm64|sublime_text|webstorm)(\.exe)?$", "match_type": "PROCESS", "category": "PRODUCTIVE", "display_name": "Code Editor / IDE", "weight": 100},
    {"pattern": r"^(slack|teams|zoom)(\.exe)?$", "match_type": "PROCESS", "category": "PRODUCTIVE", "display_name": "Team Collaboration", "weight": 80},
    {"pattern": r"github\.com|gitlab\.com|bitbucket\.org|stackoverflow\.com|jira|confluence|figma\.com|docs\.google\.com", "match_type": "DOMAIN", "category": "PRODUCTIVE", "display_name": "Work Portal / Research", "weight": 95},

    # 4. System & Neutral
    {"pattern": r"^(explorer|taskmgr|cmd|powershell|notepad)(\.exe)?$", "match_type": "PROCESS", "category": "NEUTRAL", "display_name": "System Utility", "weight": 0},
]

class ActivityClassifier:
    def __init__(self, rules=None):
        self.rules = rules or DEFAULT_RULES

    def classify(self, process_name: str, window_title: str, active_url: Optional[str] = None) -> Tuple[str, str, int]:
        """
        Returns: (category, display_name, productivity_weight)
        Categories: 'CORE_WORK', 'PRODUCTIVE', 'ENTERTAINMENT', 'NEUTRAL'
        """
        process_clean = (process_name or "").strip().lower()
        title_clean = (window_title or "").strip().lower()
        url_clean = (active_url or "").strip().lower()

        # 1. First priority: Check for Control ID Tool
        if "control id" in title_clean or "controlid" in process_clean or "control-id" in url_clean:
            return ("CORE_WORK", "Control ID Tool", 100)

        # 2. Second priority: Check for YouTube & Entertainment
        if "youtube.com" in url_clean or "youtu.be" in url_clean or "youtube" in title_clean:
            return ("ENTERTAINMENT", "YouTube", -100)

        # 3. Match against dynamic regex rules
        for rule in self.rules:
            pattern = rule["pattern"]
            mtype = rule["match_type"]

            if mtype == "DOMAIN" and url_clean:
                if re.search(pattern, url_clean, re.IGNORECASE):
                    return (rule["category"], rule["display_name"], rule["weight"])
            elif mtype == "PROCESS" and process_clean:
                if re.search(pattern, process_clean, re.IGNORECASE):
                    return (rule["category"], rule["display_name"], rule["weight"])
            elif mtype == "TITLE" and title_clean:
                if re.search(pattern, title_clean, re.IGNORECASE):
                    return (rule["category"], rule["display_name"], rule["weight"])

        # Default fallback
        if "chrome" in process_clean or "msedge" in process_clean or "firefox" in process_clean:
            return ("NEUTRAL", "Web Browser", 0)

        return ("NEUTRAL", process_name or "Unknown Application", 0)

classifier = ActivityClassifier()
