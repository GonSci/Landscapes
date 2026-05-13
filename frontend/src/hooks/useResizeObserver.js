import { useState, useEffect } from 'react';

/**
 * useResizeObserver
 * Watches a DOM element ref and returns its live { width, height }.
 * Returns { width: 0, height: 0 } on the first render (before ResizeObserver fires).
 * Chart components should guard against width === 0 before computing D3 scales.
 */
const useResizeObserver = (ref) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(ref.current);

    // Cleanup: disconnect observer when component unmounts
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
};

export default useResizeObserver;
