const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Oturum gerekli" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Geçersiz veya süresi dolmuş oturum" });
  }
}

module.exports = { requireAuth };
