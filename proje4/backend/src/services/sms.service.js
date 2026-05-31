async function sendOtpSms(phone, code) {
  if (process.env.SMS_PROVIDER === "console" || process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] ${phone}: ${code}`);
    return { provider: "console", sent: true };
  }

  // Buraya production için Twilio, NetGSM, IletiMerkezi veya benzeri SMS sağlayıcı kodu eklenir.
  // API anahtarları olmadan gerçek SMS gönderilemez.
  throw new Error("Production SMS provider henüz yapılandırılmadı.");
}

module.exports = { sendOtpSms };
