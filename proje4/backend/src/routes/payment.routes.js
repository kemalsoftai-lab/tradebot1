const express = require("express");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/create", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isPhoneVerified) {
      return res.status(403).json({ message: "Ödeme için hesap doğrulaması gerekli" });
    }

    const amountUsd = req.user.nextPriceUsd;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        amountUsd,
        provider: process.env.PAYMENT_PROVIDER || "manual",
        status: "PENDING"
      }
    });

    res.status(201).json({
      message: "Ödeme kaydı oluşturuldu",
      paymentId: payment.id,
      amountUsd
    });
  } catch (error) {
    next(error);
  }
});

router.post("/confirm", requireAuth, async (req, res, next) => {
  try {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: req.user.id,
        status: "PENDING"
      }
    });

    if (!payment) {
      return res.status(404).json({ message: "Bekleyen ödeme bulunamadı" });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          providerRef: `manual_${Date.now()}`
        }
      });

      const user = await tx.user.update({
        where: { id: req.user.id },
        data: {
          signalCredits: { increment: 1 },
          nextPriceUsd: Math.min(100, req.user.nextPriceUsd + 5)
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

      return user;
    });

    res.json({
      message: "Ödeme onaylandı ve 1 sinyal hakkı eklendi",
      user: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
