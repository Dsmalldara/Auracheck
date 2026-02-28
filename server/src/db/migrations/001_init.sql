-- AuraCheck Database Schema
-- Run once against your Neon DB via: npm run migrate

-- Registered devices / locations
CREATE TABLE IF NOT EXISTS devices (
  device_id   TEXT PRIMARY KEY,
  location    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest reading per device (upserted on every POST /api/readings)
CREATE TABLE IF NOT EXISTS readings (
  device_id   TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
  raw_value   INTEGER NOT NULL,
  voltage     NUMERIC(5, 2) NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('fresh', 'moderate', 'critical')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only history log
CREATE TABLE IF NOT EXISTS readings_history (
  id          BIGSERIAL PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  raw_value   INTEGER NOT NULL,
  voltage     NUMERIC(5, 2) NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('fresh', 'moderate', 'critical')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phone numbers to alert per location
CREATE TABLE IF NOT EXISTS alert_contacts (
  id          BIGSERIAL PRIMARY KEY,
  location    TEXT NOT NULL,
  phone       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location, phone)
);

-- Index for fast history lookups by device
CREATE INDEX IF NOT EXISTS idx_readings_history_device_id
  ON readings_history (device_id, recorded_at DESC);

-- Index for fast contact lookups by location
CREATE INDEX IF NOT EXISTS idx_alert_contacts_location
  ON alert_contacts (location);
