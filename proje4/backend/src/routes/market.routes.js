const express = require("express");
const router = express.Router();

const BINANCE_BASE = "https://api.binance.com";
function normalizeTicker(t) {
  return {
    symbol: t.symbol,
    lastPrice: Number(t.lastPrice),
    priceChangePercent: Number(t.priceChangePercent),
    highPrice: Number(t.highPrice),
    lowPrice: Number(t.lowPrice),
    volume: Number(t.volume),
    quoteVolume: Number(t.quoteVolume)
  };
}

async function getAllSpotTickers() {
  const response = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr`);
  if (!response.ok) {
    throw new Error("Binance piyasa verisi alınamadı");
  }
  return response.json();
}

router.get("/tickers", async (req, res, next) => {
  try {
    const quote = String(req.query.quote || "USDT").toUpperCase();
    const limit = Math.min(Number(req.query.limit || 6), 50);
    const search = String(req.query.search || "").trim().toUpperCase();

    const data = await getAllSpotTickers();
    let tickers;

    tickers = data
      .filter((item) => item.symbol.endsWith(quote))
      .filter((item) => !search || item.symbol.includes(search))
      .filter((item) => !/(UPUSDT|DOWNUSDT|BULLUSDT|BEARUSDT)$/.test(item.symbol))
      .map(normalizeTicker)
      .sort((a, b) => b.quoteVolume - a.quoteVolume)
      .slice(0, limit);

    res.json({
      source: "Binance Spot",
      quote,
      search,
      updatedAt: new Date().toISOString(),
      tickers
    });
  } catch (error) {
    next(error);
  }
});

router.get("/ticker/:symbol", async (req, res, next) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();

    if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
      return res.status(400).json({ message: "Geçersiz sembol" });
    }

    const response = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`);

    if (!response.ok) {
      return res.status(404).json({ message: "Sembol bulunamadı" });
    }

    const data = await response.json();

    res.json({
      source: "Binance Spot",
      updatedAt: new Date().toISOString(),
      ticker: normalizeTicker(data)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
