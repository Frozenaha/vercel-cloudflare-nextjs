import { useCallback, useEffect, useRef, useState } from "react";

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
  const isInitializedRef = useRef(false);

  // 发送消息
  const sendMessage = useCallback(
    async (messageData: Omit<Message, "id" | "createdAt">): Promise<void> => {
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
    },
    [topic]
  );

  // 设置 Supabase Realtime 监听 - 使用 useEffect 并确保只执行一次
  useEffect(() => {
    // 防止重复初始化
    if (!topic || !userId || isInitializedRef.current) return;

    isInitializedRef.current = true;

    // 避免重复订阅
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsConnected(false);

    // 创建新的频道，使用 topic 作为频道名称以确保唯一性
    const channel = supabase.channel(`room:${topic}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // 设置消息监听
    channel
      .on("broadcast", { event: `message:${topic}` }, (payload) => {
        const newMsg = payload.payload as Message;
        // 只添加不是自己发送的消息，避免重复
        if (newMsg.userId !== userId) {
          setMessages((prev) => [...prev, newMsg]);
        }
      })
      // 使用 Presence 监听在线用户变化
      .on("presence", { event: "sync" }, () => {
        // 获取当前在线用户状态
        const presenceState = channel.presenceState();
        // 计算在线用户数量
        const count = Object.keys(presenceState).length;
        setUserCount(count);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log(`用户 ${key} 加入了聊天室`, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log(`用户 ${key} 离开了聊天室`, leftPresences);
      });

    // 保存频道引用
    channelRef.current = channel;

    // 订阅频道
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // 设置连接状态
        setIsConnected(true);

        // 使用 Presence 跟踪用户在线状态
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

    // 清理函数
    return () => {
      if (channelRef.current) {
        // 停止跟踪用户在线状态
        channelRef.current.untrack();
        // 取消订阅
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
      isInitializedRef.current = false;
    };
  }, [topic, userId]);

  return {
    messages,
    userCount,
    sendMessage,
    isConnected,
  };
}
