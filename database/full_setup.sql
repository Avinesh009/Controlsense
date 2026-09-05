-- ============================================================================
-- CM ATTENDANCE / CONTROLSENSE - COMPLETE SUPABASE SETUP SCRIPT
-- ============================================================================
-- Run this entire script in your new Supabase Project -> SQL Editor -> Run
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS classifier_rules CASCADE;
DROP TABLE IF EXISTS app_categories CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ============================================================================
-- 3. CREATE TABLES
-- ============================================================================

-- A. EMPLOYEES TABLE (Primary profile database)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(100) DEFAULT 'Team Member',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. ACTIVITY LOGS TABLE (Raw telemetry heartbeats from desktop agents)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    process_name VARCHAR(100) NOT NULL,
    window_title TEXT,
    domain_url VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    is_idle BOOLEAN DEFAULT FALSE,
    duration_seconds INTEGER DEFAULT 20,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. CLASSIFIER RULES TABLE (Dynamic categorization rules)
CREATE TABLE classifier_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern VARCHAR(255) NOT NULL,
    match_type VARCHAR(50) NOT NULL, -- 'PROCESS', 'TITLE', 'DOMAIN'
    category VARCHAR(50) NOT NULL,   -- 'CORE_WORK', 'PRODUCTIVE', 'ENTERTAINMENT', 'NEUTRAL'
    display_name VARCHAR(100) NOT NULL,
    productivity_weight INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES (Ensures fast dashboard loading & date filtering)
-- ============================================================================
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX idx_activity_logs_recorded_at ON activity_logs(recorded_at);
CREATE INDEX idx_activity_logs_composite ON activity_logs(employee_id, recorded_at);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifier_rules ENABLE ROW LEVEL SECURITY;

-- Allow full access for backend API operations
CREATE POLICY "Allow full access to employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to classifier_rules" ON classifier_rules FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. AUTOMATED 30-DAY DATA RETENTION CLEANUP
-- ============================================================================
CREATE OR REPLACE FUNCTION purge_old_employee_data()
RETURNS void AS $$
BEGIN
    DELETE FROM activity_logs 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. SEED CLASSIFICATION RULES
-- ============================================================================
INSERT INTO classifier_rules (pattern, match_type, category, display_name, productivity_weight) VALUES
-- 1. Core Target Work Applications
('ControlID.exe', 'PROCESS', 'CORE_WORK', 'Control ID Tool', 100),
('%Control ID%', 'TITLE', 'CORE_WORK', 'Control ID Work Tool', 100),
('%control-id%', 'DOMAIN', 'CORE_WORK', 'Control ID Web Portal', 100),

-- 2. Productive Work Tools
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

-- 3. Entertainment & Social Media (Red-Flagged)
('%youtube.com%', 'DOMAIN', 'ENTERTAINMENT', 'YouTube Video Streaming', -100),
('%youtu.be%', 'DOMAIN', 'ENTERTAINMENT', 'YouTube Player', -100),
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
('powershell.exe', 'PROCESS', 'NEUTRAL', 'PowerShell Terminal', 20);
