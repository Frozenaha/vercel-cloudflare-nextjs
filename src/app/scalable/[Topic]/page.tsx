import { getRecentMessages } from "@/app/actions";
import ChatRoom from "@/components/ChatRoom";
import redis from "@/lib/redis";
import { notFound } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

async function TopicChatPage({ params }: { params: { topic: string } }) {
  const { topic } = params;

  // 检查话题是否存在
  const exists = await redis.sismember("existing-topics", topic);
  if (!exists) {
    notFound();
  }

  try {
    // 获取最近的消息
    const recentMessages = (await getRecentMessages(topic)) || [];

    return (
      <div className="min-h-screen">
        <ChatRoom topic={topic} initialMessages={recentMessages} />
      </div>
    );
  } catch (error) {
    console.error("加载聊天室数据失败:", error);
    // 即使出错也返回一个空的聊天室
    return (
      <div className="min-h-screen">
        <ChatRoom topic={topic} initialMessages={[]} />
      </div>
    );
  }
}

export default TopicChatPage;
