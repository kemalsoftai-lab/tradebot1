const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const prisma = require("../prisma");
const { signToken } = require("../services/token.service");
const { sendOtpSms } = require("../services/sms.service");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2, "Ad soyad gerekli"),
  phone: z.string().min(10, "Telefon numarası geçersiz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı")
});

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6)
});

function normalizePhone(phone) {
  return phone.replace(/\s+/g, "");
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const phone = normalizePhone(data.phone);

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: "Bu telefon numarası zaten kayıtlı" });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone,
        passwordHash,
        signalCredits: 1,
        nextPriceUsd: 10
      }
    });

    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await sendOtpSms(phone, code);

    const token = signToken(user);

    res.status(201).json({
      message: "Kayıt başarıyla tamamlandı. Giriş yaptıktan sonra telefon doğrulaması yapabilirsiniz.",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        signalCredits: user.signalCredits,
        usedSignals: user.usedSignals,
        nextPriceUsd: user.nextPriceUsd
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const phone = normalizePhone(data.phone);

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(401).json({ message: "Telefon veya şifre hatalı" });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Telefon veya şifre hatalı" });
    }

    if (!user.isPhoneVerified) {
      const code = createOtp();
      const codeHash = await bcrypt.hash(code, 10);

      await prisma.otpCode.create({
        data: {
          phone,
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      });

      await sendOtpSms(phone, code);
    }

    const token = signToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        signalCredits: user.signalCredits,
        usedSignals: user.usedSignals,
        nextPriceUsd: user.nextPriceUsd
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/send-otp", requireAuth, async (req, res, next) => {
  try {
    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.otpCode.create({
      data: {
        phone: req.user.phone,
        userId: req.user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await sendOtpSms(req.user.phone, code);

    res.json({ message: "Doğrulama kodu gönderildi" });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-phone", async (req, res, next) => {
  try {
    const schema = z.object({
      phone: z.string().min(10),
      code: z.string().length(6)
    });

    const { code } = schema.parse(req.body);
    const phone = normalizePhone(req.body.phone);

    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const otp = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        phone,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      return res.status(400).json({ message: "Aktif doğrulama kodu bulunamadı. Yeni kod isteyin." });
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      return res.status(400).json({ message: "Doğrulama kodu hatalı" });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() }
      });

      return tx.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
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
    });

    const token = signToken(updatedUser);

    res.json({
      message: "Telefon doğrulandı",
      token,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
