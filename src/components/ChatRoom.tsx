"use client";

import { saveMessage, updateRoomUserCount } from "@/app/actions";
import { realtimeClient } from "@/lib/supabase";
import { getRandomAvatar } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

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
  // 使用 useState 的延迟初始化函数来确保这些值只在客户端生成
  const [userId] = useState(
    () => `user-${Math.random().toString(36).substring(2, 9)}`
  );
  const [username] = useState(() => `用户${Math.floor(Math.random() * 1000)}`);
  const [avatar] = useState(() => getRandomAvatar(userId));

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [userCount, setUserCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 客户端加载标志，用于避免 hydration 不匹配
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 标记为客户端渲染
    setIsClient(true);
  }, []);

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
        // 只添加不是自己发送的消息，避免重复
        if (newMsg.userId !== userId) {
          setMessages((prev) => [...prev, newMsg]);
        }
      })
      .on("broadcast", { event: `user_count:${topic}` }, (payload) => {
        setUserCount(payload.payload.count);
      })
      .subscribe();

    handleUserJoin();

    // 聚焦输入框
    inputRef.current?.focus();

    // 清理函数
    return () => {
      // 用户离开聊天室
      const handleUserLeave = async () => {
        await updateRoomUserCount(topic, false);
      };

      handleUserLeave();
      channel.unsubscribe();
    };
  }, [topic, userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    try {
      const message: Message = {
        id: `msg-${Math.random().toString(36).substring(2, 9)}`,
        text: newMessage,
        userId,
        username,
        avatar,
        createdAt: new Date().toISOString(),
      };

      // 立即在本地添加消息
      setMessages((prev) => [...prev, message]);

      // 清空输入框
      setNewMessage("");

      // 保存消息到 Redis
      await saveMessage(topic, message);

      // 通过 Supabase Realtime 广播消息
      realtimeClient.send({
        type: "broadcast",
        event: `message:${topic}`,
        payload: message,
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      // 可以在这里添加错误提示
    } finally {
      setIsSending(false);
      // 发送后聚焦输入框
      inputRef.current?.focus();
    }
  };

  // 如果不是客户端渲染，显示加载状态
  if (!isClient) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        <div className="bg-muted/40 p-4 shadow-sm border-b">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-bold">{topic} 聊天室</h1>
            <Badge variant="outline" className="ml-2">
              加载中...
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">正在加载聊天室...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="bg-muted/40 p-4 shadow-sm border-b">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">{topic} 聊天室</h1>
          <Badge variant="outline" className="ml-2">
            当前在线: {userCount} 人
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        {/* 左侧用户信息 */}
        <div className="w-1/4 bg-background p-4 border-r overflow-y-auto hidden md:block">
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-3 text-lg">你的信息</h2>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatar} alt={username} />
                  <AvatarFallback>{username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{username}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {userId.substring(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2 text-lg">在线用户</h2>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">总计: {userCount} 人</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧消息区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">暂无消息，开始聊天吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.userId === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.userId !== userId && (
                      <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                        <AvatarImage src={msg.avatar} alt={msg.username} />
                        <AvatarFallback>
                          {msg.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg p-3 ${
                        msg.userId === userId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.userId !== userId && (
                        <p className="text-xs font-medium mb-1">
                          {msg.username}
                        </p>
                      )}
                      <p className="break-words">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {msg.userId === userId && (
                      <Avatar className="h-8 w-8 ml-2 flex-shrink-0">
                        <AvatarImage src={msg.avatar} alt={msg.username} />
                        <AvatarFallback>
                          {msg.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                className="flex-1"
                disabled={isSending}
              />
              <Button type="submit" disabled={isSending || !newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "发送中..." : "发送"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
