"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useMutation } from "@tanstack/react-query";
import { createTopic } from "@/app/actions";

export default function TopicCreator() {
  const [topic, setTopic] = useState("");
  const { mutate, isPending, error } = useMutation({
    mutationFn: createTopic,
  });
  return (
    <div className="mt-12 flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={topic}
          onChange={({ target }) => setTopic(target.value)}
          className="bg-white min-w-64"
          placeholder="Enter topic here..."
        />
        <Button
          disabled={isPending}
          onClick={() => mutate({ topicName: topic })}
        >
          Create
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
    </div>
  );
}
