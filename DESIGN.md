# StoreShot Design System

## Product Register

StoreShot is a production tool for launch teams preparing App Store and Google Play preview screenshots. The interface should feel like a focused SaaS editor: quiet, dense, predictable, and built around repeated release work.

## Information Architecture

The editor uses a three-pane workspace:

- Left pane: global setup for platform, device chrome, templates, and screenshot background.
- Center pane: the release board with the 10 screenshot pages, upload/drop targets, page status, and visual review.
- Right pane: selected-page inspector with a 10-page navigator, copy, visibility, template, mockup transform, and prompt JSON operations.
- The inspector starts with a work queue that shows total completion, current-page image/copy readiness, hidden layer count, and the next page requiring review.
- Work queue actions resolve the current selected-page issue first: image gaps open a selected-page upload action, copy gaps move to copy mode, and ready pages advance to the next issue.
- The work queue exposes a compact next-issues list so launch teams can jump between blocked pages without rescanning the horizontal board.
- The inspector uses task modes for copy, layout, export review, and AI JSON so users see only the controls needed for the current editing task.
- The inspector includes an export readiness panel so users can see missing images, hidden text layers, generated file count, and iPad folder inclusion before exporting.

The top bar is reserved for project-level state and final actions: release progress, undo/redo, upload, reset, format, ZIP export, and a compact guidance line for next steps, upload, JSON, undo, and export feedback. Per-page editing should happen in the right inspector, not repeated under every page card.

## Visual Direction

- The app UI stays monochrome so exported screenshot colors remain the primary visual signal.
- Use restrained neutral surfaces: black left rail, light canvas, white control panels, and strong black active states.
- Use borders and compact elevation sparingly. Avoid decorative gradients, glass effects, oversized cards, and marketing-page composition.
- Cards use an 8px radius. Buttons and inputs use a consistent 8px radius.

## Component Rules

- Primary action: black filled button, used only for ZIP export.
- Secondary action: white button with neutral border, used for upload/reset/prompt helpers.
- Undo and redo are visible secondary actions in the top bar and mirror Command+Z / Command+Shift+Z.
- Text action: compact outline button inside dense panels.
- Form controls use native select/input/textarea with consistent sizing, labels, focus states, and disabled states.
- Screenshot copy fields show compact character counters for badge, title, and subtitle so users can tune store-facing copy before export.
- Export settings stay next to ZIP export. PNG keeps the control compact; JPG reveals a quality slider and mirrors the selected quality in export readiness.
- Template selection uses native dropdowns with a compact visual summary; avoid long template button lists in the global setup pane.
- Background presets stay visible in the left pane, while detailed gradient and HEX editing uses progressive disclosure so launch teams are not forced through long advanced forms on every session.
- Page cards show only page identity, selection state, preview, and file status. Editing controls live in the inspector.
- Inline layer toggles inside page previews must stay visually quiet by default and become prominent only on selected, hover, or keyboard focus states.
- Page cards use restrained status states: waiting, review needed, ready, and editing. Status text should explain the next missing input without adding per-card editors.
- Page navigation in the inspector shows completion status without forcing users to scroll the release board.
- The selected-page identity, page navigator, and inspector mode tabs stay sticky at the top of the inspector so long edit sections do not lose page context.
- Selecting a page from any control should keep the central release board aligned to that page.
- Keyboard navigation supports repeated review: left/right arrows move between pages, while Home/End jump to the first or last page without interfering with text inputs.
- Prompt and JSON operations are shown as a compact three-step rail: copy prompt, generate copy externally, paste/apply JSON.
- JSON schema examples live in a collapsible note so AI-assisted copywriting remains discoverable without crowding the inspector.
- Export readiness is shown as operational status, not as a decorative metric block.
- ZIP export is gated by readiness. If any page is missing an image or visible copy, the export action acts as a guide to the first issue instead of becoming an inert disabled control.
- Empty states should teach the first action inline: dropping multiple PNG/JPG images fills pages in order, while card-level drops continue from that page.
- Upload and JSON feedback should name the affected page range or screen count so repeated release work does not require users to infer what changed.

## Workflow

1. Choose platform and global screenshot style in the left pane.
2. Drop or bulk-upload images into the center release board.
3. Select a page from the board or the inspector navigator to edit copy, template, visibility, and mockup transform.
4. The central release board follows the selected page so users keep visual context while editing.
5. Use the work queue to advance through incomplete pages without manually scanning all 10 cards.
6. Track release progress from the top bar, resolve any queued pages, then choose image format and export ZIP from the top bar.

## Responsive Behavior

Desktop is the primary workflow. On medium screens, the global setup and release board stay side by side while the inspector moves below as a full-width review panel. On narrow screens, panes stack in order: global setup, export bar, release board, inspector. Text must remain readable and controls must not overlap.
