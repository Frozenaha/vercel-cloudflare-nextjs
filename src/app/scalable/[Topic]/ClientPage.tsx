"use client";
import React, { useState } from "react";

interface ClientPageProps {
  topicName: string;
  initialData: { text: string; value: number }[];
}
function ClientPage({ topicName, initialData }: ClientPageProps) {
  const [words, setWords] = useState<{ text: string; value: number }[]>(
    initialData
  );
  const [input, setInput] = useState("");

  return <div>ClientPage</div>;
} 

export default ClientPage;
