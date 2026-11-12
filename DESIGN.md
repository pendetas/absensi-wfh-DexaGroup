# Design direction

The visual rules for both frontends (`frontend/apps/employee-web`, `frontend/apps/hr-web`) and the shared components in `frontend/packages/shared-ui`. The tokens live in `frontend/packages/shared-ui/src/styles/theme.css`; animation timing lives in `frontend/packages/shared-ui/src/lib/motion.ts`.

## Brief

From the product owner: direct, and HR must see everything at a glance. Use Dexa Group's own colours (dexagroup.com) without copying its logo. After the first, very plain version: make it livelier, with transitions, hover responses and scroll animation (GSAP), still in Dexa's colours. The owner approved the redesign preview in `design-preview/`, except the "Tercatat" stamp, which was dropped.

Design Read: an internal attendance tool for Dexa employees (phone first) and HR admins (laptop first), in a confident working-tool style, dial **ENERGY 2 / RHYTHM 2 / MOTION 2**.

- **ENERGY 2:** the employee home opens on a full red band with a large clock; HR opens on big counts and a chart. Everything else stays quiet so those lead.
- **RHYTHM 2:** screens share one header, panel and list pattern, broken on purpose by the red band (employee) and the arrival chart (HR).
- **MOTION 2:** transitions and scroll-triggered entrances that explain a change; no motion for its own sake (see Motion).

## The motif: the work start line

A dashed line at the work start time (09.00 unless HR changes it) appears wherever time is shown: on the employee's day ruler under the clock, in HR's arrival chart, and in every list row's 07.00 to 19.00 track. Being late is something you see, not only read.

## Colour

| Token | Value | Why |
|---|---|---|
| `brand` | `#A52823` | Dexa red, taken from dexagroup.com. The employee home band, primary buttons, the current page, the work start line. |
| `brand-tint` / `brand-wash` | `#FBEEED` / `#FDF6F5` | Hover and pressed backgrounds, so even quiet controls answer in Dexa's colour. |
| `ink` / `ink-soft` | `#1C1C1E` / `#55555A` | Text. `ink-soft` is 7.4:1 on white, so secondary text and placeholders stay readable. |
| `paper` / `surface` | `#FFFFFF` / `#F4F4F2` | Panels on a warm grey page, so lists stand apart without heavy shadows. |
| `line` / `line-strong` | `#DCDCD8` / `#878781` | Dividers, and field outlines at 3.6:1 (form controls need 3:1). |
| `ok`, `warn` (+ `-mark`) | green, amber | On time and late. Text versions on tints; brighter `-mark` versions for thin bars and dots. Always with words. |

Red means Dexa or "press here", never a status, so "late" does not look like an error. "Belum absen" uses solid black, because those are the people HR has to chase. Roles ("Admin HR") use an outlined badge so they never read as a status.

## Type

Open Sans, the typeface on dexagroup.com, with tabular figures everywhere so times line up. Body text is 15px. The live clock on the employee home (56px, extra bold, seconds dimmed) is the largest thing in either app because it is what the employee checks before pressing the button.

## Layout

- **Employee home:** a red band (date, clock, day ruler, a sentence such as "13 menit lagi sebelum jam masuk"), a white card overlapping its edge with the one next action, and "Minggu ini", Monday to Friday at a glance.
- **HR home:** four count tiles that are also the status filter, the arrival chart (one dot per person on a time axis against the work start line, with the missing count beside it), then the list. Once the tiles scroll away, a slim copy follows under the header.
- **Lists:** every attendance row has a 07.00 to 19.00 track. An open record fades out instead of claiming an end time.
- **Detail:** a drawer from the right on wide screens (HR reads it beside the list), full screen on a phone.
- Navigation is always visible (top bar on wide screens, bottom bar on phones). Every control is at least 44px tall.

## Motion

| When | What | Why |
|---|---|---|
| Hover, press | 150 to 300 ms: primary buttons lift and darken, secondary buttons fill with red tint from the left, names underline in red, photos tilt slightly, the camera lens closes like a shutter. Pressing pushes down. | Every control answers the pointer. |
| Navigation | A red bar slides to the link under the pointer and to the new page. | Shows where you went. |
| Content arrives | Rows, week cells and cards rise in, staggered 50 ms; list rows only as they scroll into view; time bars draw from check-in. A background refresh does not replay it. | The eye follows the order of the list. |
| Something changed | Counts roll to their new value; a check-in mark drops onto the ruler; the card's content re-enters. | Makes the change noticeable. |
| Never | Endless pulses, floating, decorative parallax. | |
| Reduced motion | Every animation jumps to its end state; the loading sweep stops. | |

## Loading

Every screen has a skeleton in the shape of what will load: the red band with the clock and ruler, the check-in card and week cells; the count tiles, chart and list rows with their photo, name and track; the employee table, profile and settings form; and the app shell while the session is restored. A light sweep crosses the placeholders while waiting. Nothing jumps when the data arrives.

## Components

- **Panels:** white, 1px border, 8 to 12px radius. Shadows only on the employee card over the red band, dialogs and the toast.
- **Badges:** a 4px radius, never pill-shaped, each naming a real state or role.
- **Icons:** a set drawn for these screens only, always next to a text label.
- **Photos:** thumbnails are cropped to fill; the detail view shows the whole frame, including the name and time stamp.

## Copy

Indonesian, short, and specific to the action: "Check-in sekarang", "Kirim check-out", "Lihat siapa". Empty and error states say what happened and what to do next. Times are written the Indonesian way ("08.31 WIB").

## Open decision

- **Theme:** light only for now. Not yet confirmed whether a dark mode is wanted (antislop audit 001, item 12).
