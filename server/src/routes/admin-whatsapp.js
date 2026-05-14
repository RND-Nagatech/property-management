import express from "express";
import { requireAdminAuth } from "../auth.js";
import { waConnect, waDisconnect, waGetStatus } from "../utils/wa-web.js";

export const adminWhatsappRouter = express.Router();
adminWhatsappRouter.use(requireAdminAuth);

adminWhatsappRouter.get("/status", async (_req, res, next) => {
  try {
    const st = await waGetStatus();
    res.json({
      data: {
        status: st.status,
        qr: st.qr || "",
        me: st.me || "",
        error: st.lastError || "",
      },
    });
  } catch (err) {
    next(err);
  }
});

adminWhatsappRouter.post("/connect", async (_req, res, next) => {
  try {
    const st = await waConnect();
    res.json({
      data: {
        status: st.status,
        qr: st.qr || "",
        me: st.me || "",
        error: st.lastError || "",
      },
    });
  } catch (err) {
    next(err);
  }
});

adminWhatsappRouter.post("/disconnect", async (_req, res, next) => {
  try {
    const st = await waDisconnect();
    res.json({
      data: {
        status: st.status,
        qr: st.qr || "",
        me: st.me || "",
        error: st.lastError || "",
      },
    });
  } catch (err) {
    next(err);
  }
});
