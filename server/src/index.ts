import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import readingsRouter from "./routes/readings";
import openapiSpec from "./docs/openapi";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Swagger docs ─────────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", readingsRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ success: true, status: "ok", uptime: process.uptime() });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Unhandled]", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AuraCheck API running on http://localhost:${PORT}`);
  console.log(`Thresholds — Moderate: ${process.env.THRESHOLD_MODERATE ?? 400}, Critical: ${process.env.THRESHOLD_CRITICAL ?? 700}`);
});
