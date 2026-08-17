import { useEffect, useRef, useState } from "react";

/** Reveals `items` in growing chunks of `pageSize`, growing further whenever a sentinel
 *  element (attach `sentinelRef` near the end of the rendered list) scrolls near the
 *  viewport. Infinite-scroll without virtualizing the DOM -- list sizes here are small
 *  enough that slicing an already-in-memory array is the whole cost.
 *  Resets to the first page whenever `resetKey` changes (e.g. a new search query). */
export function useIncrementalReveal<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = count < items.length;

  useEffect(() => {
    setCount(pageSize);
  }, [resetKey, pageSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    // rootMargin loads the next page while the sentinel is still off-screen, before the
    // user actually hits the bottom.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCount((c) => c + pageSize);
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, pageSize]);

  return { visible: items.slice(0, count), hasMore, sentinelRef };
}
