const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const { verifyToken, TOKEN_TYPE } = require("./token");

const prisma = new PrismaClient();

async function checkUser(req, res, next) {
  try {
    const auth = req.headers["authorization"];
    if (!auth) {
      res.sendStatus(401);
      return;
    }

    const token = auth.slice("Bearer ".length);
    if (!token) {
      res.sendStatus(401);
      return;
    }

    const data = verifyToken(token);
    if (data.type !== TOKEN_TYPE.ACCESS) {
      res.sendStatus(401);
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: data.id,
      },
    });

    req.User = user;
    next();
  } catch (error) {
    console.error(error);
    res.sendStatus(401);
  }
}

module.exports = {
  checkUser,
};
