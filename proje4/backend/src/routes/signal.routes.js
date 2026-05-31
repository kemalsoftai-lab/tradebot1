const express = require("express");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");
const { generateSignal } = require("../services/signal-engine.service");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const signals = await prisma.signal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    res.json({ signals });
  } catch (error) {
    next(error);
  }
});

router.post("/generate", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isPhoneVerified) {
      return res.status(403).json({ message: "Sinyal almak için telefon doğrulaması gerekli" });
    }

    if (req.user.signalCredits <= 0) {
      return res.status(402).json({
        message: "Sinyal hakkınız yok. Ödeme yaparak yeni hak alabilirsiniz.",
        nextPriceUsd: req.user.nextPriceUsd
      });
    }

    const generated = generateSignal();

    const result = await prisma.$transaction(async (tx) => {
      const signal = await tx.signal.create({
        data: {
          userId: req.user.id,
          ...generated
        }
      });

      const user = await tx.user.update({
        where: { id: req.user.id },
        data: {
          signalCredits: { decrement: 1 },
          usedSignals: { increment: 1 }
        },
        select: {
          id: true,
          name: true,
          phone: true,
          isPhoneVerified: true,
          signalCredits: true,
          usedSignals: true,
          nextPriceUsd: true
        }
      });

      return { signal, user };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
