# Trail base — Visual Identity

> Established: 2026-03-05

---

## 1. Logo

- **Primary logo**: `logo-full.png` — icon + wordmark
- **Icon variant**: `logo-icon.png` — square, for favicon/mobile/social
- SVG versions to be created in a dedicated vector tool (pending)

---

## 2. Colour Palette

### Primary

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `primary-dark` | `#1A3009` | Deep Forest | Text on light bg, emphasis |
| `primary` | `#2D5016` | Forest Green | Buttons, links, nav, key actions |
| `primary-light` | `#4A7A2E` | Sage | Hover states, secondary elements |

### Secondary & Accent

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `secondary` | `#D4A040` | Golden Amber | Accents, trail markers, CTAs |
| `secondary-light` | `#E8C170` | Light Gold | Highlights, badges |
| `accent` | `#7A8C3A` | Olive | Tags, activity indicators |

### Neutrals

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `neutral-50` | `#FAFAF5` | Warm White | Page background |
| `neutral-100` | `#F0EDE4` | Cream | Card backgrounds |
| `neutral-200` | `#E0DCD0` | Sand | Borders, dividers |
| `neutral-500` | `#8A8578` | Warm Gray | Placeholder text |
| `neutral-800` | `#3A3632` | Dark Brown-Gray | Body text |
| `neutral-900` | `#1E1C1A` | Near Black | Headings |

### Semantic

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `success` | `#3A8A3A` | Trail Green | Confirmations |
| `warning` | `#D4A040` | Amber | Warnings |
| `error` | `#C4422A` | Earthy Red | Errors, destructive actions |
| `info` | `#4A8AB4` | River Blue | Informational |

---

## 3. Typography

**Font family:** DM Sans (Google Fonts)

| Role | Size | Weight |
|------|------|--------|
| Display / H1 | 36px | 700 |
| H2 | 28px | 700 |
| H3 | 20px | 600 |
| H4 / Label | 16px | 500 |
| Body | 15px | 400 |
| Caption / Meta | 13px | 400 |

**Weights used:** 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

---

## 4. Iconography

**Icon set:** [Phosphor Icons](https://phosphoricons.com)

- License: MIT
- Default style: Regular weight
- Size: 16px inline, 20px in buttons, 24px standalone

---

## 5. Design System Foundation

### Spacing Scale (base: 4px)

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `base` | 16px |
| `lg` | 20px |
| `xl` | 24px |
| `2xl` | 32px |
| `3xl` | 40px |
| `4xl` | 48px |
| `5xl` | 64px |

### Border Radii

| Token | Value |
|-------|-------|
| `none` | 0 |
| `sm` | 4px |
| `md` | 8px |
| `lg` | 12px |
| `xl` | 16px |
| `full` | 9999px |
| `button` | 6px |

### Shadows

| Token | Value |
|-------|-------|
| `sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `base` | `0 1px 3px rgba(0,0,0,0.08)` |
| `md` | `0 4px 12px rgba(0,0,0,0.08)` |
| `lg` | `0 8px 24px rgba(0,0,0,0.1)` |
| `xl` | `0 16px 48px rgba(0,0,0,0.12)` |

### Component Tokens

**Buttons:** 6px radius, 3 sizes (sm/default/lg), 5 variants (primary/secondary/outline/ghost/danger)

**Inputs:** 8px radius, 2px border, focus ring uses `primary`

**Cards:** 12px radius, 1px border `neutral-200`, hover shadow `md`

**Tags:** `full` radius (pill), 4 variants (primary/accent/secondary/neutral)

**Alerts:** 8px radius, tinted background + matching text color per semantic type

---

## Preview Files

- `palette.html` — colour swatch preview
- `typography.html` — type scale and samples
- `design-system.html` — full component token preview
