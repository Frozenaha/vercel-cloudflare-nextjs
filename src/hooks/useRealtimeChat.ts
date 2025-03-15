import { useCallback, useEffect, useRef, useState } from "react";
import { realtimeClient } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { updateRoomUserCount } from "@/app/actions";

type Message = {
  id: string;
  text: string;
  userId: string;
  username: string;
  avatar: string;
  createdAt: string;
};

type UseRealtimeChatProps = {
  topic: string;
  userId: string;
  initialMessages: Message[];
};

type UseRealtimeChatReturn = {
  messages: Message[];
  userCount: number;
  sendMessage: (message: Omit<Message, "id" | "createdAt">) => Promise<void>;
  isConnected: boolean;
};

export function useRealtimeChat({
  topic,
  userId,
  initialMessages,
}: UseRealtimeChatProps): UseRealtimeChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 处理用户加入聊天室
  const handleUserJoin = useCallback(async () => {
    try {
      const count = await updateRoomUserCount(topic, true);
      setUserCount(Number(count));
    } catch (error) {
      console.error("更新用户数量失败:", error);
    }
  }, [topic]);

  // 处理用户离开聊天室
  const handleUserLeave = useCallback(async () => {
    try {
      await updateRoomUserCount(topic, false);
    } catch (error) {
      console.error("更新用户数量失败:", error);
    }
  }, [topic]);

  // 发送消息
  const sendMessage = useCallback(
    async (messageData: Omit<Message, "id" | "createdAt">) => {
      if (!channelRef.current) return;

      const message: Message = {
        ...messageData,
        id: `msg-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      // 立即在本地添加消息
      setMessages((prev) => [...prev, message]);

      // 通过 Supabase Realtime 广播消息
      channelRef.current.send({
        type: "broadcast",
        event: `message:${topic}`,
        payload: message,
      });

      return message;
    },
    [topic]
  );

  // 设置 Supabase Realtime 监听
  useEffect(() => {
    // 避免重复订阅
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsConnected(false);

    // 创建新的订阅
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
      });

    // 保存频道引用
    channelRef.current = channel;

    // 订阅频道
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        // 只有在成功订阅后才执行加入操作
        handleUserJoin();
      }
    });

    // 清理函数
    return () => {
      handleUserLeave();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [topic, userId]);

  return {
    messages,
    userCount,
    sendMessage,
    isConnected,
  };
}
