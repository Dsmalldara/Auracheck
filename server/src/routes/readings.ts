import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import {
  postReading,
  getAllReadings,
  getOneReading,
  getHistory,
  postContact,
  getContacts,
} from "../controllers/readingsController";

const router = Router();

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const sensorPayloadSchema = z.object({
  device_id: z.string().min(1, "device_id is required"),
  location: z.string().min(1, "location is required"),
  raw_value: z
    .number({ invalid_type_error: "raw_value must be a number" })
    .int()
    .min(0)
    .max(1023),
  voltage: z
    .number({ invalid_type_error: "voltage must be a number" })
    .min(0)
    .max(5),
});

const contactSchema = z.object({
  location: z.string().min(1, "location is required"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "phone must be a valid number (e.g. +2348012345678)"),
  name: z.string().optional(),
});

// ─── Reading routes ───────────────────────────────────────────────────────────

router.post("/readings", validate(sensorPayloadSchema), postReading);
router.get("/readings", getAllReadings);
router.get("/readings/:device_id", getOneReading);
router.get("/readings/:device_id/history", getHistory);

// ─── Contact routes ───────────────────────────────────────────────────────────

router.post("/contacts", validate(contactSchema), postContact);
router.get("/contacts", getContacts);

export default router;
