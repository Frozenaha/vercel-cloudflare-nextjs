"use server";

import redis from "@/lib/redis";
import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation";

export async function createTopic({ topicName }: { topicName: string }) {
  const regex = /^[a-zA-Z-]+$/;
  if (!topicName || topicName.length > 50) {
    return { error: "Name must be between 1 and 50 chars" };
  }

  if (!regex.test(topicName)) {
    return { error: "Only letters and hyphens allowed in name" };
  }
  await redis.sadd("existing-topics", topicName);

  // redirect(`/scalable/${topicName}`);
  revalidatePath("/scalable");
}
