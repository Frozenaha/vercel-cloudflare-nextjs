"use server";

import redis from "@/lib/redis";
import { redirect } from "next/navigation";

export async function createTopic({ topicName }: { topicName: string }) {
  const regex = /^[a-zA-Z-]+$/;
  if (!topicName || topicName.length > 50) {
    return { error: "Name must be between 1 and 50 chars" };
  }

  if (!regex.test(topicName)) {
    return { error: "Only letters and hyphens allowed in name" };
  }
  await redis.sadd("existing-topics", topicName);

  redirect(`/scalable/${topicName}`);
}

// 保存消息到Redis
export async function saveMessage(
  topic: string,
  message: {
    id: string;
    text: string;
    userId: string;
    username: string;
    avatar: string;
    createdAt: string;
  }
) {
  try {
    // 将消息保存到 Redis 列表中
    await redis.lpush(`messages:${topic}`, JSON.stringify(message));
    // 限制消息历史记录数量，只保留最近的 50 条消息
    await redis.ltrim(`messages:${topic}`, 0, 49);
    return { success: true };
  } catch (error) {
    console.error("保存消息失败:", error);
    return { success: false, error };
  }
}

// 获取最近的消息
export async function getRecentMessages(topic: string) {
  try {
    // 获取最近的 50 条消息
    const messages = await redis.lrange(`messages:${topic}`, 0, 49);
    // 解析消息并按时间排序
    return messages
      .map((msg) => JSON.parse(msg))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  } catch (error) {
    console.error("获取消息失败:", error);
    return null;
  }
}

// 获取所有话题
export async function getAllTopics() {
  try {
    const topics = await redis.smembers("existing-topics");
    return topics;
  } catch (error) {
    console.error("获取话题失败:", error);
    return [];
  }
}

// 删除话题
export async function deleteTopic(topic: string) {
  try {
    // 从集合中移除话题
    await redis.srem("existing-topics", topic);
    // 删除相关的消息
    await redis.del(`messages:${topic}`);
    return { success: true };
  } catch (error) {
    console.error("删除话题失败:", error);
    return { success: false, error };
  }
}
