import { Router } from "express";
const r = Router();
r.get("/api/_debug/ip", (req, res) => {
  const keys = ["x-forwarded-for","x-client-public-ip","x-real-ip","cf-connecting-ip","true-client-ip","x-forwarded-ip"];
  const out: any = {};
  for (const k of keys) { out[k] = req.headers[k]; }
  out["req.ip"] = req.ip;
  out["socket.remoteAddress"] = (req as any).socket?.remoteAddress;
  out["original"] = req.originalUrl;
  res.json({ code: 0, data: out });
});
export default r;
