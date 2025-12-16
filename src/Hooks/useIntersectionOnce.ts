import { RefObject, useEffect, useRef, useState } from 'react';

export interface UseIntersectionOnceOptions
  extends Omit<IntersectionObserverInit, 'root'> {
  root?: RefObject<Element | null> | Element | null;
}

export const useIntersectionOnce = <T extends Element>(
  targetRef: RefObject<T>,
  options: UseIntersectionOnceOptions = {},
) => {
  const { root, ...restOptions } = options;
  const [isIntersecting, setIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (isIntersecting) return;

    const element = targetRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIntersecting(true);
      return;
    }

    // 初始检查：如果元素已经在视口内，立即设置
    const checkInitialIntersection = () => {
      const rect = element.getBoundingClientRect();
      const resolvedRoot =
        root && 'current' in root ? root.current : (root as Element | null);
      const rootElement = resolvedRoot || (typeof document !== 'undefined' ? document.documentElement : null);
      
      if (!rootElement) {
        // 如果没有 root，使用 viewport 检查
        const isInViewport =
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0;
        if (isInViewport) {
          setIntersecting(true);
          return true;
        }
      } else {
        // 如果有 root，检查是否在 root 内
        const rootRect = rootElement.getBoundingClientRect();
        const isInRoot =
          rect.top < rootRect.bottom &&
          rect.bottom > rootRect.top &&
          rect.left < rootRect.right &&
          rect.right > rootRect.left;
        if (isInRoot) {
          setIntersecting(true);
          return true;
        }
      }
      return false;
    };

    // 立即检查一次
    if (checkInitialIntersection()) {
      return;
    }

    const resolvedRoot =
      root && 'current' in root ? root.current : (root as Element | null);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIntersecting(true);
            observerRef.current?.disconnect();
          }
        });
      },
      { ...restOptions, root: resolvedRoot ?? null },
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [
    targetRef,
    restOptions.rootMargin,
    restOptions.threshold,
    root,
    isIntersecting,
  ]);

  return isIntersecting;
};
