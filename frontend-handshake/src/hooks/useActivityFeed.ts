import { useState, useCallback } from "react";
import type { FeedItem, FeedItemType } from "@/types/handshake";

const MAX_ITEMS = 50;

export function useActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const addItem = useCallback((type: FeedItemType, label: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setItems((prev) => [{ id, type, label, timestamp: Date.now() }, ...prev].slice(0, MAX_ITEMS));
  }, []);

  return { items, addItem };
}
