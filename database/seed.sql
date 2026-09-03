-- ============================================================================
-- Seed Data for Employee Monitoring System
-- Application Categorization Rules & Sample Employees
-- ============================================================================

-- Seed App / URL Categorization Rules
INSERT INTO app_categories (pattern, match_type, category, display_name, productivity_weight) VALUES
-- 1. Core Target Work Applications
('ControlID.exe', 'PROCESS', 'CORE_WORK', 'Control ID Tool', 100),
('%Control ID%', 'TITLE', 'CORE_WORK', 'Control ID Work Tool', 100),
('%control-id%', 'DOMAIN', 'CORE_WORK', 'Control ID Web Portal', 100),

-- 2. General Productive Work Tools
('Code.exe', 'PROCESS', 'PRODUCTIVE', 'Visual Studio Code', 100),
('devenv.exe', 'PROCESS', 'PRODUCTIVE', 'Visual Studio IDE', 100),
('idea64.exe', 'PROCESS', 'PRODUCTIVE', 'IntelliJ IDEA', 100),
('slack.exe', 'PROCESS', 'PRODUCTIVE', 'Slack Work Chat', 80),
('teams.exe', 'PROCESS', 'PRODUCTIVE', 'Microsoft Teams', 80),
('zoom.exe', 'PROCESS', 'PRODUCTIVE', 'Zoom Meeting', 80),
('%github.com%', 'DOMAIN', 'PRODUCTIVE', 'GitHub Repository', 90),
('%jira%', 'DOMAIN', 'PRODUCTIVE', 'Jira Issue Tracker', 90),
('%figma.com%', 'DOMAIN', 'PRODUCTIVE', 'Figma Design', 90),
('%docs.google.com%', 'DOMAIN', 'PRODUCTIVE', 'Google Docs / Sheets', 90),

-- 3. Entertainment & Distraction (Red-Flagged)
('%youtube.com%', 'DOMAIN', 'ENTERTAINMENT', 'YouTube Video Streaming', -100),
('%YouTube%', 'TITLE', 'ENTERTAINMENT', 'YouTube Player', -100),
('%instagram.com%', 'DOMAIN', 'ENTERTAINMENT', 'Instagram', -100),
('%Instagram%', 'TITLE', 'ENTERTAINMENT', 'Instagram', -100),
('%facebook.com%', 'DOMAIN', 'ENTERTAINMENT', 'Facebook', -100),
('%Facebook%', 'TITLE', 'ENTERTAINMENT', 'Facebook', -100),
('%whatsapp.com%', 'DOMAIN', 'ENTERTAINMENT', 'WhatsApp Web', -100),
('%WhatsApp%', 'TITLE', 'ENTERTAINMENT', 'WhatsApp', -100),
('WhatsApp.exe', 'PROCESS', 'ENTERTAINMENT', 'WhatsApp Desktop App', -100),
('%x.com%', 'DOMAIN', 'ENTERTAINMENT', 'X (Twitter)', -100),
('%twitter.com%', 'DOMAIN', 'ENTERTAINMENT', 'X (Twitter)', -100),
('%/ X%', 'TITLE', 'ENTERTAINMENT', 'X (Twitter)', -100),
('%Twitter%', 'TITLE', 'ENTERTAINMENT', 'Twitter', -100),
('%netflix.com%', 'DOMAIN', 'ENTERTAINMENT', 'Netflix Streaming', -100),
('%primevideo.com%', 'DOMAIN', 'ENTERTAINMENT', 'Prime Video', -100),
('%twitch.tv%', 'DOMAIN', 'ENTERTAINMENT', 'Twitch Stream', -100),
('%tiktok.com%', 'DOMAIN', 'ENTERTAINMENT', 'TikTok', -100),
('%reddit.com%', 'DOMAIN', 'ENTERTAINMENT', 'Reddit Browsing', -70),
('Spotify.exe', 'PROCESS', 'ENTERTAINMENT', 'Spotify Music Player', -40),
('Steam.exe', 'PROCESS', 'ENTERTAINMENT', 'Steam Gaming', -100),

-- 4. Neutral / System Utilities
('explorer.exe', 'PROCESS', 'NEUTRAL', 'Windows File Explorer', 0),
('Taskmgr.exe', 'PROCESS', 'NEUTRAL', 'Task Manager', 0),
('notepad.exe', 'PROCESS', 'NEUTRAL', 'Notepad Editor', 10),
('cmd.exe', 'PROCESS', 'NEUTRAL', 'Command Prompt', 20),
('powershell.exe', 'PROCESS', 'NEUTRAL', 'PowerShell Terminal', 20)
ON CONFLICT DO NOTHING;


