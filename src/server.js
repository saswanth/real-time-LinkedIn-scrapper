require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { getCompanyAndInsights } = require("./services/linkedinService");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/company", async (req, res) => {
  try {
    const domain = (req.query.domain || "apple.com").toString().trim();
    const payload = await getCompanyAndInsights(domain);

    res.json({
      success: true,
      domain,
      ...payload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch company data",
      error: error.message
    });
  }
});

app.get("/api/stream", async (req, res) => {
  const domain = (req.query.domain || "apple.com").toString().trim();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSnapshot = async () => {
    try {
      const payload = await getCompanyAndInsights(domain);
      res.write(`event: insights\n`);
      res.write(`data: ${JSON.stringify({ success: true, domain, ...payload })}\n\n`);
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ success: false, message: error.message })}\n\n`);
    }
  };

  const timer = setInterval(sendSnapshot, POLL_INTERVAL_MS);
  sendSnapshot();

  req.on("close", () => {
    clearInterval(timer);
    res.end();
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Realtime LinkedIn Scrapper Agent running on http://localhost:${PORT}`);
});
