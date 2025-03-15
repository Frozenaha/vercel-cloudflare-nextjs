"use client";

import { saveMessage } from "@/app/actions";
import { getRandomAvatar } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

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
  // 客户端加载标志，用于避免 hydration 不匹配
  const [isClient, setIsClient] = useState(false);
  const hasSetClientRef = useRef(false);

  // 使用 useState 的延迟初始化函数来确保这些值只在客户端生成
  const [userId] = useState(
    () => `user-${Math.random().toString(36).substring(2, 9)}`
  );
  const [username] = useState(() => `用户${Math.floor(Math.random() * 1000)}`);
  const [avatar] = useState(() => getRandomAvatar(userId));

  // 标记客户端渲染 - 只执行一次
  useEffect(() => {
    if (!hasSetClientRef.current) {
      setIsClient(true);
      hasSetClientRef.current = true;
    }
  }, []);

  // 使用自定义 Hook 处理实时通信
  const { messages, userCount, sendMessage, isConnected } = useRealtimeChat({
    topic,
    userId,
    initialMessages,
  });

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(initialMessages.length);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 滚动到最新消息 - 使用 useCallback 并防止频繁调用
  const scrollToBottom = useCallback(() => {
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置新的定时器，延迟执行滚动
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
      scrollTimeoutRef.current = null;
    }, 100);
  }, []);

  // 监听消息变化，滚动到底部 - 使用 length 作为依赖而不是整个数组
  useEffect(() => {
    // 只有在客户端渲染后且消息数量增加时才滚动
    if (isClient && messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
      prevMessagesLengthRef.current = messages.length;
    }

    // 清理函数
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, scrollToBottom, isClient]);

  // 聚焦输入框 - 只在连接状态变化时执行
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    // 只有在客户端渲染后且连接状态变化为已连接时才执行
    if (isClient && isConnected && !prevConnectedRef.current) {
      // 清除之前的定时器
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      // 设置新的定时器，延迟执行聚焦
      focusTimeoutRef.current = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
        prevConnectedRef.current = true;
        focusTimeoutRef.current = null;
      }, 300);
    }

    // 清理函数
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isConnected, isClient]);

  // 处理发送消息
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || isSending || !isConnected) return;

      setIsSending(true);

      try {
        // 准备消息数据
        const messageData = {
          text: newMessage,
          userId,
          username,
          avatar,
        };

        // 清空输入框
        setNewMessage("");

        // 发送消息
        await sendMessage(messageData);

        // 保存消息到 Redis
        await saveMessage(topic, {
          id: `msg-${Math.random().toString(36).substring(2, 9)}`,
          ...messageData,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("发送消息失败:", error);
      } finally {
        setIsSending(false);
        // 发送后聚焦输入框
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    },
    [
      newMessage,
      isSending,
      isConnected,
      userId,
      username,
      avatar,
      sendMessage,
      topic,
    ]
  );

  // 如果不是客户端渲染，显示加载状态
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-background">
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
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-muted/40 p-4 shadow-sm border-b">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">{topic} 聊天室</h1>
          <Badge variant="outline" className="ml-2">
            当前在线: {userCount} 人 {!isConnected && "(连接中...)"}
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
                disabled={isSending || !isConnected}
              />
              <Button
                type="submit"
                disabled={isSending || !newMessage.trim() || !isConnected}
              >
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
