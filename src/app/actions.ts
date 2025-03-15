"use server";

import redis from "@/lib/redis";
import { revalidatePath } from "next/cache";
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

// 更新房间人数
export async function updateRoomUserCount(topic: string, increment: boolean) {
  const roomKey = `room:${topic}:users`;

  if (increment) {
    // 增加房间人数
    await redis.incr(roomKey);
  } else {
    // 减少房间人数，确保不会小于0
    const count = (await redis.get(roomKey)) as string;
    if (count && parseInt(count) > 0) {
      await redis.decr(roomKey);
    }
  }

  // 返回当前房间人数
  return await redis.get(roomKey);
}

// 获取房间人数
export async function getRoomUserCount(topic: string) {
  const roomKey = `room:${topic}:users`;
  const count = await redis.get(roomKey);
  return count ? parseInt(count as string) : 0;
}

// 保存消息到Redis
export async function saveMessage(topic: string, message: any) {
  const messagesKey = `room:${topic}:messages`;

  // 将消息添加到列表
  await redis.lpush(messagesKey, JSON.stringify(message));

  // 保持列表长度为50
  await redis.ltrim(messagesKey, 0, 49);

  return message;
}

// 获取最近的消息
export async function getRecentMessages(topic: string) {
  const messagesKey = `room:${topic}:messages`;

  // 获取最近的50条消息
  const messages = await redis.lrange(messagesKey, 0, 49);

  // 解析JSON
  return messages.map((msg) => JSON.parse(msg as string)).reverse();
}
