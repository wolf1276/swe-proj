# Demonstration and academic handoff

Source: charter acceptance S1 p. 1; S3 p. 10; S4 system/acceptance plan. The script is backed by the local implementation and automated runs recorded in status.md. A human academic demonstration/sign-off remains pending.

## Five-minute live demo

Run `pnpm demo`, then open http://localhost:3000/sign-in. All three accounts below use `CampusTrade-Demo-2026!`. Keep two browser windows (one incognito) so student and admin sessions stay separate.

1. **Owner** — `a.student@campus.example`: search `Demo:`, open the textbook, edit its price, then refresh. Show the free lab-coat donation. Optionally post a new item.
2. **Buyer** — `b.student@campus.example`: browse/filter, open the demo textbook and click **Express interest**. Open **Contacts** to show the owner email. Switch to the owner's Contacts to show the received message.
3. **Admin** — `admin@campus.example`: open http://localhost:3000/admin/reports. The calculator already has a pending report. Select **Remove listing**, enter a review reason and submit.
4. Return to the buyer's browser and refresh: the calculator is absent from results and its detail page is unavailable.
5. In **Users**, find Student B, suspend the account, then refresh the buyer window to show denied access. Reactivate it when done.

For the verification flow, sign up a new `@campus.example` address and open http://localhost:3000/dev/mailbox to click its real local verification link. This is optional during a short presentation; the three demo accounts are synthetic preverified fixtures.

Rerun `pnpm demo` before presenting again. This restores the three named `Demo:` listings, resets the calculator report to pending, and reactivates the standard demo accounts. Your separately created listings remain intact. Payment and handover are arranged outside CampusTrade.

## Fixtures

Use separate synthetic identities: owner student A, interested student B, approved-domain unverified account, ineligible account, authorized administrator without student eligibility and suspended account. Seed sale/donation listings across categories, conditions and availability, plus one reported listing. Use local/test email only until real domains and mail are approved.

## Demonstration sequence

1. Attempt ineligible and unverified access; show denial. Complete configured mailbox verification for an eligible student and sign in. A preverified seed alone does not demonstrate verification.
2. As A, create a sale listing and donation; edit details, price where applicable and availability. Refresh to show persistence.
3. As B, search and combine category/price/condition/availability filters; open a listing. Show empty-result recovery.
4. As B, attempt an owner-only edit and an admin action through the actual protected interface/API; verify denial.
5. Contact A. Show persisted participant-only contact and notification status. Explain that payment/collection are agreed independently.
6. Report misleading content. As admin, review and remove it with a reason. As B, confirm it disappears from active results and cannot be contacted.
7. Demonstrate suspend/reactivate through authorized user management and denied access on an existing suspended session.
8. Show owner deletion and safe handling of historical contact/report references.
9. Present measured test evidence, performance/capacity results and availability status. Mark pending configuration, monitoring windows and signatures honestly.

## Deliverables checklist

- [x] Local working app and verified fresh-setup instructions.
- [x] Local requirements/design aligned; diagrams exclude payment gateway.
- [ ] Three to four grayscale Figma screens and clickable flow; attach actual artifact links when created.
- [x] Local automated results and test summary delivered; no coverage percentage invented.
- [x] FR/NFR traceability and local measurement methods recorded; formal NFR acceptance remains pending.
- [x] Synthetic local demo accounts/fixtures provided and browser-verified; no real credentials published.
- [ ] Faculty/project acceptance sign-off or documented accepted exceptions from authorized people.

Do not reuse source signature fields as if approval has occurred. Team roles are historical source context, not automatic assignment of new deadlines or consent.

Local visual package: [four grayscale SVGs and import handoff](docs/academic-artifacts.md), [clickable local prototype](docs/prototype.html). This is preparation for native Figma delivery, not a claim that the required Figma workspace artifact exists.

Use `operator@staff.example` to demonstrate admin-only access without student eligibility, and `admin@campus.example` for the synthetic dual-eligible demo admin. A real newly provisioned administrator receives no student mailbox-proof timestamp from the provisioning command.

## Recorded local walkthrough — 11 November 2026

[Silent MP4 walkthrough](artifacts/demo/campustrade-demo.mp4) (121 seconds, 1440×900): owner edits the textbook price, shows a donation, buyer expresses interest and opens contacts, owner opens the inbox, admin reviews/removes the calculator, buyer confirms it is absent. The recording script asserts these transitions; it is available at artifacts/demo/record-demo.cjs. Demo fixtures were restored after recording. Use the five-minute script above for a narrated presentation including verification and user management.
