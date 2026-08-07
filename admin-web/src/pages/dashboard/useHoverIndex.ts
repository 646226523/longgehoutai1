import { useState, useCallback } from 'react';

export function useHoverIndex(
  dataLen: number,
  svgWidth: number,
  marginLeft: number,
  marginRight: number,
): {
  hoverIndex: number | null;
  handleMouseMove: (svgX: number) => void;
  handleMouseLeave: () => void;
  svgXForIndex: (i: number) => number;
} {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = Math.max(svgWidth - marginLeft - marginRight, 1);

  const svgXForIndex = useCallback(
    (i: number): number => {
      if (dataLen <= 0) return marginLeft;
      if (dataLen === 1) return marginLeft + plotW / 2;
      const t = Math.max(0, Math.min(1, i / (dataLen - 1)));
      return marginLeft + t * plotW;
    },
    [dataLen, marginLeft, plotW],
  );

  const handleMouseMove = useCallback(
    (svgX: number): void => {
      if (dataLen <= 0) {
        setHoverIndex(null);
        return;
      }
      if (svgX < marginLeft || svgX > svgWidth - marginRight) {
        setHoverIndex(null);
        return;
      }
      if (dataLen === 1) {
        setHoverIndex(0);
        return;
      }
      const t = (svgX - marginLeft) / plotW;
      const rawIndex = t * (dataLen - 1);
      const idx = Math.round(rawIndex);
      const clampedIdx = Math.max(0, Math.min(dataLen - 1, idx));
      setHoverIndex(clampedIdx);
    },
    [dataLen, marginLeft, marginRight, plotW, svgWidth],
  );

  const handleMouseLeave = useCallback((): void => {
    setHoverIndex(null);
  }, []);

  return {
    hoverIndex,
    handleMouseMove,
    handleMouseLeave,
    svgXForIndex,
  };
}
