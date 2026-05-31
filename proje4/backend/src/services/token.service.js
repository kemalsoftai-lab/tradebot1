const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { userId: user.id, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { signToken };
