import redis from "@/lib/redis";
import React from "react";

async function page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const initialTopic = await redis.zrange(`roome:${topic}`, 0, 49, {
    withScores: true,
  });

  const words: { text: string; value: number }[] = [];

  for (let i = 0; i < initialData.length; i++) {
    const [text, value] = initialData.slice(i, i + 2);

    if (typeof text === "string" && typeof value === "number") {
      words.push({ text, value });
    }
  }

  await redis.incr("served-requests");
  return <ClientPage initialData={words} topicName={topic} />;
}

export default page;
