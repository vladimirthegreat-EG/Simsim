# Parameter Sweep Analysis Summary

**Date**: 2026-01-27T23:31:47.752Z
**Total Configurations Tested**: 211
**Simulations per Configuration**: 100
**Total Simulations**: 21100

## Most Sensitive Parameters

Parameters that have the biggest impact on strategy balance:

| Rank | Parameter | Sensitivity | Best Value | Category |
|------|-----------|-------------|------------|----------|
| 1 | AD_EFFECTIVENESS_DECAY | 0.2% | 0.2 | Advertising |
| 2 | BRAND_DECAY_RATE | 0.0% | 0.02 | Brand |
| 3 | BRAND_MAX_GROWTH | 0.0% | 0.01 | Brand |
| 4 | BRAND_WEIGHT_BUDGET | 0.0% | 4 | Segment Weights |
| 5 | BRAND_WEIGHT_GENERAL | 0.0% | 5 | Segment Weights |
| 6 | BRAND_WEIGHT_ENTHUSIAST | 0.0% | 5 | Segment Weights |
| 7 | BRAND_WEIGHT_PROFESSIONAL | 0.0% | 5 | Segment Weights |
| 8 | BRAND_WEIGHT_ACTIVE | 0.0% | 6 | Segment Weights |
| 9 | QUALITY_WEIGHT_BUDGET | 0.0% | 15 | Segment Weights |
| 10 | QUALITY_WEIGHT_GENERAL | 0.0% | 20 | Segment Weights |
| 11 | QUALITY_WEIGHT_ENTHUSIAST | 0.0% | 30 | Segment Weights |
| 12 | QUALITY_WEIGHT_PROFESSIONAL | 0.0% | 32 | Segment Weights |
| 13 | PRICE_WEIGHT_BUDGET | 0.0% | 35 | Segment Weights |
| 14 | PRICE_WEIGHT_GENERAL | 0.0% | 20 | Segment Weights |
| 15 | FEATURE_WEIGHT_GENERAL | 0.0% | 10 | Segment Weights |

## Recommended Parameter Values

Values that maximize strategy diversity:

| Parameter | Current | Recommended | Change |
|-----------|---------|-------------|--------|
| BRAND_DECAY_RATE | 0.065 | 0.02 | ⚠️ Change |
| BRAND_MAX_GROWTH | 0.02 | 0.01 | ⚠️ Change |
| BRAND_WEIGHT_BUDGET | 8 | 4 | ⚠️ Change |
| BRAND_WEIGHT_GENERAL | 10 | 5 | ⚠️ Change |
| BRAND_WEIGHT_ENTHUSIAST | 10 | 5 | ⚠️ Change |
| BRAND_WEIGHT_PROFESSIONAL | 10 | 5 | ⚠️ Change |
| BRAND_WEIGHT_ACTIVE | 12 | 6 | ⚠️ Change |
| QUALITY_WEIGHT_BUDGET | 22 | 15 | ⚠️ Change |
| QUALITY_WEIGHT_GENERAL | 28 | 20 | ⚠️ Change |
| QUALITY_WEIGHT_ENTHUSIAST | 40 | 30 | ⚠️ Change |
| QUALITY_WEIGHT_PROFESSIONAL | 42 | 32 | ⚠️ Change |
| PRICE_WEIGHT_BUDGET | 50 | 35 | ⚠️ Change |
| PRICE_WEIGHT_GENERAL | 32 | 20 | ⚠️ Change |
| FEATURE_WEIGHT_GENERAL | 20 | 10 | ⚠️ Change |
| FEATURE_WEIGHT_ENTHUSIAST | 20 | 10 | ⚠️ Change |
| AD_BASE_IMPACT | 0.0015 | 0.0005 | ⚠️ Change |
| AD_DIMINISH_THRESHOLD | 3000000 | 1000000 | ⚠️ Change |
| AD_EFFECTIVENESS_DECAY | 0.4 | 0.2 | ⚠️ Change |
| BRANDING_BASE_IMPACT | 0.0025 | 0.001 | ⚠️ Change |
| BRANDING_LINEAR_THRESHOLD | 5000000 | 2000000 | ⚠️ Change |
| ESG_HIGH_THRESHOLD | 700 | 500 | ⚠️ Change |
| ESG_HIGH_BONUS | 0.05 | 0.02 | ⚠️ Change |
| ESG_MID_BONUS | 0.02 | 0.01 | ⚠️ Change |
| PRICE_FLOOR_THRESHOLD | 0.15 | 0.05 | ⚠️ Change |
| PRICE_FLOOR_MAX_PENALTY | 0.3 | 0.1 | ⚠️ Change |
| RUBBER_BAND_TRAILING_BOOST | 1.15 | 1 | ⚠️ Change |
| RUBBER_BAND_LEADING_PENALTY | 0.92 | 1 | ⚠️ Change |
| SOFTMAX_TEMPERATURE | 10 | 3 | ⚠️ Change |
| QUALITY_BONUS_CAP | 1.3 | 1 | ⚠️ Change |
| FEATURE_BONUS_CAP | 1.3 | 1 | ⚠️ Change |

## Detailed Results by Parameter

### BRAND_DECAY_RATE

**Category**: Brand
**Description**: Brand value decay per round
**Baseline**: 0.065 %
**Best for Balance**: 0.02 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.02 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.03 | 0% | 0% | 100% | 0% | 0.00 |
| 0.04 | 0% | 0% | 100% | 0% | 0.00 |
| 0.05 | 0% | 0% | 100% | 0% | 0.00 |
| 0.065 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.08 | 0% | 0% | 100% | 0% | 0.00 |
| 0.1 | 0% | 0% | 100% | 0% | 0.00 |
| 0.12 | 0% | 0% | 100% | 0% | 0.00 |
| 0.15 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_MAX_GROWTH

**Category**: Brand
**Description**: Maximum brand growth per round
**Baseline**: 0.02 %
**Best for Balance**: 0.01 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.01 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.015 | 0% | 0% | 100% | 0% | 0.00 |
| 0.02 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.025 | 0% | 0% | 100% | 0% | 0.00 |
| 0.03 | 0% | 0% | 100% | 0% | 0.00 |
| 0.04 | 0% | 0% | 100% | 0% | 0.00 |
| 0.05 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_WEIGHT_BUDGET

**Category**: Segment Weights
**Description**: Brand weight in Budget segment
**Baseline**: 8 pts
**Best for Balance**: 4 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 4 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 6 | 0% | 0% | 100% | 0% | 0.00 |
| 8 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 10 | 0% | 0% | 100% | 0% | 0.00 |
| 12 | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 20 | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_WEIGHT_GENERAL

**Category**: Segment Weights
**Description**: Brand weight in General segment
**Baseline**: 10 pts
**Best for Balance**: 5 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 5 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 8 | 0% | 0% | 100% | 0% | 0.00 |
| 10 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 12 | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 18 | 0% | 0% | 100% | 0% | 0.00 |
| 22 | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_WEIGHT_ENTHUSIAST

**Category**: Segment Weights
**Description**: Brand weight in Enthusiast segment
**Baseline**: 10 pts
**Best for Balance**: 5 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 5 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 8 | 0% | 0% | 100% | 0% | 0.00 |
| 10 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 12 | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 18 | 0% | 0% | 100% | 0% | 0.00 |
| 22 | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_WEIGHT_PROFESSIONAL

**Category**: Segment Weights
**Description**: Brand weight in Professional segment
**Baseline**: 10 pts
**Best for Balance**: 5 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 5 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 8 | 0% | 0% | 100% | 0% | 0.00 |
| 10 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 12 | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 18 | 0% | 0% | 100% | 0% | 0.00 |
| 22 | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |

### BRAND_WEIGHT_ACTIVE

**Category**: Segment Weights
**Description**: Brand weight in Active Lifestyle segment
**Baseline**: 12 pts
**Best for Balance**: 6 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 6 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 9 | 0% | 0% | 100% | 0% | 0.00 |
| 12 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 18 | 0% | 0% | 100% | 0% | 0.00 |
| 22 | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |
| 30 | 0% | 0% | 100% | 0% | 0.00 |

### QUALITY_WEIGHT_BUDGET

**Category**: Segment Weights
**Description**: Quality weight in Budget segment
**Baseline**: 22 pts
**Best for Balance**: 15 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 15 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 18 | 0% | 0% | 100% | 0% | 0.00 |
| 22 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 26 | 0% | 0% | 100% | 0% | 0.00 |
| 30 | 0% | 0% | 100% | 0% | 0.00 |
| 35 | 0% | 0% | 100% | 0% | 0.00 |
| 40 | 0% | 0% | 100% | 0% | 0.00 |

### QUALITY_WEIGHT_GENERAL

**Category**: Segment Weights
**Description**: Quality weight in General segment
**Baseline**: 28 pts
**Best for Balance**: 20 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 20 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 24 | 0% | 0% | 100% | 0% | 0.00 |
| 28 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 32 | 0% | 0% | 100% | 0% | 0.00 |
| 36 | 0% | 0% | 100% | 0% | 0.00 |
| 40 | 0% | 0% | 100% | 0% | 0.00 |
| 45 | 0% | 0% | 100% | 0% | 0.00 |

### QUALITY_WEIGHT_ENTHUSIAST

**Category**: Segment Weights
**Description**: Quality weight in Enthusiast segment
**Baseline**: 40 pts
**Best for Balance**: 30 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 30 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 35 | 0% | 0% | 100% | 0% | 0.00 |
| 40 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 45 | 0% | 0% | 100% | 0% | 0.00 |
| 50 | 0% | 0% | 100% | 0% | 0.00 |
| 55 | 0% | 0% | 100% | 0% | 0.00 |
| 60 | 0% | 0% | 100% | 0% | 0.00 |

### QUALITY_WEIGHT_PROFESSIONAL

**Category**: Segment Weights
**Description**: Quality weight in Professional segment
**Baseline**: 42 pts
**Best for Balance**: 32 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 32 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 37 | 0% | 0% | 100% | 0% | 0.00 |
| 42 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 47 | 0% | 0% | 100% | 0% | 0.00 |
| 52 | 0% | 0% | 100% | 0% | 0.00 |
| 57 | 0% | 0% | 100% | 0% | 0.00 |
| 62 | 0% | 0% | 100% | 0% | 0.00 |

### PRICE_WEIGHT_BUDGET

**Category**: Segment Weights
**Description**: Price weight in Budget segment
**Baseline**: 50 pts
**Best for Balance**: 35 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 35 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 40 | 0% | 0% | 100% | 0% | 0.00 |
| 45 | 0% | 0% | 100% | 0% | 0.00 |
| 50 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 55 | 0% | 0% | 100% | 0% | 0.00 |
| 60 | 0% | 0% | 100% | 0% | 0.00 |
| 65 | 0% | 0% | 100% | 0% | 0.00 |

### PRICE_WEIGHT_GENERAL

**Category**: Segment Weights
**Description**: Price weight in General segment
**Baseline**: 32 pts
**Best for Balance**: 20 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 20 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |
| 32 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 38 | 0% | 0% | 100% | 0% | 0.00 |
| 44 | 0% | 0% | 100% | 0% | 0.00 |
| 50 | 0% | 0% | 100% | 0% | 0.00 |

### FEATURE_WEIGHT_GENERAL

**Category**: Segment Weights
**Description**: Feature weight in General segment
**Baseline**: 20 pts
**Best for Balance**: 10 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 10 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 20 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |
| 30 | 0% | 0% | 100% | 0% | 0.00 |
| 35 | 0% | 0% | 100% | 0% | 0.00 |
| 40 | 0% | 0% | 100% | 0% | 0.00 |

### FEATURE_WEIGHT_ENTHUSIAST

**Category**: Segment Weights
**Description**: Feature weight in Enthusiast segment
**Baseline**: 20 pts
**Best for Balance**: 10 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 10 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 20 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 25 | 0% | 0% | 100% | 0% | 0.00 |
| 30 | 0% | 0% | 100% | 0% | 0.00 |
| 35 | 0% | 0% | 100% | 0% | 0.00 |
| 40 | 0% | 0% | 100% | 0% | 0.00 |

### AD_BASE_IMPACT

**Category**: Advertising
**Description**: Base advertising impact per $1M
**Baseline**: 0.0015 %/$1M
**Best for Balance**: 0.0005 %/$1M
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.0005 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.001 | 0% | 0% | 100% | 0% | 0.00 |
| 0.0015 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.002 | 0% | 0% | 100% | 0% | 0.00 |
| 0.0025 | 0% | 0% | 100% | 0% | 0.00 |
| 0.003 | 0% | 0% | 100% | 0% | 0.00 |
| 0.004 | 0% | 0% | 100% | 0% | 0.00 |

### AD_DIMINISH_THRESHOLD

**Category**: Advertising
**Description**: Threshold for diminishing returns
**Baseline**: 3000000 $
**Best for Balance**: 1000000 $
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 1000000 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 2000000 | 0% | 0% | 100% | 0% | 0.00 |
| 3000000 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 4000000 | 0% | 0% | 100% | 0% | 0.00 |
| 5000000 | 0% | 0% | 100% | 0% | 0.00 |
| 7000000 | 0% | 0% | 100% | 0% | 0.00 |
| 10000000 | 0% | 0% | 100% | 0% | 0.00 |

### AD_EFFECTIVENESS_DECAY

**Category**: Advertising
**Description**: Effectiveness decay per chunk
**Baseline**: 0.4 %
**Best for Balance**: 0.2 %
**Sensitivity**: 0.2%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.2 ⭐ | 0% | 0% | 99% | 1% | 0.04 |
| 0.3 | 0% | 0% | 100% | 0% | 0.00 |
| 0.4 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.5 | 0% | 0% | 100% | 0% | 0.00 |
| 0.6 | 0% | 0% | 100% | 0% | 0.00 |
| 0.7 | 0% | 0% | 100% | 0% | 0.00 |
| 0.8 | 0% | 0% | 100% | 0% | 0.00 |

### BRANDING_BASE_IMPACT

**Category**: Branding
**Description**: Base branding impact per $1M
**Baseline**: 0.0025 %/$1M
**Best for Balance**: 0.001 %/$1M
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.001 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.0015 | 0% | 0% | 100% | 0% | 0.00 |
| 0.002 | 0% | 0% | 100% | 0% | 0.00 |
| 0.0025 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.003 | 0% | 0% | 100% | 0% | 0.00 |
| 0.004 | 0% | 0% | 100% | 0% | 0.00 |
| 0.005 | 0% | 0% | 100% | 0% | 0.00 |

### BRANDING_LINEAR_THRESHOLD

**Category**: Branding
**Description**: Linear returns threshold
**Baseline**: 5000000 $
**Best for Balance**: 2000000 $
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 2000000 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 3000000 | 0% | 0% | 100% | 0% | 0.00 |
| 5000000 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 7000000 | 0% | 0% | 100% | 0% | 0.00 |
| 10000000 | 0% | 0% | 100% | 0% | 0.00 |
| 15000000 | 0% | 0% | 100% | 0% | 0.00 |

### ESG_HIGH_THRESHOLD

**Category**: ESG
**Description**: Threshold for high ESG bonus
**Baseline**: 700 pts
**Best for Balance**: 500 pts
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 500 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 600 | 0% | 0% | 100% | 0% | 0.00 |
| 700 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 800 | 0% | 0% | 100% | 0% | 0.00 |
| 850 | 0% | 0% | 100% | 0% | 0.00 |
| 900 | 0% | 0% | 100% | 0% | 0.00 |

### ESG_HIGH_BONUS

**Category**: ESG
**Description**: Revenue bonus for high ESG
**Baseline**: 0.05 %
**Best for Balance**: 0.02 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.02 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.03 | 0% | 0% | 100% | 0% | 0.00 |
| 0.05 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.07 | 0% | 0% | 100% | 0% | 0.00 |
| 0.1 | 0% | 0% | 100% | 0% | 0.00 |
| 0.15 | 0% | 0% | 100% | 0% | 0.00 |

### ESG_MID_BONUS

**Category**: ESG
**Description**: Revenue bonus for mid ESG
**Baseline**: 0.02 %
**Best for Balance**: 0.01 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.01 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.02 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.03 | 0% | 0% | 100% | 0% | 0.00 |
| 0.04 | 0% | 0% | 100% | 0% | 0.00 |
| 0.05 | 0% | 0% | 100% | 0% | 0.00 |

### PRICE_FLOOR_THRESHOLD

**Category**: Pricing
**Description**: Price floor penalty threshold
**Baseline**: 0.15 %
**Best for Balance**: 0.05 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.05 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.1 | 0% | 0% | 100% | 0% | 0.00 |
| 0.15 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.2 | 0% | 0% | 100% | 0% | 0.00 |
| 0.25 | 0% | 0% | 100% | 0% | 0.00 |
| 0.3 | 0% | 0% | 100% | 0% | 0.00 |

### PRICE_FLOOR_MAX_PENALTY

**Category**: Pricing
**Description**: Maximum price floor penalty
**Baseline**: 0.3 %
**Best for Balance**: 0.1 %
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 0.1 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.2 | 0% | 0% | 100% | 0% | 0.00 |
| 0.3 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.4 | 0% | 0% | 100% | 0% | 0.00 |
| 0.5 | 0% | 0% | 100% | 0% | 0.00 |
| 0.6 | 0% | 0% | 100% | 0% | 0.00 |

### RUBBER_BAND_TRAILING_BOOST

**Category**: Rubber Banding
**Description**: Boost for trailing teams
**Baseline**: 1.15 x
**Best for Balance**: 1 x
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 1 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 1.05 | 0% | 0% | 100% | 0% | 0.00 |
| 1.1 | 0% | 0% | 100% | 0% | 0.00 |
| 1.15 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 1.2 | 0% | 0% | 100% | 0% | 0.00 |
| 1.25 | 0% | 0% | 100% | 0% | 0.00 |
| 1.3 | 0% | 0% | 100% | 0% | 0.00 |

### RUBBER_BAND_LEADING_PENALTY

**Category**: Rubber Banding
**Description**: Penalty for leading teams
**Baseline**: 0.92 x
**Best for Balance**: 1 x
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 1 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 0.95 | 0% | 0% | 100% | 0% | 0.00 |
| 0.92 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 0.88 | 0% | 0% | 100% | 0% | 0.00 |
| 0.85 | 0% | 0% | 100% | 0% | 0.00 |
| 0.8 | 0% | 0% | 100% | 0% | 0.00 |

### SOFTMAX_TEMPERATURE

**Category**: Market Share
**Description**: Softmax temperature (higher = more equal)
**Baseline**: 10 
**Best for Balance**: 3 
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 3 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 5 | 0% | 0% | 100% | 0% | 0.00 |
| 8 | 0% | 0% | 100% | 0% | 0.00 |
| 10 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 12 | 0% | 0% | 100% | 0% | 0.00 |
| 15 | 0% | 0% | 100% | 0% | 0.00 |
| 20 | 0% | 0% | 100% | 0% | 0.00 |
| 30 | 0% | 0% | 100% | 0% | 0.00 |

### QUALITY_BONUS_CAP

**Category**: Scoring
**Description**: Maximum quality score multiplier
**Baseline**: 1.3 x
**Best for Balance**: 1 x
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 1 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 1.1 | 0% | 0% | 100% | 0% | 0.00 |
| 1.2 | 0% | 0% | 100% | 0% | 0.00 |
| 1.3 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 1.4 | 0% | 0% | 100% | 0% | 0.00 |
| 1.5 | 0% | 0% | 100% | 0% | 0.00 |
| 1.75 | 0% | 0% | 100% | 0% | 0.00 |
| 2 | 0% | 0% | 100% | 0% | 0.00 |

### FEATURE_BONUS_CAP

**Category**: Scoring
**Description**: Maximum feature score multiplier
**Baseline**: 1.3 x
**Best for Balance**: 1 x
**Sensitivity**: 0.0%

| Value | Volume | Premium | Brand | Balanced | Diversity |
|-------|--------|---------|-------|----------|----------|
| 1 ⭐ | 0% | 0% | 100% | 0% | 0.00 |
| 1.1 | 0% | 0% | 100% | 0% | 0.00 |
| 1.2 | 0% | 0% | 100% | 0% | 0.00 |
| 1.3 (baseline) | 0% | 0% | 100% | 0% | 0.00 |
| 1.4 | 0% | 0% | 100% | 0% | 0.00 |
| 1.5 | 0% | 0% | 100% | 0% | 0.00 |
| 1.75 | 0% | 0% | 100% | 0% | 0.00 |
| 2 | 0% | 0% | 100% | 0% | 0.00 |

