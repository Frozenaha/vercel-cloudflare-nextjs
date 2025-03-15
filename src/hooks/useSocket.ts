import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    // 连接到 Socket.io 服务器
    socket.current = io("http://localhost:8080");

    // 连接事件处理
    socket.current.on("connect", () => {
      console.log("已连接到服务器");
    });

    // 错误处理
    socket.current.on("connect_error", (error) => {
      console.error("连接错误:", error);
    });

    // 组件卸载时断开连接
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  return socket.current;
};
