const jwt = require("jsonwebtoken");

const secretKey = "shhhh!";

const TOKEN_TYPE = {
  ACCESS: "access",
  REFRESH: "refresh",
};

function _token(data, expiresIn) {
  return jwt.sign(data, secretKey, { expiresIn });
}

function accessToken(data) {
  const payload = {
    ...data,
    type: TOKEN_TYPE.ACCESS,
  };
  return _token(payload, "1h");
}

function refreshToken(data) {
  const payload = {
    ...data,
    type: TOKEN_TYPE.REFRESH,
  };
  return _token(payload, "1h");
}

function verifyToken(token) {
  return jwt.verify(token, secretKey);
}

module.exports = {
  accessToken,
  refreshToken,
  verifyToken,
  secretKey,
  TOKEN_TYPE,
};
