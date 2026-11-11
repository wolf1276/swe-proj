# Source register and reconciliation

All page numbers below are physical PDF pages (1-based). Sources were read locally; text was extracted from all four documents. The proposed Level-1 DFD and conflicting HLD diagram were also inspected visually. No referenced external websites were researched as part of this planning task.

| ID | Local source | Pages | Relevant content |
| --- | --- | --- | --- |
| S1 | /home/ahir/Downloads/swer/1.pdf | 1-2 | Charter: scope, M1-M5, acceptance, risks; team roles/principles |
| S2 | /home/ahir/Downloads/swer/2.pdf | 1-5 | SRS: context pp. 2-3; FR-1..8 p. 4; NFR-1..4 and open points p. 5 |
| S3 | /home/ahir/Downloads/swer/3.pdf | 1-12 | HLD: boundary p. 2; use case p. 3; context/Level-1 DFD pp. 4-5; activity/sequence pp. 6-7; class/HLD pp. 8-9; missing Figma items p. 10; requirements p. 11; alignment/open points p. 12 |
| S4 | /home/ahir/Downloads/swer/4.pdf | 1-6 | Test strategy pp. 1-2; test plan and BVA p. 3; authorization decision table/basis paths p. 4; integration/system cases p. 5; deliverables, traceability and approval p. 6 |

## Interpretation rules

Use S2 as the requirements baseline, S1 for charter acceptance/milestones, S3 for structural guidance subject to its scope corrections, and S4 for verification planning. Later user-approved scope changes must be recorded with affected requirement/test IDs. A later document date alone does not override explicit scope.

- S3 p. 9 shows a payment gateway, but its own interpretation and p. 12 exclude it. Omit payment processing entirely.
- Diagram wording such as transaction, buy or exchange means discovery/contact coordination and listing availability, not checkout or settlement.
- D1, D2 and D3 are logical stores; the PDFs do not require three physical databases.
- The S3 notification gateway does not mandate SMS, realtime chat or a particular provider. Email verification and contact delivery need explicit implementation choices.
- S4 authorization model permits an authorized admin to perform admin actions without student verification; admin privilege alone does not grant student marketplace actions. Preserve and test this distinction unless explicitly revised.
- S4 illustrative helper/coverage is proposed test design, not application code or proof of executed coverage.
- Three to four grayscale Figma screens and a clickable Figma flow are explicitly absent in S3 p. 10. Markdown screen specifications are preparation, not completion of these artifacts.
- Stack, exact domains, status labels, contact method, normal load and availability window are not settled by the PDFs. See decisions.md.

## Provenance of this handoff

requirements.md carries the source IDs. Architecture, route names, schemas, visual tokens, proposed stack and backlog detail are planning recommendations derived from those requirements. They must not be represented as verbatim source mandates. Team/faculty signatures and acceptance remain pending.
