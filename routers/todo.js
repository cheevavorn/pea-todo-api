const express = require("express");
const { validate, isString, minLength, isBool } = require("dvali");

module.exports = function (prisma, uuidv4) {
  const router = express.Router();
  const validateName = validate([isString(), minLength(3)]);
  const validateUpdateTodo = validate({
    name: [validateName],
    completed: [isBool],
  });

  router.get("/", async (req, res) => {
    const todos = await prisma.todo.findMany();
    res.status(200).send(todos);
  });

  // create
  router.post("/", async (req, res) => {
    try {
      console.log(req.User);
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

  // lookup by id
  router.get("/:id", async (req, res) => {
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

  // update
  router.put("/:id", async (req, res) => {
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
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await prisma.todo.delete({
      where: {
        id,
      },
    });
    res.sendStatus(204);
  });

  return router;
};
