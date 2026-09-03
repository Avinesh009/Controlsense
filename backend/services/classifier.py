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
    {"pattern": r"instagram\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Instagram", "weight": -100},
    {"pattern": r"instagram", "match_type": "TITLE", "category": "ENTERTAINMENT", "display_name": "Instagram", "weight": -100},
    {"pattern": r"^instagram(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "Instagram App", "weight": -100},
    {"pattern": r"facebook\.com|fb\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Facebook", "weight": -100},
    {"pattern": r"facebook", "match_type": "TITLE", "category": "ENTERTAINMENT", "display_name": "Facebook", "weight": -100},
    {"pattern": r"^facebook(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "Facebook App", "weight": -100},
    {"pattern": r"whatsapp\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "WhatsApp", "weight": -100},
    {"pattern": r"whatsapp", "match_type": "TITLE", "category": "ENTERTAINMENT", "display_name": "WhatsApp", "weight": -100},
    {"pattern": r"^whatsapp(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "WhatsApp App", "weight": -100},
    {"pattern": r"x\.com|twitter\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "X (Twitter)", "weight": -100},
    {"pattern": r"twitter|\s/\sx\b", "match_type": "TITLE", "category": "ENTERTAINMENT", "display_name": "X (Twitter)", "weight": -100},
    {"pattern": r"^twitter(\.exe)?$", "match_type": "PROCESS", "category": "ENTERTAINMENT", "display_name": "X (Twitter) App", "weight": -100},
    {"pattern": r"netflix\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Netflix", "weight": -100},
    {"pattern": r"twitch\.tv", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Twitch", "weight": -100},
    {"pattern": r"tiktok\.com|reddit\.com", "match_type": "DOMAIN", "category": "ENTERTAINMENT", "display_name": "Social Media", "weight": -80},
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

    def reload_rules_from_supabase(self, supabase):
        if supabase is None:
            self.rules = DEFAULT_RULES
            return
        try:
            res = supabase.table("classifier_rules").select("*").order("created_at", desc=False).execute()
            if res.data:
                self.rules = res.data
                print(f"Loaded {len(self.rules)} classification rules from Supabase.")
            else:
                self.rules = DEFAULT_RULES
        except Exception as e:
            print(f"Could not load rules from Supabase (falling back to defaults): {e}")
            self.rules = DEFAULT_RULES

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

        # 2. Second priority: Specific Social Media & Entertainment Platforms
        if "youtube.com" in url_clean or "youtu.be" in url_clean or "youtube" in title_clean or "youtube" in process_clean:
            return ("ENTERTAINMENT", "YouTube", -100)
        
        if "instagram.com" in url_clean or "instagram" in title_clean or "instagram" in process_clean:
            return ("ENTERTAINMENT", "Instagram", -100)

        if "facebook.com" in url_clean or "fb.com" in url_clean or "facebook" in title_clean or "facebook" in process_clean:
            return ("ENTERTAINMENT", "Facebook", -100)

        if "whatsapp.com" in url_clean or "whatsapp" in title_clean or "whatsapp" in process_clean:
            return ("ENTERTAINMENT", "WhatsApp", -100)

        if "x.com" in url_clean or "twitter.com" in url_clean or "twitter" in title_clean or " / x" in title_clean or "x.exe" in process_clean:
            return ("ENTERTAINMENT", "X (Twitter)", -100)
        
        if "netflix.com" in url_clean or "netflix" in title_clean or "netflix" in process_clean:
            return ("ENTERTAINMENT", "Netflix", -100)

        if "twitch.tv" in url_clean or "twitch" in title_clean:
            return ("ENTERTAINMENT", "Twitch", -100)

        is_browser = any(b in process_clean for b in ["chrome", "msedge", "firefox", "brave", "opera"])

        # 3. Match against dynamic regex rules
        for rule in self.rules:
            pattern = rule["pattern"]
            mtype = rule["match_type"]

            if mtype == "DOMAIN" and url_clean:
                if re.search(pattern, url_clean, re.IGNORECASE):
                    if rule.get("category") == "ENTERTAINMENT":
                        return (rule["category"], rule["display_name"], rule["weight"])
                    elif is_browser:
                        return (rule["category"], "Web Browser", rule["weight"])
                    else:
                        return (rule["category"], rule["display_name"], rule["weight"])
            elif mtype == "PROCESS" and process_clean:
                if re.search(pattern, process_clean, re.IGNORECASE):
                    return (rule["category"], rule["display_name"], rule["weight"])
            elif mtype == "TITLE" and title_clean:
                if re.search(pattern, title_clean, re.IGNORECASE):
                    if rule.get("category") == "ENTERTAINMENT":
                        return (rule["category"], rule["display_name"], rule["weight"])
                    elif is_browser:
                        return (rule["category"], "Web Browser", rule["weight"])
                    else:
                        return (rule["category"], rule["display_name"], rule["weight"])

        # Default fallback
        if is_browser:
            return ("NEUTRAL", "Web Browser", 0)

        return ("NEUTRAL", process_name or "Unknown Application", 0)

classifier = ActivityClassifier()
