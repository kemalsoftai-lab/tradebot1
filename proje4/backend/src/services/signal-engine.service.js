const pairs = [
  { pair: "BTCUSDT", base: 108250 },
  { pair: "ETHUSDT", base: 3840 },
  { pair: "SOLUSDT", base: 168.4 },
  { pair: "AVAXUSDT", base: 38.2 },
  { pair: "BNBUSDT", base: 690 }
];

const sources = [
  "RSI Pozitif Uyumsuzluk + MACD Bullish Cross + EMA 50 Trend Filtresi",
  "MACD Momentum Kesişimi + EMA 20/50 Onayı + Hacim Artışı",
  "RSI 40 Bölgesi Tepkisi + Bollinger Orta Bant + ML Olasılık Modeli",
  "EMA 200 Retest + Fiyat Sıkışması + Risk/Ödül Filtresi"
];

function round(value) {
  return Number(value.toFixed(4));
}

function generateSignal() {
  const selected = pairs[Math.floor(Math.random() * pairs.length)];
  const entry = selected.base * (1 + (Math.random() - 0.5) * 0.015);
  const profitRate = 0.025 + Math.random() * 0.04;
  const stopRate = 0.012 + Math.random() * 0.025;

  const target = entry * (1 + profitRate);
  const stop = entry * (1 - stopRate);

  return {
    pair: selected.pair,
    direction: "LONG",
    entryPrice: round(entry),
    targetPrice: round(target),
    stopLoss: round(stop),
    profitPercent: round(profitRate * 100),
    confidence: Math.floor(72 + Math.random() * 19),
    source: sources[Math.floor(Math.random() * sources.length)]
  };
}

module.exports = { generateSignal };
