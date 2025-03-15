import { getRecentMessages, getRoomUserCount } from "@/app/actions";
import ChatRoom from "@/components/ChatRoom";
import redis from "@/lib/redis";
import { notFound } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

async function TopicChatPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  console.log(topic);

  // 检查话题是否存在
  const exists = await redis.sismember("existing-topics", topic);
  if (!exists) {
    notFound();
  }

  // 获取最近的消息
  const recentMessages = await getRecentMessages(topic);

  // 获取当前房间人数
  const userCount = await getRoomUserCount(topic);

  return (
    <div className="min-h-screen">
      <ChatRoom topic={topic} initialMessages={recentMessages} />
    </div>
  );
}

export default TopicChatPage;
