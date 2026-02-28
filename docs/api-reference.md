# AuraCheck API Reference

**Base URL (local):** `http://localhost:5000`
**Base URL (production):** `https://auracheck.fly.dev` *(update after deploy)*
**Content-Type:** `application/json` for all requests and responses.

All responses follow this envelope:
```json
{ "success": true | false, "data": <payload> }
```

---

## Readings

### POST `/api/readings`
Ingest a new sensor reading from a NodeMCU device. The server calculates `status` from the raw ADC value — do not send status from firmware.

**Request body**
```json
{
  "device_id": "aura_node_01",
  "location":  "JAJA_B_Wing_Floor_3",
  "raw_value": 760,
  "voltage":   2.42
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `device_id` | string | ✅ | Unique ID burned into the NodeMCU |
| `location` | string | ✅ | Human-readable location label |
| `raw_value` | integer 0–1023 | ✅ | ADC reading from MQ-135 |
| `voltage` | number 0–5 | ✅ | Converted voltage value |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "device_id":  "aura_node_01",
    "location":   "JAJA_B_Wing_Floor_3",
    "raw_value":  760,
    "voltage":    "2.42",
    "status":     "critical",
    "updated_at": "2026-02-28T05:00:39.728Z"
  }
}
```

**Status thresholds**
| `raw_value` | `status` |
|---|---|
| 0 – 399 | `fresh` |
| 400 – 699 | `moderate` |
| 700 – 1023 | `critical` |

**Side effect:** If status transitions to `moderate` or `critical`, an SMS alert is sent to all contacts registered for that location.

---

### GET `/api/readings`
Returns the latest reading for every registered device.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "device_id":  "aura_node_01",
      "location":   "JAJA_B_Wing_Floor_3",
      "raw_value":  760,
      "voltage":    "2.42",
      "status":     "critical",
      "updated_at": "2026-02-28T05:00:39.728Z"
    }
  ]
}
```

---

### GET `/api/readings/:device_id`
Returns the latest reading for a single device.

**URL params**
| Param | Description |
|---|---|
| `device_id` | e.g. `aura_node_01` |

**Response `200`** — same shape as one item from the list above.
**Response `404`** — `{ "success": false, "message": "Device not found." }`

---

### GET `/api/readings/:device_id/history`
Returns paginated historical readings for a device, newest first.

**URL params**
| Param | Description |
|---|---|
| `device_id` | e.g. `aura_node_01` |

**Query params**
| Param | Default | Max | Description |
|---|---|---|---|
| `limit` | `50` | `200` | Number of records to return |
| `offset` | `0` | — | Number of records to skip |

**Example**
```
GET /api/readings/aura_node_01/history?limit=20&offset=0
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id":          42,
      "device_id":   "aura_node_01",
      "raw_value":   760,
      "voltage":     "2.42",
      "status":      "critical",
      "recorded_at": "2026-02-28T05:00:39.728Z"
    }
  ],
  "meta": { "limit": 20, "offset": 0 }
}
```

---

## Locations

### GET `/api/locations`
Returns all tracked locations with an aggregate status. If a location has multiple devices, the most severe status wins (`critical` > `moderate` > `fresh`).

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "location":     "JAJA_B_Wing_Floor_3",
      "status":       "critical",
      "device_count": 1
    }
  ]
}
```

---

## Contacts

### POST `/api/contacts`
Register a phone number to receive SMS alerts for a location.

**Request body**
```json
{
  "location": "JAJA_B_Wing_Floor_3",
  "phone":    "+2347047481307",
  "name":     "Cleaner John"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `location` | string | ✅ | Must match the `location` field sent by devices |
| `phone` | string | ✅ | E.164 format e.g. `+2347047481307` |
| `name` | string | ❌ | Label for the contact |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id":         1,
    "location":   "JAJA_B_Wing_Floor_3",
    "phone":      "+2347047481307",
    "name":       "Cleaner John",
    "created_at": "2026-02-28T04:55:13.722Z"
  }
}
```

> Duplicate `(location, phone)` pairs are silently upserted — safe to call multiple times.

---

### GET `/api/contacts?location=`
Returns all contacts registered for a location.

**Query params**
| Param | Required | Description |
|---|---|---|
| `location` | ✅ | e.g. `JAJA_B_Wing_Floor_3` |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id":         1,
      "location":   "JAJA_B_Wing_Floor_3",
      "phone":      "+2347047481307",
      "name":       "Cleaner John",
      "created_at": "2026-02-28T04:55:13.722Z"
    }
  ]
}
```

---

## Health

### GET `/api/health`
Lightweight uptime check. No auth required.

**Response `200`**
```json
{ "success": true, "status": "ok", "uptime": 3600.42 }
```

---

## Error responses

All errors follow:
```json
{ "success": false, "message": "Human-readable reason." }
```

Validation errors (400) return a detailed breakdown:
```json
{
  "success": false,
  "errors": [
    { "field": "raw_value", "message": "Number must be less than or equal to 1023" }
  ]
}
```

| HTTP Code | Meaning |
|---|---|
| `400` | Bad request / validation failed |
| `404` | Resource not found |
| `500` | Internal server error |
