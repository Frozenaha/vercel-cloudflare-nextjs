import { Server } from "socket.io";

if (!global.io) {
  console.log("初始化 Socket.io 服务器...");
  const io = new Server(8080, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("客户端已连接");

    socket.on("disconnect", () => {
      console.log("客户端已断开连接");
    });

    // 在这里添加更多的 socket 事件处理
    socket.on("message", (data) => {
      console.log("收到消息:", data);
      // 广播消息给所有客户端
      io.emit("message", data);
    });
  });

  global.io = io;
}

export default global.io;
