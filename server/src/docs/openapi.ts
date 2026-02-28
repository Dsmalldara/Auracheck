const spec = {
  openapi: "3.0.3",
  info: {
    title: "AuraCheck API",
    version: "1.0.0",
    description:
      "Smart Hostel Hygiene Monitor — Backend API. Ingests MQ-135 sensor readings from NodeMCU devices and triggers SMS alerts via Twilio when air quality spikes.",
  },
  servers: [
    { url: "http://localhost:5000", description: "Local dev" },
    { url: "https://auracheck.fly.dev", description: "Production (Fly.io)" },
  ],
  tags: [
    { name: "Readings", description: "Sensor data ingestion and retrieval" },
    { name: "Contacts", description: "SMS alert contact management" },
    { name: "Health", description: "Server health check" },
  ],
  paths: {
    "/api/readings": {
      post: {
        tags: ["Readings"],
        summary: "Ingest a sensor reading",
        description:
          "Called by NodeMCU firmware every 30s. Server calculates status from raw_value — do not send status from firmware. Triggers SMS if status spikes to moderate or critical.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SensorPayload" },
              example: {
                device_id: "aura_node_01",
                location: "JAJA_B_Wing_Floor_3",
                raw_value: 760,
                voltage: 2.42,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Reading ingested successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/LatestReading" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
      get: {
        tags: ["Readings"],
        summary: "Get latest reading for all devices",
        responses: {
          "200": {
            description: "List of latest readings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LatestReading" },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },

    "/api/readings/{device_id}": {
      get: {
        tags: ["Readings"],
        summary: "Get latest reading for one device",
        parameters: [
          {
            name: "device_id",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "aura_node_01",
          },
        ],
        responses: {
          "200": {
            description: "Latest reading for the device",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/LatestReading" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },

    "/api/readings/{device_id}/history": {
      get: {
        tags: ["Readings"],
        summary: "Get paginated history for a device",
        parameters: [
          {
            name: "device_id",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "aura_node_01",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 200 },
            description: "Number of records to return",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Number of records to skip",
          },
        ],
        responses: {
          "200": {
            description: "Paginated history entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/HistoryEntry" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        limit: { type: "integer", example: 50 },
                        offset: { type: "integer", example: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },

    "/api/contacts": {
      post: {
        tags: ["Contacts"],
        summary: "Register a phone number for SMS alerts",
        description:
          "Duplicate (location, phone) pairs are silently upserted — safe to call multiple times.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateContact" },
              example: {
                location: "JAJA_B_Wing_Floor_3",
                phone: "+2347047481307",
                name: "Cleaner John",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Contact registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/AlertContact" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
      get: {
        tags: ["Contacts"],
        summary: "Get contacts for a location",
        parameters: [
          {
            name: "location",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "JAJA_B_Wing_Floor_3",
          },
        ],
        responses: {
          "200": {
            description: "List of contacts for the location",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AlertContact" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },

    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Server health check",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    status: { type: "string", example: "ok" },
                    uptime: { type: "number", example: 3600.42 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      SensorPayload: {
        type: "object",
        required: ["device_id", "location", "raw_value", "voltage"],
        properties: {
          device_id: { type: "string", example: "aura_node_01" },
          location: { type: "string", example: "JAJA_B_Wing_Floor_3" },
          raw_value: {
            type: "integer",
            minimum: 0,
            maximum: 1023,
            example: 760,
            description: "ADC reading from MQ-135 (0–1023)",
          },
          voltage: {
            type: "number",
            minimum: 0,
            maximum: 5,
            example: 2.42,
            description: "Converted voltage value",
          },
        },
      },

      LatestReading: {
        type: "object",
        properties: {
          device_id: { type: "string", example: "aura_node_01" },
          location: { type: "string", example: "JAJA_B_Wing_Floor_3" },
          raw_value: { type: "integer", example: 760 },
          voltage: { type: "string", example: "2.42" },
          status: {
            type: "string",
            enum: ["fresh", "moderate", "critical"],
            example: "critical",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2026-02-28T05:00:39.728Z",
          },
        },
      },

      HistoryEntry: {
        type: "object",
        properties: {
          id: { type: "integer", example: 42 },
          device_id: { type: "string", example: "aura_node_01" },
          raw_value: { type: "integer", example: 760 },
          voltage: { type: "string", example: "2.42" },
          status: {
            type: "string",
            enum: ["fresh", "moderate", "critical"],
            example: "critical",
          },
          recorded_at: {
            type: "string",
            format: "date-time",
            example: "2026-02-28T05:00:39.728Z",
          },
        },
      },

      LocationSummary: {
        type: "object",
        properties: {
          location: { type: "string", example: "JAJA_B_Wing_Floor_3" },
          status: {
            type: "string",
            enum: ["fresh", "moderate", "critical"],
            nullable: true,
            example: "critical",
          },
          device_count: { type: "integer", example: 1 },
        },
      },

      CreateContact: {
        type: "object",
        required: ["location", "phone"],
        properties: {
          location: { type: "string", example: "JAJA_B_Wing_Floor_3" },
          phone: {
            type: "string",
            example: "+2347047481307",
            description: "E.164 format",
          },
          name: { type: "string", example: "Cleaner John" },
        },
      },

      AlertContact: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          location: { type: "string", example: "JAJA_B_Wing_Floor_3" },
          phone: { type: "string", example: "+2347047481307" },
          name: { type: "string", nullable: true, example: "Cleaner John" },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2026-02-28T04:55:13.722Z",
          },
        },
      },
    },

    responses: {
      ValidationError: {
        description: "Validation failed",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string", example: "raw_value" },
                      message: { type: "string", example: "Number must be less than or equal to 1023" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Device not found." },
              },
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Internal server error." },
              },
            },
          },
        },
      },
    },
  },
};

export default spec;
