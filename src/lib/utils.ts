import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with appropriate units (K, M, B)
 * @param amount - The amount to format
 * @param options - Formatting options
 */
export function formatCurrency(
  amount: number,
  options: {
    showCents?: boolean;
    compact?: boolean;
    currency?: string;
  } = {}
): string {
  const { showCents = false, compact = true, currency = "$" } = options;

  if (compact) {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (absAmount >= 1_000_000_000) {
      return `${sign}${currency}${(absAmount / 1_000_000_000).toFixed(1)}B`;
    }
    if (absAmount >= 1_000_000) {
      return `${sign}${currency}${(absAmount / 1_000_000).toFixed(1)}M`;
    }
    if (absAmount >= 1_000) {
      return `${sign}${currency}${(absAmount / 1_000).toFixed(1)}K`;
    }
    return `${sign}${currency}${absAmount.toFixed(showCents ? 2 : 0)}`;
  }

  // Full format with commas
  return `${currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  })}`;
}

/**
 * Format a number with commas and optional units
 * @param value - The number to format
 * @param options - Formatting options
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    suffix?: string;
  } = {}
): string {
  const { decimals = 0, compact = false, suffix = "" } = options;

  if (compact) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (absValue >= 1_000_000_000) {
      return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B${suffix}`;
    }
    if (absValue >= 1_000_000) {
      return `${sign}${(absValue / 1_000_000).toFixed(1)}M${suffix}`;
    }
    if (absValue >= 1_000) {
      return `${sign}${(absValue / 1_000).toFixed(1)}K${suffix}`;
    }
    return `${sign}${absValue.toFixed(decimals)}${suffix}`;
  }

  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

/**
 * Format a percentage value
 * @param value - The value (0-1 for decimal, or already a percentage)
 * @param options - Formatting options
 */
export function formatPercent(
  value: number,
  options: {
    decimals?: number;
    isDecimal?: boolean;
    showSign?: boolean;
  } = {}
): string {
  const { decimals = 0, isDecimal = false, showSign = false } = options;

  const percentValue = isDecimal ? value * 100 : value;
  const sign = showSign && percentValue > 0 ? "+" : "";

  return `${sign}${percentValue.toFixed(decimals)}%`;
}

/**
 * Format units with appropriate suffix
 * @param value - The number of units
 * @param unit - The unit name (singular)
 */
export function formatUnits(value: number, unit: string): string {
  const formattedValue = value.toLocaleString('en-US');
  return `${formattedValue} ${unit}${value !== 1 ? 's' : ''}`;
}

/**
 * Format CO2 emissions with tons suffix
 */
export function formatCO2(tons: number): string {
  if (tons >= 1_000_000) {
    return `${(tons / 1_000_000).toFixed(1)}M tons`;
  }
  if (tons >= 1_000) {
    return `${(tons / 1_000).toFixed(1)}K tons`;
  }
  return `${tons.toLocaleString()} tons`;
}
