export type ReadingStatus = "fresh" | "moderate" | "critical";

// Payload sent by NodeMCU firmware
export interface SensorPayload {
  device_id: string;
  location: string;
  raw_value: number;
  voltage: number;
}

// Row shape in the `readings` table (latest per device)
export interface LatestReading {
  device_id: string;
  location: string;
  raw_value: number;
  voltage: number;
  status: ReadingStatus;
  updated_at: Date;
}

// Row shape in `readings_history`
export interface HistoryEntry {
  id: number;
  device_id: string;
  raw_value: number;
  voltage: number;
  status: ReadingStatus;
  recorded_at: Date;
}

// Row shape in `alert_contacts`
export interface AlertContact {
  id: number;
  location: string;
  phone: string;
  name: string | null;
  created_at: Date;
}

// POST /api/contacts body
export interface CreateContactBody {
  location: string;
  phone: string;
  name?: string;
}
