require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const signalRoutes = require("./routes/signal.routes");
const paymentRoutes = require("./routes/payment.routes");
const marketRoutes = require("./routes/market.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120
}));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "AI Trade Signal API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/signals", signalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/market", marketRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatası"
  });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API çalışıyor: http://localhost:${port}`);
});
