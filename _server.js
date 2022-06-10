const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { validate, isString, minLength, isBool } = require("dvali");

const jwt = require("jsonwebtoken");
const {
  accessToken,
  refreshToken,
  verifyToken,
  TOKEN_TYPE,
} = require("./token");
const { checkUser, secretKey } = require("./middlewares");

const app = express();

app.use(express.json());

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

let products = [
  {
    id: uuidv4(),
    name: "ลูกข่าง",
    type: "Toy",
    price: 100.23,
    inStock: true,
  },
  {
    id: uuidv4(),
    name: "ไส้กรอก",
    type: "Food",
    price: 450.67,
    inStock: true,
  },
];

app.get("/", (req, res) => {
  res.json(products);
});

// lookup by id
app.get("/products/:id", (req, res) => {
  let { id } = req.params;
  let foundProduct = products.filter((product) => product.id === id);
  if (foundProduct.length > 0) {
    res.status(200).json(foundProduct[0]);
  } else {
    res.status(404).json({
      status: `not found product at id ${id}`,
    });
  }
});

// create
app.post("/products", (req, res) => {
  products.push({
    id: uuidv4(),
    ...req.body,
  });
  res.status(200).json(products);
});

// delete
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;

  products = products.filter((product) => product.id !== id);

  if (products.length > 0) {
    res.sendStatus(204);
  } else {
    res.sendStatus(404);
  }
});

// update
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const foundProduct = products.filter((product) => product.id === id);
  console.log(foundProduct);
  if (foundProduct.length === 0) {
    res.sendStatus(404);
    return;
  }

  const newProduct = { ...foundProduct[0], ...req.body };
  const anotherProduct = products.filter((product) => product.id !== id);
  products = [...anotherProduct, newProduct];
  res.status(204).send(products);
});

const validateName = validate([isString(), minLength(3)]);

app.get("/todos", checkUser, async (req, res) => {
  const todos = await prisma.todo.findMany();
  console.log(req.User);
  res.status(200).send(todos);
});

// lookup by id
app.get("/todos/:id", checkUser, async (req, res) => {
  const { id } = req.params;
  const todos = await prisma.todo.findMany({
    where: {
      id,
    },
  });
  if (todos.length === 0) {
    res.sendStatus(404);
    return;
  }
  res.status(200).send(todos);
});

// create
app.post("/todos", checkUser, async (req, res) => {
  try {
    const { name } = req.body;
    const validatedName = await validateName(name);

    // by prisma
    await prisma.todo.create({
      data: {
        id: uuidv4(),
        name: validatedName,
        completed: false,
        userId: req.User.id,
      },
    });

    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.status(422).send({ error });
  }
});

const validateUpdateTodo = validate({
  name: [validateName],
  completed: [isBool],
});

// update
app.put("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const todos = await prisma.todo.findMany({
      where: {
        id,
      },
    });
    if (!todos) {
      res.sendStatus(404);
      return;
    }

    const validateField = {
      name: req.body.name,
      completed: req.body.completed,
    };
    const validatedUpdatedTodo = await validateUpdateTodo(validateField);

    await prisma.todo.update({
      data: validatedUpdatedTodo,
      where: {
        id,
      },
    });

    res.sendStatus(204);
  } catch (error) {
    res.status(422).send({ error });
  }
});

// delete
app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.todo.delete({
    where: {
      id,
    },
  });
  res.sendStatus(204);
});

app.get("/todos/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const todos = await prisma.todo.findMany({
    where: {
      userId: Number(userId),
    },
  });

  if (!todos) {
    res.sendStatus(404);
    return;
  }

  res.status(200).send(todos);
});

app.listen(3000, () => console.log("Listening on port 3000"));
