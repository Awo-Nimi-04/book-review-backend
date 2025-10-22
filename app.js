const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const booksRouter = require("./routes/book-route");
const usersRouter = require("./routes/user-route");
const messagesRouter = require("./routes/message-route");
const { createMessage } = require("./services/message-service");
const socketAuth = require("./middleware/socket-auth");
const HttpError = require("./models/HttpError");

const app = express();

app.use(bodyParser.json({ extended: false }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);
app.use("/api/messages", messagesRouter);

app.use((req, res, next) => {
  throw new HttpError("Could not find this route.", 404);
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    next(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "An error occured" });
});

const dbUrl = process.env.MONGO_URL;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(socketAuth);

io.on("connection", (socket) => {
  const userId = socket.user.userId;
  console.log(`User ${userId} connected with socket ${socket.id}`, socket.id);

  socket.join(userId.toString());

  // handle sending a message
  socket.on("sendMessage", async ({ receiverId, text }) => {
    try {
      if (!receiverId || !text) {
        return socket.emit("error", { message: "Missing fields" });
      }

      const msg = await createMessage(userId, receiverId, text);
      // emit message to receiver's room
      io.to(receiverId).emit("receiveMessage", msg);

      // emit to sender for acknowledgement
      io.to(userId).emit("receiveMessage", msg);
    } catch (err) {
      console.error("Error saving message:", err);
      socket.emit("error", { message: "Message not sent" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
  });
});

const connectToDB = async () => {
  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to database successfully.");
    server.listen(process.env.PORT, () => {
      console.log("Server listening on port 8000...");
    });
  } catch (err) {
    console.log("Could not connect to database.");
  }
};
connectToDB();
