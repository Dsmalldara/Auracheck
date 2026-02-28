import { Request, Response } from "express";
import {
  ingestReading,
  getAllLatestReadings,
  getLatestReadingByDevice,
  getDeviceHistory,
  createContact,
  getContactsByLocation,
  snoozeDevice,
  cancelSnooze,
} from "../services/readingsService";

// ─── POST /api/readings ───────────────────────────────────────────────────────
export async function postReading(req: Request, res: Response): Promise<void> {
  try {
    const reading = await ingestReading(req.body);
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    console.error("[postReading]", err);
    res.status(500).json({ success: false, message: "Failed to ingest reading." });
  }
}

// ─── GET /api/readings ────────────────────────────────────────────────────────
export async function getAllReadings(_req: Request, res: Response): Promise<void> {
  try {
    const readings = await getAllLatestReadings();
    res.json({ success: true, data: readings });
  } catch (err) {
    console.error("[getAllReadings]", err);
    res.status(500).json({ success: false, message: "Failed to fetch readings." });
  }
}

// ─── GET /api/readings/:device_id ─────────────────────────────────────────────
export async function getOneReading(req: Request, res: Response): Promise<void> {
  try {
    const reading = await getLatestReadingByDevice(req.params.device_id);
    if (!reading) {
      res.status(404).json({ success: false, message: "Device not found." });
      return;
    }
    res.json({ success: true, data: reading });
  } catch (err) {
    console.error("[getOneReading]", err);
    res.status(500).json({ success: false, message: "Failed to fetch reading." });
  }
}

// ─── GET /api/readings/:device_id/history ─────────────────────────────────────
export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      res.status(400).json({ success: false, message: "Invalid limit or offset." });
      return;
    }

    const history = await getDeviceHistory(req.params.device_id, limit, offset);
    res.json({ success: true, data: history, meta: { limit, offset } });
  } catch (err) {
    console.error("[getHistory]", err);
    res.status(500).json({ success: false, message: "Failed to fetch history." });
  }
}

// ─── POST /api/devices/:device_id/snooze ─────────────────────────────────────
export async function postSnooze(req: Request, res: Response): Promise<void> {
  try {
    const result = await snoozeDevice(req.params.device_id);
    if (!result) {
      res.status(404).json({ success: false, message: "Device not found." });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[postSnooze]", err);
    res.status(500).json({ success: false, message: "Failed to set snooze." });
  }
}

// ─── DELETE /api/devices/:device_id/snooze ────────────────────────────────────
export async function deleteSnooze(req: Request, res: Response): Promise<void> {
  try {
    const result = await cancelSnooze(req.params.device_id);
    if (!result) {
      res.status(404).json({ success: false, message: "Device not found." });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[deleteSnooze]", err);
    res.status(500).json({ success: false, message: "Failed to cancel snooze." });
  }
}

// ─── POST /api/contacts ───────────────────────────────────────────────────────
export async function postContact(req: Request, res: Response): Promise<void> {
  try {
    const contact = await createContact(req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    console.error("[postContact]", err);
    res.status(500).json({ success: false, message: "Failed to create contact." });
  }
}

// ─── GET /api/contacts?location=... ──────────────────────────────────────────
export async function getContacts(req: Request, res: Response): Promise<void> {
  try {
    const location = req.query.location as string | undefined;
    if (!location) {
      res.status(400).json({ success: false, message: "Query param 'location' is required." });
      return;
    }
    const contacts = await getContactsByLocation(location);
    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error("[getContacts]", err);
    res.status(500).json({ success: false, message: "Failed to fetch contacts." });
  }
}
