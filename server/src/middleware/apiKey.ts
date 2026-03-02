import { Request, Response, NextFunction } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-api-key"] === process.env.API_KEY) {
    next();
    return;
  }
  res.status(403).json({ success: false, message: "Forbidden." });
}
