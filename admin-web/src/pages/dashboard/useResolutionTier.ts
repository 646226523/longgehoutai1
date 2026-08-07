import { useState, useEffect } from 'react';

export type ResolutionTier = '2k' | '1080p' | 'compact';

export interface LayoutV3Config {
  tier: ResolutionTier;
  columns: { leftPct: 60; rightPct: 40; gapPx: 16 };
  cardHeightPx: number;
  titleBarH: 48;
  legendBarH: 40;
  bodyPadding: 16;
  leftColumn: {
    mainHeightPx: number;
    subHeightPx: number;
    gapPx: number;
  };
  rightColumn: {
    kpiCardH: number;
    kpiGap: 12;
    statsDrawerH: number;
    afterKpiGap: 16;
    afterStatsGap: 12;
  };
  gridMain: { top: number; right: number; bottom: number; left: number };
  gridSub: { top: number; right: number; bottom: number; left: number };
  baseFontSizePx: 16 | 14 | 13;
  kpiValueSizePx: 24 | 22 | 20;
  xTickInterval: number;
  xLabelRotateDeg: number;
  enableDataZoom: boolean;
  resizeDebounceMs: 200;
  mainBarWidthsWeek7Pct: number;
  mainBarMaxWidthPx: { week7: number; week30: number; week90: number };
  endLabelReserveRightPx: number;
  axisLabelHideOverlap: boolean;
  xRotateMainDeg: number;
  xRotateSubDeg: number;
}

export interface LayoutConfig {
  tier: ResolutionTier;
  containerHeight: string;
  minHeight: number;
  gridMain: { top: number; right: number; bottom: number; left: number };
  gridSub: { top: number; right: number; bottom: number; left: number };
  baseFontSizePx: 16 | 14 | 13;
  xTickInterval: number;
  xLabelRotateDeg: number;
  enableDataZoom: boolean;
  resizeDebounceMs: 200;
  layoutV3: LayoutV3Config;
}

interface TierPreset {
  tier: ResolutionTier;
  containerHeight: string;
  gridMain: { top: number; right: number; bottom: number; left: number };
  gridSub: { top: number; right: number; bottom: number; left: number };
  baseFontSizePx: 16 | 14 | 13;
  xTickInterval: number;
  xLabelRotateDeg: number;
  enableDataZoom: boolean;
  cardHeightPx: number;
  leftGapPx: number;
  mainHeightPx: number;
  subHeightPx: number;
  kpiCardH: number;
  statsDrawerH: number;
  kpiValueSizePx: 24 | 22 | 20;
  mainBarWidthsWeek7Pct: number;
  mainBarMaxWidthPx: { week7: number; week30: number; week90: number };
  endLabelReserveRightPx: number;
  axisLabelHideOverlap: boolean;
  xRotateMainDeg: number;
  xRotateSubDeg: number;
}

const TIER_2K: TierPreset = {
  tier: '2k',
  containerHeight: '840px',
  cardHeightPx: 840,
  gridMain: { top: 38, right: 86, bottom: 68, left: 64 },
  gridSub: { top: 32, right: 32, bottom: 62, left: 54 },
  baseFontSizePx: 16,
  xTickInterval: 1,
  xLabelRotateDeg: -5,
  enableDataZoom: true,
  leftGapPx: 40,
  mainHeightPx: 520,
  subHeightPx: 180,
  kpiCardH: 84,
  statsDrawerH: 260,
  kpiValueSizePx: 24,
  mainBarWidthsWeek7Pct: 50,
  mainBarMaxWidthPx: { week7: 40, week30: 20, week90: 12 },
  endLabelReserveRightPx: 42,
  axisLabelHideOverlap: false,
  xRotateMainDeg: -5,
  xRotateSubDeg: -5,
};

const TIER_1080P: TierPreset = {
  tier: '1080p',
  containerHeight: '700px',
  cardHeightPx: 700,
  gridMain: { top: 34, right: 76, bottom: 60, left: 56 },
  gridSub: { top: 30, right: 28, bottom: 52, left: 46 },
  baseFontSizePx: 14,
  xTickInterval: 1,
  xLabelRotateDeg: -8,
  enableDataZoom: false,
  leftGapPx: 30,
  mainHeightPx: 430,
  subHeightPx: 140,
  kpiCardH: 72,
  statsDrawerH: 220,
  kpiValueSizePx: 22,
  mainBarWidthsWeek7Pct: 50,
  mainBarMaxWidthPx: { week7: 36, week30: 18, week90: 10 },
  endLabelReserveRightPx: 36,
  axisLabelHideOverlap: false,
  xRotateMainDeg: -8,
  xRotateSubDeg: -10,
};

const TIER_COMPACT: TierPreset = {
  tier: 'compact',
  containerHeight: '600px',
  cardHeightPx: 600,
  gridMain: { top: 30, right: 70, bottom: 58, left: 50 },
  gridSub: { top: 26, right: 24, bottom: 50, left: 40 },
  baseFontSizePx: 13,
  xTickInterval: 1,
  xLabelRotateDeg: -22,
  enableDataZoom: false,
  leftGapPx: 20,
  mainHeightPx: 380,
  subHeightPx: 120,
  kpiCardH: 64,
  statsDrawerH: 180,
  kpiValueSizePx: 20,
  mainBarWidthsWeek7Pct: 50,
  mainBarMaxWidthPx: { week7: 32, week30: 14, week90: 8 },
  endLabelReserveRightPx: 30,
  axisLabelHideOverlap: false,
  xRotateMainDeg: -22,
  xRotateSubDeg: -28,
};

const MIN_HEIGHT = 400 as const;
const RESIZE_DEBOUNCE_MS = 200 as const;

export function resolveTier(innerWidth: number): ResolutionTier {
  if (innerWidth >= 2560) return '2k';
  if (innerWidth >= 1920) return '1080p';
  return 'compact';
}

export function buildLayoutConfig(tier: ResolutionTier): LayoutConfig {
  const preset = tier === '2k' ? TIER_2K : tier === '1080p' ? TIER_1080P : TIER_COMPACT;
  const layoutV3: LayoutV3Config = {
    tier: preset.tier,
    columns: { leftPct: 60, rightPct: 40, gapPx: 16 },
    cardHeightPx: preset.cardHeightPx,
    titleBarH: 48,
    legendBarH: 40,
    bodyPadding: 16,
    leftColumn: {
      mainHeightPx: preset.mainHeightPx,
      subHeightPx: preset.subHeightPx,
      gapPx: preset.leftGapPx,
    },
    rightColumn: {
      kpiCardH: preset.kpiCardH,
      kpiGap: 12,
      statsDrawerH: preset.statsDrawerH,
      afterKpiGap: 16,
      afterStatsGap: 12,
    },
    gridMain: { ...preset.gridMain },
    gridSub: { ...preset.gridSub },
    baseFontSizePx: preset.baseFontSizePx,
    kpiValueSizePx: preset.kpiValueSizePx,
    xTickInterval: preset.xTickInterval,
    xLabelRotateDeg: preset.xLabelRotateDeg,
    enableDataZoom: preset.enableDataZoom,
    resizeDebounceMs: RESIZE_DEBOUNCE_MS,
    mainBarWidthsWeek7Pct: preset.mainBarWidthsWeek7Pct,
    mainBarMaxWidthPx: { ...preset.mainBarMaxWidthPx },
    endLabelReserveRightPx: preset.endLabelReserveRightPx,
    axisLabelHideOverlap: preset.axisLabelHideOverlap,
    xRotateMainDeg: preset.xRotateMainDeg,
    xRotateSubDeg: preset.xRotateSubDeg,
  };
  return {
    tier: preset.tier,
    containerHeight: preset.containerHeight,
    minHeight: MIN_HEIGHT,
    gridMain: { ...preset.gridMain },
    gridSub: { ...preset.gridSub },
    baseFontSizePx: preset.baseFontSizePx,
    xTickInterval: preset.xTickInterval,
    xLabelRotateDeg: preset.xLabelRotateDeg,
    enableDataZoom: preset.enableDataZoom,
    resizeDebounceMs: RESIZE_DEBOUNCE_MS,
    layoutV3,
  };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, wait);
  };
}

export function useResolutionTier(): LayoutConfig {
  const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const [tier, setTier] = useState<ResolutionTier>(() => resolveTier(initialWidth));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq2k = window.matchMedia('(min-width: 2560px)');
    const mq1080p = window.matchMedia('(min-width: 1920px)');

    const onChange = () => {
      const newTier = resolveTier(window.innerWidth);
      setTier((prev) => (prev !== newTier ? newTier : prev));
    };

    mq2k.addEventListener('change', onChange);
    mq1080p.addEventListener('change', onChange);

    onChange();

    return () => {
      mq2k.removeEventListener('change', onChange);
      mq1080p.removeEventListener('change', onChange);
    };
  }, []);

  return buildLayoutConfig(tier);
}
