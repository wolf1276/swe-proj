# Interface and interaction design

Source flows: S2 pp. 2-4; S3 pp. 2-8. All visual details below are proposed defaults; the PDFs supply no finished interface design.

## Direction

Build a calm campus noticeboard with strong information hierarchy. Use a warm neutral background, white surfaces, dark ink and a restrained deep teal accent. Proposed tokens: background #F7F7F2, surface #FFFFFF, ink #172927, accent #146356, danger #B42318. Verify contrast in the actual implementation. Use a readable system sans-serif, 16px body, 24-32px page headings, an 8px spacing scale and visible keyboard focus. Avoid decorative dashboards that obscure item discovery.

Desktop: top navigation, a compact filter sidebar and a responsive listing grid. Mobile: single-column content, a visible stacked filter form, labeled controls and no horizontal page overflow (local D16). Target usable 44px interactive hit areas. Respect reduced motion; do not use color alone for condition/status.

## Screens and routes (proposed)

| Screen | Contents and actions | Important states |
| --- | --- | --- |
| /sign-in and /verify | Campus email, verification instructions, resend, generic failure, logout | Ineligible domain, expired/used token, delivery failure, pending verification |
| /listings | Search, category, price range, condition, availability, count, paginated cards | Loading, no listings, no matches, retryable error |
| /listings/:id | Description, category, sale/donation, price, condition, availability, owner display name, Contact, Report | Unavailable, removed/deleted, self-owned; no public email |
| /listings/new | Title, description, category, offer type, price when sale, condition, availability | Validation, saving, retry without duplicate creation |
| /my-listings and /listings/:id/edit | Owner items, edit, availability update, delete confirmation | Empty state, conflict, access denied, already removed |
| /contacts | Sent and received interest records; participant-only counterpart email after explicit sharing | Empty, saved, notification failure, listing no longer available |
| Report dialog | Reason, optional explanation, submit | Validation, success receipt, duplicate handling |
| /admin/reports | Report queue, listing context, reason, review, dismiss/remove | Pending/resolved, concurrent decision conflict, denied access |
| /admin/users | Minimal user list, status, authorized suspend/reactivate action | Confirmation/reason, audit receipt, self-lockout protection |

## Listing card

Show title, category, condition, sale price or Donation label, availability and a detail link. Prefer a neutral placeholder when images are absent. Do not show seller email, payment buttons, invented ratings or a completed-sale guarantee.

## Interaction rules

- Save filters in the URL; combine filters with AND. Reset returns to a documented baseline. Search submission should work from the keyboard.
- Donation hides the editable sale price; submission normalizes donation price consistently with data-model.md.
- Validate inline with labels and a concise error summary. Preserve entered data on network failure.
- Delete requires explicit confirmation; remove by admin requires a reviewed report and recorded reason. Do not use optimistic success for these operations.
- Contact initiates coordination and displays: “Arrange payment and collection directly with the owner.” Show success only after durable contact creation. Notify delivery failure separately.
- A report does not automatically remove content. A removed item must not flash in results while authorization or data is loading.
- Suspended/expired sessions receive a clear access state; sensitive content must not remain accessible after logout through cached pages.

## Four grayscale wireframes and native Figma handoff

1. Verification/access screen.
2. Browse grid with search and filters.
3. Listing detail with contact/report and owner controls.
4. Admin reports with review/removal panel.

Clickable prototype path: verification -> browse -> detail -> contact confirmation and participant email links, plus report -> admin review -> removal. Add listing editor as an additional frame when needed to demonstrate creation. Four local grayscale SVG frames and a clickable HTML prototype now exist under docs/; see docs/academic-artifacts.md. Native Figma import/link and human review remain pending in tasks.md.

## Accessibility verification

Check keyboard-only use, focus restoration after dialogs, screen reader names, error announcements, contrast, 200% zoom, mobile width and reduced motion. Include loading/empty/error/denied states in review, not only populated desktop screens.

## Implemented interaction refinements

Auth forms use POST semantics and disable credential controls before hydration. Filter controls disable while navigation is pending and retain committed URL state. Report uses a native modal dialog with focus restoration after close; deletion copy describes marketplace removal and retained history. Report review shows the actual listing description, price, condition and availability. User and report lists have protected search/state filters and pagination so older records remain reachable.

Browser QA artifacts are captured under `test-results/` for desktop and 390px mobile layouts. These are application screenshots, not the missing grayscale Figma deliverables.
