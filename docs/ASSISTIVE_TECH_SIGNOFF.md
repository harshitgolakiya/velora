# Assistive Technology Signoff

Use this checklist for the final manual WCAG 2.2 AA review after content, checkout settings, products, and admin workflows are frozen for launch.

## Required Setups

- Windows + NVDA with Chrome or Edge.
- macOS + VoiceOver with Safari.
- Keyboard-only navigation in Chrome or Edge.
- Mobile screen reader spot check with iOS VoiceOver or Android TalkBack.

## Customer Routes

Review these routes in light and dark mode:

- `/`
- `/shop`
- `/product/flared-pants-7461`
- `/cart`
- `/checkout`
- `/account`
- `/contact`
- `/faqs`

For each route, confirm:

- Page title, landmarks, and heading order make sense.
- Header, navigation, filters, drawers, dialogs, carousels, and forms are reachable by keyboard.
- Focus order follows the visual workflow and never lands behind an overlay.
- Screen-reader names match visible control purpose.
- Error messages are announced and identify the field/action to fix.
- Cart, checkout, inventory, coupon, payment, and order-status recovery messages are understandable without visual context.
- Reduced-motion and 200% zoom remain usable.

## Admin Workflows

Review authenticated admin flows:

- Dashboard overview.
- Orders list and order review.
- Product edit and product preview.
- Media edit/upload.
- Content edit and content preview.
- Email template edit/preview.
- Support queue.

For each workflow, confirm:

- Main landmarks and headings identify the active admin area.
- Tables, status chips, action menus, tabs, dialogs, and preview controls have useful names.
- Form validation and mutation success/failure states are announced.
- Keyboard users can complete the primary workflow without pointer input.
- No keyboard trap remains after closing drawers, dialogs, menus, or previews.

## Evidence To Record

Record the final signoff in the launch evidence log:

- Reviewer name.
- Date/time and app build/version.
- Browser and assistive technology versions.
- Routes/workflows reviewed.
- Issues found, severity, owner, and resolution.
- Final decision: pass, conditional pass, or blocked.

Set `ASSISTIVE_TECH_SIGNOFF_URL` in the production launch environment or release notes to point to that evidence.

## Signoff Record Template

Use these fields in the final evidence file referenced by `ASSISTIVE_TECH_SIGNOFF_PATH`:

- Reviewer name:
- Date/time and app build/version:
- Browser and assistive technology versions:
- Routes/workflows reviewed:
- Issues found, severity, owner, and resolution:
- Final decision: pass / conditional pass / blocked
