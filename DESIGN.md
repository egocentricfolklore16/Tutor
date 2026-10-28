# Hyper Tutor Design System & Tokens

## Core Aesthetic & Philosophy
Hyper Tutor follows a dark-first, calm, airy, and premium edtech aesthetic inspired by modern focus dashboards.

## Theme Tokens & Canvas
### Dark Mode (Default Hero Experience)
- **Canvas / Background**: `#0D1117` (Near-black with a faint emerald-tinted blue)
- **Surface-1 (Cards / Containers)**: `#141923`
- **Surface-2 (Raised / Hover Surfaces)**: `#1B2230`
- **Surface-3 (Inputs / Interactive Pills)**: `#232D3F`
- **Border**: `rgba(255, 255, 255, 0.08)`
- **Text Primary**: `rgba(248, 250, 252, 0.95)` (`#F8FAFC`)
- **Text Secondary**: `rgba(148, 163, 184, 0.65)` (`#94A3B8`)
- **Text Muted**: `rgba(100, 116, 139, 0.45)` (`#64748B`)

### Light Mode (Focotech Warm Feel)
- **Canvas**: `#FBF3EC` (Warm cream)
- **Card / Surface**: `#FFFAF5` (Warm white)
- **Border**: `rgba(0, 0, 0, 0.06)`
- **Text Primary**: `#1F1B16` (Warm near-black)
- **Text Secondary**: `#6B6257`
- **Text Muted**: `#9C9285`

## Color Roles (Strict Rules)
1. **Emerald (`#10B981` / `#059669`)**: Brand logo mark, success states, Lumo hero background accent, links, focus visible rings.
2. **Orange (`#F26B21`)**: Primary Call-To-Action (CTA) button per screen, progress-bar fill, active navigation item pill, filled streak days.
3. **Amber (`#F59E0B`)**: Streak and XP chips/metrics only.
4. **Cyan (`#06B6D4`)**: Gems balance and rewards only.
5. **Rose (`#F43F5E`)**: Errors, destructive actions, and overdue deadline chips only.
6. **No Violet / Sky as Brand Accents**: Never use purple or sky as primary brand or navigation accents.

## Radii & Spacing (4/8 Grid Scale)
- **Inputs, Chips, Small Pills**: `rounded-xl` (12px)
- **Small Cards, Badges**: `rounded-2xl` (16px)
- **Main Cards, Modals, Sheets**: `rounded-3xl` (24px)
- **Pills, Avatars, Buttons**: `rounded-full` (9999px)
- **Card Padding**: 20px - 24px (`p-5` to `p-6`)
- **Grid Gaps**: 16px - 24px (`gap-4` to `gap-6`)
- **Section Spacing**: 32px (`space-y-8`)

## Typography
- **Font Family**: Plus Jakarta Sans (Fallback: Inter, system-ui)
- **Page Title**: 28-32px / Bold (700)
- **Section Title**: 18-20px / SemiBold (650)
- **Card Title**: 16px / SemiBold (600)
- **Body Text**: 14-16px / Regular (400) - Medium (500)
- **Caption Text**: 12px / Medium (500)
- **Stat Numbers**: 28-36px / Bold (700) with `tabular-nums`
- **Section Labels**: 11-12px uppercase tracking-wide text-muted (`"MENU"`, `"THIS WEEK"`)

## Mascot Rules (Lumo the Owl)
- Lumo appears consistently across greeting heroes, floating AI Tutor triggers, onboarding cards, empty states, and congratulatory moments (`/logo3.png`).

## Guidelines (Do's and Don'ts)
- **DO**: Use tabular numbers (`tabular-nums`) for all numbers and stat counters.
- **DO**: Display real `"0"` values for zeros; never display dashes (`"-d"` or `"-"`).
- **DO**: Render inline retry ErrorStates inside failing widgets rather than page-level error banners.
- **DON'T**: Use arbitrary Tailwind colors (e.g. `bg-[#6C4DF6]`) or raw hex values outside token files.
