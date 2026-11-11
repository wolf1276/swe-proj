# Requirements and acceptance

Source baseline: S2 pp. 4-5; consistent restatement in S3 p. 11. Acceptance details below make requirements actionable without asserting that implementation or approval exists. IDs are preserved for traceability.

| ID | Priority | Requirement | Acceptance evidence | Source tests |
| --- | --- | --- | --- | --- |
| FR-1 | High | Verify approved campus email before student access | Unapproved and unverified accounts denied; eligible mailbox verified through configured flow before admission | TC-I01, TC-S01, TC-S02 |
| FR-2 | High | Verified students offer academic/hostel items for sale/donation and express interest | Both offer types persist; a second student discovers and initiates interest | TC-I02, TC-S03, TC-S06 |
| FR-3 | High | Owners edit descriptions/prices where applicable and delete own listings | Owner changes persist; other students cannot change/delete through direct requests | TC-I02, TC-S03 |
| FR-4 | High | Each verified student buys/sells/donates; admin functions restricted | One student identity performs all student activities; unauthorized admin actions denied | TC-D01-D04, TC-I01, TC-S02, TC-S08, basis paths |
| FR-5 | Medium | Interested students contact owners and independently coordinate payment/exchange | Durable contact reaches intended participant workflow; no payment or delivery operation | TC-I04, TC-S06 |
| FR-6 | High | Search and filter by category, price, condition, availability | Each filter and combined predicates return matching persisted items; pagination stable | TC-I03, TC-S04, TC-B01-B03 |
| FR-7 | Medium | Students report inappropriate/misleading listings | Report persists and appears in authorized admin queue; no automatic takedown | TC-I04, TC-S07 |
| FR-8 | High | Admins manage users and remove listings after report review | Authorized user management and reviewed removal persist; students denied; removed items inactive | TC-I04, TC-S07, TC-S08 |
| NFR-1 | Required | Display search results within 5 seconds under normal load | End-to-end measurement under agreed workload; 5.00s meets threshold, 5.01s fails | TC-B01-B03, TC-S04 |
| NFR-2 | Required | Restrict student domains and admin access | Negative eligibility/verification/privilege cases pass at server boundary | TC-D01-D04, TC-S01, TC-S02, basis paths |
| NFR-3 | Required | 99% availability during normal operation period | Agreed monitoring window and downtime evidence support percentage | TC-S05 |
| NFR-4 | Required | Support at least 1,000 registered users while retaining 5-second search target under normal load | Seed >=1,000 accounts and exercise agreed normal workload with displayed-results timing | TC-S05, TC-B01-B03 |

## Business rules

- Matching an approved domain is necessary but not sufficient: require successful email verification and active status.
- Student is one role encompassing buyer, seller and donor activities. Admin privilege is independent of student eligibility.
- Ownership is server-derived and enforced for edits/deletes. Ordinary students cannot set moderation or role fields.
- Sale and donation are explicit offer types; prices apply according to data-model.md and D12.
- Reports require review; admin removal records a reason and removes content from active visibility.
- Contact/transaction records are coordination records. No money, delivery or handover is processed by CampusTrade.

## Source open points

Exact approved domains and verification behavior, category/condition/availability labels, contact method and shared information, availability window, moderation criteria and stale-listing handling require confirmation (S2 p. 5; S3 p. 12; S4 p. 6). Workload is also unapproved (S4 p. 5). See decisions.md for proposed defaults and dependencies.

The 1,000-user target is registered-user capacity, not a promise of 1,000 simultaneous users. A planning table or seeded record count alone does not prove performance or availability.
