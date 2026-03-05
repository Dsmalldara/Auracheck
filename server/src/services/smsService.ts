import twilio from "twilio";
import { ReadingStatus } from "../types/reading";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set.");
  }

  return twilio(accountSid, authToken);
}

function buildMessage(location: string, newStatus: ReadingStatus): string {
  switch (newStatus) {
    case "critical":
      return `[Hostel Monitor] CRITICAL air quality at ${location}. Immediate cleaning required!`;
    case "moderate":
      return `[Hostel Monitor] MODERATE air quality at ${location}. Please schedule a cleaning soon.`;
    default:
      return `[Hostel Monitor] ${location} status changed to ${newStatus}.`;
  }
}

export async function sendSmsAlert(
  phones: string[],
  location: string,
  newStatus: ReadingStatus
): Promise<void> {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("[SMS] Twilio credentials not set — skipping SMS.");
    return;
  }

  if (!messagingServiceSid) {
    console.warn("[SMS] TWILIO_MESSAGING_SERVICE_SID not set — skipping SMS.");
    return;
  }

  if (phones.length === 0) {
    console.log(`[SMS] No contacts registered for location: ${location}`);
    return;
  }

  const client = getClient();
  const message = buildMessage(location, newStatus);

  const results = await Promise.allSettled(
    phones.map(async (to) => {
      const msg = await client.messages.create({
        messagingServiceSid,
        to,
        body: message,
      });
      console.log(`[SMS] Sent to ${to} for ${location} (${newStatus}) — SID: ${msg.sid}`);
    })
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("[SMS] Delivery failure:", result.reason);
    }
  });
}
