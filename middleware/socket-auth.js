const jwt = require("jsonwebtoken");

function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { userId: decoded.userId };
    next();
  } catch (err) {
    console.error("Socket auth failed:", err.message);
    next(new Error("Authentication error"));
  }
}

module.exports = socketAuth;
