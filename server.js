const http = require("http");
const app = require("./app");
const { initSocket } = require("./realtime/socket");

const PORT = process.env.PORT || 5000;

// Express and the real-time (Socket.IO) server share one HTTP server/port
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
