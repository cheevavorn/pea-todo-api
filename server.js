const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { checkUser } = require("./middlewares");

const jwt = require("jsonwebtoken");
const {
  accessToken,
  refreshToken,
  verifyToken,
  TOKEN_TYPE,
} = require("./token");

const app = express();

app.use(express.json());

const todoRouter = require("./routers/todo");

// Todo
// - create register api
// - create login api
// - add route protect

// Encode -> แปลงรูป -> Decode
// Encrypt -> แปลงรูป + Key -> Decrypt
// Hash -> แปลงรูป + Key (ไม่สามารถแปลงกลับได้)

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });
  res.sendStatus(201);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const found = await prisma.user.findFirst({
    where: {
      username,
    },
  });

  if (!found) {
    res.sendStatus(401);
    return;
  }

  const valid = await bcrypt.compare(password, found.password);
  if (!valid) {
    res.sendStatus(401);
    return;
  }

  const _refreshToken = refreshToken();
  await prisma.user.update({
    data: {
      token: _refreshToken,
    },
    where: {
      id: found.id,
    },
  });

  res.json({
    refreshToken: _refreshToken,
    accessToken: accessToken(),
  });
});

// ที่ไม่มี middleware เพราะในจังหวะที่ใช้ route นี้ access token หมดไปแล้ว
app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const data = verifyToken(refreshToken);
    console.log("data", data);
    if (data.type !== TOKEN_TYPE.REFRESH) {
      res.sendStatus(401);
      return;
    }

    const found = await prisma.user.findFirst({
      where: {
        token: refreshToken,
      },
    });
    if (!found) {
      res.sendStatus(401);
      return;
    }

    res.json({
      accessToken: accessToken(),
    });
  } catch (error) {
    console.error(error);
    res.sendStatus(401);
  }
});

app.use("/todos", checkUser, todoRouter(prisma, uuidv4));

app.listen(3000, () => console.log("Listening on port 3000"));
