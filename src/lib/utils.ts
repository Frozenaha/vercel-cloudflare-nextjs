import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 生成随机头像的函数
export function getRandomAvatar(seed: string) {
  // 使用 DiceBear 的 API 生成随机头像
  const styles = [
    "adventurer",
    "avataaars",
    "bottts",
    "identicon",
    "micah",
    "personas",
  ];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
}

// 生成随机颜色
export function getRandomColor() {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
