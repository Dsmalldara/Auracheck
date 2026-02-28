import sql from "../db/client";
import { sendSmsAlert } from "./smsService";
import {
  AlertContact,
  CreateContactBody,
  HistoryEntry,
  LatestReading,
  ReadingStatus,
  SensorPayload,
  SnoozeResponse,
} from "../types/reading";

// ─── Threshold helpers ────────────────────────────────────────────────────────

function resolveStatus(rawValue: number): ReadingStatus {
  const moderate = Number(process.env.THRESHOLD_MODERATE ?? 400);
  const critical = Number(process.env.THRESHOLD_CRITICAL ?? 700);

  if (rawValue >= critical) return "critical";
  if (rawValue >= moderate) return "moderate";
  return "fresh";
}

// ─── Ingest (POST /api/readings) ─────────────────────────────────────────────

export async function ingestReading(payload: SensorPayload): Promise<LatestReading> {
  const { device_id, location, raw_value, voltage } = payload;
  const newStatus = resolveStatus(raw_value);

  // 1. Auto-register device if new (upsert — location may update)
  await sql`
    INSERT INTO devices (device_id, location)
    VALUES (${device_id}, ${location})
    ON CONFLICT (device_id) DO UPDATE
      SET location = EXCLUDED.location
  `;

  // 2. Fetch previous status and active cooldown in one query
  const [prev] = await sql<{ status: ReadingStatus; cooldown_until: Date | null }[]>`
    SELECT r.status, d.cooldown_until
    FROM readings r
    JOIN devices d ON d.device_id = r.device_id
    WHERE r.device_id = ${device_id}
  `;
  const previousStatus: ReadingStatus | null = prev?.status ?? null;
  const inCooldown = prev?.cooldown_until != null && prev.cooldown_until > new Date();

  // 3. Append to history
  await sql`
    INSERT INTO readings_history (device_id, raw_value, voltage, status)
    VALUES (${device_id}, ${raw_value}, ${voltage}, ${newStatus})
  `;

  // 4. Upsert latest reading
  const [updated] = await sql<LatestReading[]>`
    INSERT INTO readings (device_id, raw_value, voltage, status, updated_at)
    VALUES (${device_id}, ${raw_value}, ${voltage}, ${newStatus}, NOW())
    ON CONFLICT (device_id) DO UPDATE
      SET raw_value  = EXCLUDED.raw_value,
          voltage    = EXCLUDED.voltage,
          status     = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
    RETURNING
      readings.device_id,
      (SELECT location FROM devices WHERE device_id = readings.device_id) AS location,
      readings.raw_value,
      readings.voltage,
      readings.status,
      readings.updated_at,
      (SELECT cooldown_until FROM devices WHERE device_id = readings.device_id) AS cooldown_until
  `;

  // 5. Fire SMS only when spiking to moderate/critical AND not in cooldown
  const isSpike = (newStatus === "moderate" || newStatus === "critical") && previousStatus !== newStatus;
  if (isSpike && !inCooldown) {
    const contacts = await sql<{ phone: string }[]>`
      SELECT phone FROM alert_contacts WHERE location = ${location}
    `;
    const phones = contacts.map((c) => c.phone);
    // Fire-and-forget — don't block the HTTP response
    sendSmsAlert(phones, location, newStatus).catch((err) =>
      console.error("[SMS] Unhandled error:", err)
    );
  } else if (isSpike && inCooldown) {
    console.log(`[SMS] Suppressed for ${device_id} — cooldown active until ${prev?.cooldown_until}`);
  }

  return updated;
}

// ─── Latest readings ──────────────────────────────────────────────────────────

export async function getAllLatestReadings(): Promise<LatestReading[]> {
  return sql<LatestReading[]>`
    SELECT
      r.device_id,
      d.location,
      r.raw_value,
      r.voltage,
      r.status,
      r.updated_at,
      d.cooldown_until
    FROM readings r
    JOIN devices d ON d.device_id = r.device_id
    ORDER BY d.location ASC
  `;
}

export async function getLatestReadingByDevice(
  deviceId: string
): Promise<LatestReading | null> {
  const [row] = await sql<LatestReading[]>`
    SELECT
      r.device_id,
      d.location,
      r.raw_value,
      r.voltage,
      r.status,
      r.updated_at,
      d.cooldown_until
    FROM readings r
    JOIN devices d ON d.device_id = r.device_id
    WHERE r.device_id = ${deviceId}
  `;
  return row ?? null;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getDeviceHistory(
  deviceId: string,
  limit: number,
  offset: number
): Promise<HistoryEntry[]> {
  return sql<HistoryEntry[]>`
    SELECT id, device_id, raw_value, voltage, status, recorded_at
    FROM readings_history
    WHERE device_id = ${deviceId}
    ORDER BY recorded_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

// ─── Snooze ───────────────────────────────────────────────────────────────────

export async function snoozeDevice(deviceId: string): Promise<SnoozeResponse | null> {
  const minutes = Number(process.env.SNOOZE_MINUTES ?? 45);
  const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);

  const [row] = await sql<SnoozeResponse[]>`
    UPDATE devices
    SET cooldown_until = ${cooldownUntil}
    WHERE device_id = ${deviceId}
    RETURNING device_id, cooldown_until
  `;
  return row ?? null;
}

export async function cancelSnooze(deviceId: string): Promise<SnoozeResponse | null> {
  const [row] = await sql<SnoozeResponse[]>`
    UPDATE devices
    SET cooldown_until = NULL
    WHERE device_id = ${deviceId}
    RETURNING device_id, cooldown_until
  `;
  return row ?? null;
}

// ─── Locations summary ────────────────────────────────────────────────────────

export async function getLocationsSummary(): Promise<
  { location: string; status: ReadingStatus | null; device_count: number }[]
> {
  return sql`
    SELECT
      d.location,
      -- most severe status wins if multiple devices share a location
      CASE
        WHEN bool_or(r.status = 'critical') THEN 'critical'
        WHEN bool_or(r.status = 'moderate') THEN 'moderate'
        WHEN bool_or(r.status = 'fresh')    THEN 'fresh'
        ELSE NULL
      END AS status,
      COUNT(d.device_id)::int AS device_count
    FROM devices d
    LEFT JOIN readings r ON r.device_id = d.device_id
    GROUP BY d.location
    ORDER BY d.location ASC
  `;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function createContact(body: CreateContactBody): Promise<AlertContact> {
  const [contact] = await sql<AlertContact[]>`
    INSERT INTO alert_contacts (location, phone, name)
    VALUES (${body.location}, ${body.phone}, ${body.name ?? null})
    ON CONFLICT (location, phone) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING *
  `;
  return contact;
}

export async function getContactsByLocation(location: string): Promise<AlertContact[]> {
  return sql<AlertContact[]>`
    SELECT * FROM alert_contacts
    WHERE location = ${location}
    ORDER BY created_at ASC
  `;
}
