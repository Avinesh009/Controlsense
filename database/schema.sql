-- ============================================================================
-- Enterprise Employee Monitoring & Productivity System
-- Clean Production Database Schema (Sync Version)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old tables to prevent conflicts and ensure a clean reload
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- 1. EMPLOYEES TABLE (Primary profile database)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,            -- Holds the employee's name
    email VARCHAR(100) UNIQUE NOT NULL,         -- Unique email address (serves as unique login identifier)
    role VARCHAR(100) DEFAULT 'Team Member',     -- Holds the Position / Role
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACTIVITY LOGS TABLE (Raw Telemetry heartbeats from desktop agents)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    process_name VARCHAR(100) NOT NULL,
    window_title TEXT,
    domain_url VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    is_idle BOOLEAN DEFAULT FALSE,
    duration_seconds INTEGER DEFAULT 5,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATED DATA RETENTION CLEANUP TRIGGER (30 DAYS ROLLING WINDOW)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_employee_data()
RETURNS void AS $$
BEGIN
    -- Delete activity heartbeats older than 30 days
    DELETE FROM activity_logs 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
