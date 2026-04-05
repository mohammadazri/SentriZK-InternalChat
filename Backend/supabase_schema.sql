-- ====================================================================
-- SentriZK Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Tables
-- ---------

-- Core Users
CREATE TABLE IF NOT EXISTS users (
    username text PRIMARY KEY,
    commitment text NOT NULL,
    "registeredAt" bigint NOT NULL,
    "lastLogin" bigint,
    status text DEFAULT 'active',
    "heldAt" bigint,
    "heldBy" text,
    nonce text,
    "nonceTime" bigint
);

-- Redirect/Handshake Tokens (Single-use)
CREATE TABLE IF NOT EXISTS tokens (
    token text PRIMARY KEY,
    username text NOT NULL,
    expires bigint NOT NULL,
    type text NOT NULL, -- "registration", "login", etc.
    "sessionId" text -- Optional binding to a session
);

-- Active User Sessions
CREATE TABLE IF NOT EXISTS sessions (
    "sessionId" text PRIMARY KEY,
    username text NOT NULL,
    expires bigint NOT NULL,
    "createdAt" bigint NOT NULL,
    "deviceId" text, -- Device finger-print / ID
    "validatedAt" bigint, -- When MAT was successfully bridged
    "refreshedAt" bigint  -- When the session was last rotated
);

-- Mobile Access Tokens (MAT) - Handshake between Mobile & Browser
CREATE TABLE IF NOT EXISTS mobile_access_tokens (
    mat text PRIMARY KEY,
    "deviceId" text NOT NULL,
    action text NOT NULL, -- "register" or "login"
    expires bigint NOT NULL,
    used boolean DEFAULT false,
    "createdAt" bigint NOT NULL
);

-- ML Insider Threat Logs
CREATE TABLE IF NOT EXISTS threat_logs (
    id text PRIMARY KEY,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    content text NOT NULL, -- Message text content
    "threatScore" float8 NOT NULL, -- 0.0 to 1.0 from TFLite
    timestamp bigint NOT NULL, -- Original message timestamp
    "reportedAt" bigint NOT NULL, -- When log reached server
    "resolutionStatus" text, -- "pending", "resolved", "dismissed"
    "resolvedBy" text, -- Admin username
    "resolvedAt" bigint
);

-- 2. Indexes for Performance (Optional but Recommended)
-- ---------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires);
CREATE INDEX IF NOT EXISTS idx_mat_expires ON mobile_access_tokens(expires);
CREATE INDEX IF NOT EXISTS idx_threats_sender ON threat_logs("senderId");
