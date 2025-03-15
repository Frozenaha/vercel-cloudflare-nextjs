"use client";

import { saveMessage, updateRoomUserCount } from "@/app/actions";
import { realtimeClient } from "@/lib/supabase";
import { getRandomAvatar, getRandomColor } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  text: string;
  userId: string;
  username: string;
  avatar: string;
  createdAt: string;
};

export default function ChatRoom({
  topic,
  initialMessages,
}: {
  topic: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [userCount, setUserCount] = useState(0);
  const [userId] = useState(
    `user-${Math.random().toString(36).substring(2, 9)}`
  );
  const [username] = useState(`用户${Math.floor(Math.random() * 1000)}`);
  const [avatar] = useState(getRandomAvatar(userId));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 用户进入聊天室
    const handleUserJoin = async () => {
      const count = await updateRoomUserCount(topic, true);
      setUserCount(Number(count));
    };

    // 设置 Supabase Realtime 监听
    const channel = realtimeClient
      .on("broadcast", { event: `message:${topic}` }, (payload) => {
        const newMsg = payload.payload as Message;
        setMessages((prev) => [...prev, newMsg]);
      })
      .on("broadcast", { event: `user_count:${topic}` }, (payload) => {
        setUserCount(payload.payload.count);
      })
      .subscribe();

    handleUserJoin();

    // 清理函数
    return () => {
      // 用户离开聊天室
      const handleUserLeave = async () => {
        await updateRoomUserCount(topic, false);
      };

      handleUserLeave();
      channel.unsubscribe();
    };
  }, [topic]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: `msg-${Math.random().toString(36).substring(2, 9)}`,
      text: newMessage,
      userId,
      username,
      avatar,
      createdAt: new Date().toISOString(),
    };

    // 保存消息到 Redis
    await saveMessage(topic, message);

    // 通过 Supabase Realtime 广播消息
    realtimeClient.send({
      type: "broadcast",
      event: `message:${topic}`,
      payload: message,
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-gray-100 p-4 shadow-sm">
        <h1 className="text-xl font-bold">{topic} 聊天室</h1>
        <p className="text-sm text-gray-500">当前在线: {userCount} 人</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧用户列表 */}
        <div className="w-1/4 bg-gray-50 p-4 border-r overflow-y-auto">
          <h2 className="font-semibold mb-4">你的信息</h2>
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              <img
                src={avatar}
                alt={username}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium">{username}</p>
              <p className="text-xs text-gray-500">
                ID: {userId.substring(0, 8)}
              </p>
            </div>
          </div>

          <h2 className="font-semibold mb-2">在线用户</h2>
          <p className="text-sm text-gray-500">总计: {userCount} 人</p>
        </div>

        {/* 右侧消息区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">暂无消息，开始聊天吧！</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    msg.userId === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.userId !== userId && (
                    <div className="h-10 w-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
                      <img
                        src={msg.avatar}
                        alt={msg.username}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.userId === userId
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.userId !== userId && (
                      <p className="text-xs font-medium mb-1">{msg.username}</p>
                    )}
                    <p>{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.userId === userId && (
                    <div className="h-10 w-10 rounded-full overflow-hidden ml-3 flex-shrink-0">
                      <img
                        src={msg.avatar}
                        alt={msg.username}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                发送
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
