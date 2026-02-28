-- Add cooldown window to devices so SMS alerts can be muted after cleaning
ALTER TABLE devices ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;
