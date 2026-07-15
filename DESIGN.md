# StoreShot Design System

## Product Register

StoreShot is a production tool for launch teams preparing App Store and Google Play preview screenshots. The interface should feel like a focused SaaS editor: quiet, dense, predictable, and built around repeated release work.

## Information Architecture

The editor uses a three-pane workspace:

- Left pane: global setup for platform, device chrome, templates, and screenshot background.
- Center pane: the release board with the 10 screenshot pages, upload/drop targets, page status, and visual review.
- Right pane: selected-page inspector with a 10-page navigator, copy, visibility, template, mockup transform, and prompt JSON operations.
- The inspector includes an export readiness panel so users can see missing images, hidden text layers, generated file count, and iPad folder inclusion before exporting.

The top bar is reserved for project-level state and final actions: upload, reset, format, and ZIP export. Per-page editing should happen in the right inspector, not repeated under every page card.

## Visual Direction

- The app UI stays monochrome so exported screenshot colors remain the primary visual signal.
- Use restrained neutral surfaces: black left rail, light canvas, white control panels, and strong black active states.
- Use borders and compact elevation sparingly. Avoid decorative gradients, glass effects, oversized cards, and marketing-page composition.
- Cards use an 8px radius. Buttons and inputs use a consistent 8px radius.

## Component Rules

- Primary action: black filled button, used only for ZIP export.
- Secondary action: white button with neutral border, used for upload/reset/prompt helpers.
- Text action: compact outline button inside dense panels.
- Form controls use native select/input/textarea with consistent sizing, labels, focus states, and disabled states.
- Page cards show only page identity, selection state, preview, and file status. Editing controls live in the inspector.
- Page navigation in the inspector shows completion status without forcing users to scroll the release board.
- Selecting a page from any control should keep the central release board aligned to that page.
- Export readiness is shown as operational status, not as a decorative metric block.

## Workflow

1. Choose platform and global screenshot style in the left pane.
2. Drop or bulk-upload images into the center release board.
3. Select a page from the board or the inspector navigator to edit copy, template, visibility, and mockup transform.
4. The central release board follows the selected page so users keep visual context while editing.
5. Check export readiness in the inspector, then choose image format and export ZIP from the top bar.

## Responsive Behavior

Desktop is the primary workflow. On narrow screens, panes stack in order: global setup, export bar, release board, inspector. Text must remain readable and controls must not overlap.
