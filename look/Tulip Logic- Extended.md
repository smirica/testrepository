# Tulip Order Entry — Consolidated Extraction and Matching Logic (v5)

**Updated:** August 6, 2026  
**Status:** Current implemented and tested behavior  
**Scope:** Document classification, packet matching, all TemplateDraft fields, multi-quotation behavior, line-item reconciliation, validation, review rules, and PDF/output rules.

## 1. Purpose

This is the single consolidated reference for Tulip’s document-reading logic. It incorporates the earlier field profiles, extended TemplateDraft profiles, packet-matching framework, and the newest supplier-PO patterns.

The core rule is: **classify first, match second, extract third, reconcile fourth, and leave uncertain values visible for review.** Tulip must not improve apparent completion by copying an unrelated value, treating boilerplate as data, or inventing a value.

### Quick plain-language summary

Tulip follows this order:

1. Decide whether each file is a quotation, customer purchase order, or Dongan order acknowledgment.
2. Check whether the files really belong to the same order.
3. Read each file separately before combining anything.
4. Prefer the most reliable source for each specific field.
5. Compare repeated values and show disagreements to the user.
6. Check the math on every item row and order total.
7. Leave a field blank when there is not enough trustworthy information.

### Plain-language glossary

- **Classification:** Deciding what kind of document a file is.
- **Packet:** The group of files that belong to one customer order.
- **Matching anchor:** A reliable fact used to decide whether files belong together, such as PO number, customer, Dongan reference, or catalog number/project.
- **Field-compatible:** The value has the correct meaning for that field. For example, a PO date can fill PO Date, but a requested delivery date cannot.
- **Candidate value:** One possible value found for a field before Tulip chooses the best source.
- **Reconcile:** Compare values from connected files, choose the best-supported one, and flag any disagreement.
- **Normalization:** Put the same type of value into one consistent format, such as changing "$3,780.00 USD" to "3780.00".
- **Review check:** A visible warning explaining a conflict, uncertain source, or arithmetic problem.

## 2. Evidence base

The logic is based on the reviewed Dongan quotation, order-acknowledgment, and customer-PO packets, including General Energy, New Columbia Solar, Belmont Solar, Fluence, Utility Systems Technologies, Bisco, Process Technology, Entegrity, and Wholesale Electric/DS layouts.

The newest regression is based on the supplied PO screenshots and covers:

- Standalone `PO NUMBER` followed by `4501936736` on the next line.
- `Supplier Quotation #: 479473`.
- `Supplier Quotation Date: 12/05/2024`.
- `Supplier Contact: Justin Moody (jmoody@dongan.com)`.
- A page-two item row containing need-by date, quantity, unit, price, and total.
- Manufacturer/catalog lines beginning `DONGAN ELECTRIC MFG CO:`.
- `Tax Value`, line-cost PO total, tax total, and net PO total.

The current automated suite contains **19 passing regression cases** across classification, extraction, packet grouping, arithmetic, PDF output, and the newest supplier-PO format.

## 3. Governing principles

1. **Semantic compatibility comes before source priority.** A quotation date is not a PO date. EXW is not a carrier. A customer material number is not automatically a Dongan catalog number.
2. **Quotation data is preferred for quotation-owned commercial and item fields** when explicit and compatible.
3. **Order acknowledgments control operational Dongan order fields** such as the Dongan order number, acknowledgment order date, and acknowledgment subtotal when present.
4. **Order acknowledgment and PO evidence are fallback/co-equal for most fields** when quotation data is unavailable; explicit conflicts remain review items.
5. **Purchase-order identity comes from the customer PO or the PO number copied onto the acknowledgment.** It never comes from a nearby quote number.
6. **Matching occurs before shared-field extraction.** Values cannot flow across packet groups unless the user explicitly overrides the warning.
7. **Unknown means blank.** “To be added,” “included later,” boilerplate, and missing labels do not mean zero.
8. **Every selected value retains its source filename.** Conflicts are shown instead of silently discarded.

## 4. Current implemented source priority

Tulip assigns field candidates a priority score after confirming that each value is field-compatible.

| Field group | Priority order currently implemented |
|---|---|
| Dongan order number | Acknowledgment → quotation → PO supplier-quotation reference |
| Order date | Acknowledgment → quotation-compatible source → PO `Supplier Quotation Date` |
| Total/subtotal | Acknowledgment → quotation → PO |
| Dongan contact | Quotation → PO supplier contact |
| Project, customer identity, addresses, terms, delivery, and most other fields | Quotation → acknowledgment / PO |
| PO number and PO date | Only sources that produce a semantically valid PO value participate; quotation text does not create a PO date |
| Item description, quantity, price, extension | Quotation → acknowledgment / PO, reconciled by catalog identity |

When sources at relevant priority levels disagree, Tulip keeps the selected value and creates a review check containing every competing filename and value.

## 5. Document reading and classification

### 5.1 Supported files

- **PDF:** Every page is read. Text items are reconstructed into rows using page coordinates, sorted top-to-bottom and left-to-right.
- **DOCX:** Raw text is extracted.
- **Text-like files:** Read as text.
- **Scanned/image-only PDFs:** No OCR is currently performed; these may return little or no text and require review.

### 5.2 Classification order

1. **Order acknowledgment** is detected first from filename terms such as `ACK`/`acknowledg` or visible acknowledgment wording.
2. **Purchase order** is identified from filename PO patterns or strong page text such as `PURCHASE ORDER`, `P.O. NO.`, or PO-form structure.
3. **Quotation** is identified from filename terms such as quotation/quote/Q# or Dongan quotation headers.
4. Anything else is **Other** and is not merged into extraction.

### 5.3 Classification safeguards

- A customer PO remains a PO even when it contains copied Dongan quotation text.
- The word “quote” inside a PO note does not turn the document into a quotation.
- An acknowledgment can be recognized from a later page even when page 1 is not visibly titled acknowledgment.
- Classification happens before generic labels such as `Date`, `Total`, or `Number` are interpreted.

## 6. Normalization contract

### 6.1 Text and companies

- Trim outer whitespace and collapse accidental repeated spaces.
- Preserve meaningful punctuation, legal suffixes, attention lines, and address details.
- Company comparison ignores harmless punctuation, capitalization, and common legal suffixes.
- Reject headings, address-only lines, Dongan-as-vendor, and numeric-only lines as customer companies.

### 6.2 Dates

- Display format: `M/D/YY`.
- Accept numeric, written-month, and ISO-like dates.
- Keep PO, order, quotation, revision, need-by, promise, due, and ship dates semantically separate.

### 6.3 Money

- Canonical format: exactly two decimals without currency text, for example `3780.00`.
- Remove `$`, commas, `USD`, and accounting parentheses before parsing.
- Preserve a real explicit zero; leave unknown charges blank.

### 6.4 Quantities

- Normalize `2.00`, `2.000 EA`, and `2` to `2`.
- Preserve a decimal only for genuinely fractional ordered quantities.
- Do not use line number, shipped quantity, backorder quantity, or package count.

### 6.5 Identifiers

- Preserve leading zeroes, letters, underscores, dashes, meaningful slashes, and internal punctuation.
- Collapse spaces around dashes in PO numbers.
- Remove only decorative catalog-number asterisks.

### 6.6 Yes/no values

- Return `Y` only from an explicit positive statement.
- Return `N` only from an explicit negative statement.
- Otherwise leave blank; silence is not evidence of `N`.

## 7. Packet matching before extraction

### 7.1 Identity signature

Each document receives a matching-only identity containing:

- Document type.
- Dongan/quotation references.
- Purchase-order number.
- Normalized customer identity.
- Normalized project.
- Dongan catalog numbers.
- Supporting dates, which never establish a match by themselves.

### 7.2 Four matching anchors

| Anchor | Positive evidence | Hard-conflict examples |
|---|---|---|
| Dongan reference | Same quotation/order reference or an explicit cross-reference | Incompatible references plus conflicting product/project evidence |
| Customer | Same Dongan customer or normalized company | Different customer plus different order/PO identity |
| Purchase order | Same true PO document number | Different true PO numbers plus different customers |
| Product/project | Shared Dongan catalog, otherwise strongly matching project | Different catalog sets and materially different projects |

### 7.3 Current automatic-match threshold

A pair is considered confidently related when **any** of these is true:

- It shares an explicit Dongan reference.
- It shares the same true PO number.
- At least three of the four anchors agree.

Strong contradictory combinations mark the set as a likely mismatch. Weakly connected files become ambiguous.

### 7.4 Grouping

- Each file is a graph node.
- Each confident relationship is an edge.
- Every connected component becomes one packet group.
- Shared values are reconciled only inside a group.

### 7.5 User decision

- **One confident group:** analysis proceeds.
- **Ambiguous or multiple groups:** Tulip asks whether the user wants to merge.
- **No / keep separate:** each group is analyzed independently; customer and order fields never cross groups.
- **Yes / merge anyway:** files are analyzed together, but disagreements remain visible as review checks.

## 8. Core order-header field profiles

### 8.1 Project Name

- **Preferred source:** Quotation.
- **Labels/regions:** `PROJECT`, `PROJECT:`, `Project`, `Project Name`.
- **Acknowledgment rule:** Capture after `PROJECT:` and continue until serial, quote reference, catalog/item, rule line, or another labeled section.
- **Avoid:** Bare headings, descriptions, customer names, and catalog labels.

### 8.2 Customer No.

- **Patterns:** `Cust#`, `Cust #`, `Customer #`, `Customer No.`, `Customer Number`.
- **Shape:** Commonly five digits, but alphanumeric forms are allowed.
- **Normalization:** Preserve leading zeroes; short numeric values are zero-padded to five digits.
- **Conflict:** Quotation/OA disagreements are shown for review.

### 8.3 Purchase Order No.

- **Acknowledgment:** `PO#` or equivalent, commonly below customer number.
- **PO labels:** `PO #`, `PO No.`, `P.O. No.`, `PO Number`, `Purchase Order`, `Purchase Order #`, `Purchase Order Number`, `Customer PO` when it is truly the document identity.
- **Standalone-label rule:** If `PO NUMBER`, `PO NO.`, or `PURCHASE ORDER NUMBER` is alone on one line, inspect the next nonempty line for the identifier.
- **Title rule:** A number directly below a standalone `PURCHASE ORDER` title is accepted when it contains digits and is not another heading; trailing `*DIRECT*` is removed.
- **Joint-header rule:** In `DATE / P.O. NO.` layouts, read the date and adjacent identifier from the following rows.
- **Shape:** Short numeric, long numeric, letters, dashes, underscores, dots, or slashes.
- **Avoid:** The literal word `NUMBER`, Dongan quote/order number, customer number, invoice number, line number, downstream-reference PO, or copied quote reference.

### 8.4 Dongan Order No. / Quotation Reference

- **Acknowledgment:** `Order#`, `Order No.`, or `Order Number` is authoritative.
- **Quotation-only:** Quotation number provisionally populates the order field.
- **PO-only supplier reference:** `Supplier Quotation #`, `Vendor Quote/Estimate #`, `Dongan Quote #`, or equivalent may populate the order/quotation reference.
- **Newest pattern:** `Supplier Quotation #: 479473` returns `479473`.
- **Multi-quote:** The shared acknowledgment order number remains on all sheets; each sheet separately retains its quote reference.

### 8.5 PO Date

- **Patterns:** `Date Ordered`, `PO Date`, `Purchase Order Date`, `Date Issued`, `Created on`, `Dated`, and joint date/PO columns.
- **Filename fallback:** An unambiguous `YYYY-MM-DD`-style filename date is allowed only when no labeled page value exists and is always flagged for review.
- **Avoid:** Supplier quotation date, quote date, acknowledgment date, need-by date, promise date, due date, ship date, and print date.

### 8.6 Order Date

- **Acknowledgment:** Header `Date`/order date is preferred.
- **PO-only supplier reference:** `Supplier Quotation Date` is accepted as the referenced Dongan order/quotation date, not as PO Date.
- **Newest pattern:** `Supplier Quotation Date: 12/05/2024` returns `12/5/24` in Order Date.
- **Avoid:** PO issue date and delivery dates.

### 8.7 PO Revision No.

- **Patterns:** `PO Rev No.`, `PO Revision No.`, `PO Rev`, or explicit PO-linked revision.
- **Return:** Short numeric/alphanumeric value.
- **Avoid:** Dongan quotation filename `REV 0`/`REV 2`; this is quote revision, not PO revision.

### 8.8 PO Revision Date

- **Patterns:** `PO Rev Date`, `PO Revision Date`, or clearly PO-linked revised date.
- **Avoid:** PO date, quotation revision date, order date, and print date.

### 8.9 Customer Name

- **Preferred evidence:** Explicit quotation customer, acknowledgment Bill To, then PO Bill To/Ship To orientation.
- **Newest fallback:** The first plausible company line of either Bill To or Ship To may populate Customer Name.
- **PO orientation:** Choose the buyer/customer, never `Dongan Electric` when Dongan is vendor/supplier.
- **Preserve:** Legal suffixes when supplied.
- **Avoid:** Street address, contact person, headings, vendor label, and Dongan.

## 9. Address, contact, and terms profiles

### 9.1 Bill To

- Return a cohesive block containing company, address, and contact lines when they belong together.
- Recognized layouts include `Bill-To Name & Address`, `BILL TO: value`, standalone `BILL TO` followed by lines, buyer masthead, and parallel address columns.
- Stop at Ship To, PO identity, supplier quotation/contact, item table, payment terms, or totals.
- Do not mix left/right PDF columns.

### 9.2 Ship To

- Return a cohesive destination block with company/site, address, attention/contact, and delivery-relevant details.
- Recognized layouts include `Ship To:`, standalone `SHIP TO`, parallel Company/Ship-To or Vendor/Ship-To columns, and legacy positional forms.
- Do not copy Bill To into Ship To merely because Ship To is missing.

### 9.3 Your Dongan Contact

- **Quotation:** `Your Dongan Contact`.
- **PO:** `Supplier Contact` or a Dongan-specific attention line.
- **Newest pattern:** `Supplier Contact: Justin Moody (jmoody@dongan.com)`.
- **Formatting:** Separate rows: `Name: Justin Moody`, `Email: jmoody@dongan.com`, and `Mobile: ...` when available.
- Parentheses around email are removed from the name.
- Avoid buyer, AP, receiving, and carrier contacts.

### 9.4 SLS Number

- **Patterns:** `Salesman #`, sales/salesperson number, quotation salesman column.
- Return the short code only.
- Avoid customer number, quote number, buyer ID, and phone extensions.

### 9.5 Incoterms

- Normalize recognized codes to short uppercase forms: `EXW`, `FCA`, `FOB`, `DDP`, `DAP`, `CPT`, `CIP`, `CFR`, `CIF`, `FAS`.
- Normalize OCR-like `EVW` to `EXW`.
- Sources include `INCOTERMS` and field-compatible `FOB Terms`.
- Avoid carrier/service, `Collect`, `PPD & CHG`, account number, and freight amount.

### 9.6 Payment Terms

- Return a short operational form.
- Normalize `NT30`/`NET 30` to `Net 30`.
- Normalize advance language such as `50% advance; balance before shipment`.
- `Cash in advance`/`Advance` returns `Advance`.
- Avoid entire legal paragraphs, freight-payment terms, and blank/`Other` placeholders.

## 10. Order-item profiles

### 10.1 Catalog Number

- Prefer explicit `Dongan Item/Catalog #`.
- Accept catalog-shaped values confirmed across quotation/OA/PO.
- In the newest supplier PO, inspect lines after `Manufacturer Name & Part Number:` and select the first `DONGAN ELECTRIC MFG CO:<identifier>` as the catalog candidate.
- Example: `DONGAN ELECTRIC MFG CO:76-10-7761NRG2` returns `76-10-7761NRG2`.
- Additional manufacturer numbers remain evidence but do not automatically create extra rows.
- Avoid customer part number, material number, SKU, model, line number, serial number, downstream part, and unlabeled long numeric material ID.

### 10.2 Part number versus catalog number

- **Catalog number:** Dongan’s sales/order identifier, usually explicitly labeled or repeated consistently across quote/OA.
- **Customer part number:** Belongs to the buyer/destination; labels such as `Customer Part #` do not supersede Dongan catalog.
- **Material ID:** ERP inventory identifier, often long numeric and not Dongan catalog.
- **Manufacturer part number:** May be useful evidence; it becomes the catalog only when Dongan labeling or cross-source agreement proves it.
- If two plausible Dongan identifiers remain, keep the higher-confidence one and flag catalog identity for review.

### 10.3 Description

- Prefer the quotation’s product description.
- PO line descriptions are accepted when directly tied to quantity/price.
- Newest row example: `TRANSFORMER 1000KW, 10KVA T3`.
- Avoid copying material-number lines, manufacturer headings, tax lines, notes, warranty, or delivery boilerplate into description.

### 10.4 Price

- Unit price only, canonical two-decimal format.
- Recognized layouts include explicit `Unit Price`, quotation item rows, OA compact rows, and PO columns labeled Cost/Rate/Price.
- Newest page-two pattern reads price `3,780.00` as `3780.00`.
- Avoid extended total, merchandise total, tax, shipping, and list price when a net unit price exists.

### 10.5 PO Qty

- Ordered quantity tied to the same item row.
- Newest page-two pattern reads `2 Each` as `2`.
- Avoid line number `00010`, unit code `Each`, material number, shipped quantity, and package count.

### 10.6 Ext. Total

- Row extension for the same catalog line.
- Newest page-two pattern reads `7,560.00` as `7560.00`.
- Required validation: `Price × PO Qty = Ext. Total` within one cent.

### 10.7 Current item-column order

The site and exported PDF use:

1. Catalog Number
2. Description
3. Price
4. PO Qty
5. Ext. Total

Price and quantity remain adjacent so the arithmetic relationship is visually obvious.

## 11. Financial profiles

### 11.1 Tax

- Numeric amount only.
- Patterns include `Total Tax`, `Tax Amount`, `Taxes`, `Tax Value`, and `Total Tax to Pay`.
- Newest PO returns `250.43` from either `Tax Value: $250.43` or `Total Tax to Pay: $250.43 USD`.
- Avoid tax-rate narrative, exemption language, boilerplate, and “included later.”

### 11.2 Shipping

- Numeric freight/shipping charge only.
- Patterns include explicit freight cost/charge and a numeric `Shipping` row.
- Avoid shipping mode, Incoterm, freight-payment term, account number, and “to be added.”

### 11.3 Other

- Explicit miscellaneous monetary charge/credit such as handling, surcharge, setup, or expedite fee.
- Avoid narrative notes, compliance requirements, project references, and unpriced rows.

### 11.4 Total

- Means merchandise/item subtotal before separately stated tax, shipping, and other charges.
- Acknowledgment subtotal is preferred when present.
- Newest PO pattern: `Total Line Cost Purchase Order Value: $7,560.00 USD` returns `7560.00`.
- If no selected total exists, sum valid item extensions.
- Validate `sum(Ext. Total) = Total`; conflict creates a review check.

### 11.5 Grand Total

- Explicit total including known charges.
- Newest PO pattern: `Total Net Purchase Order Value: $7,810.43 USD` returns `7810.43`.
- Otherwise calculate only when all applicable components are known or explicitly zero.
- Never manufacture a grand total when tax/shipping is pending.

## 12. Shipping and delivery profiles

### 12.1 Shipping Mode

- Short carrier/service phrase: `UPS Next Day Saver`, `FedEx Ground`, `LTL via Unishippers`, or `LTL`.
- Patterns: `Ship Via`, `Shipping Method`, `Carrier`, `Route Via`.
- Specific item/order instruction overrides generic header/boilerplate.
- Avoid EXW/FCA/FOB, `Collect`, `PPD`, `Prepaid`, and `See Comments` without resolved service.

### 12.2 Estimated Ship Date

- Exact date only.
- Acknowledgment: `Est. ship date`, `Promise Date`.
- PO: `Need By Date`, `Need is Date`, `Due Date`, `Required Delivery Date`, `Ship Date`.
- Newest table rule can read the date from the item row under a `Need By Date` column; `02/13/25` returns `2/13/25`.
- Quotation lead time such as “8 weeks ARO” is not an exact date.

### 12.3 Delivery Instructions

- Capture only actionable delivery sentences.
- Triggers include drop ship, ship directly, appointment required, call before delivery, consolidate shipments, do not insure, receiving dock, routing, palletize, packing slip/BOL, job-site delivery, liftgate, deliver to, and include PO/item number.
- Exclude warranty, invoice instructions, legal terms, product application, and address-only text.

### 12.4 Receiving Contact

- Sources: `Delivery Contact`, `Receiving Contact`, `ATTN`, `C/O`, or explicit contact-when-ready language attached to delivery.
- Avoid Dongan sales contact, buyer, AP, invoice mailbox, and carrier support.

### 12.5 Restricted Location

- `Y` triggers: restricted/limited access, security gate/check-in, badge, escort, base access.
- `N` triggers: explicit no restrictions/no limited access.
- Appointment or job-site language alone is not enough.

### 12.6 Phone / Email / Hours / Availability

- Return delivery-relevant contact details and receiving/dock schedule from Ship To or delivery-contact context.
- Exclude Dongan, AP, invoice, buyer, and generic carrier contacts unless explicitly responsible for delivery.

### 12.7 Appointment Delivery

- `Y`: appointment required, schedule appointment, or call to arrange/schedule delivery.
- `N`: explicit no appointment required.
- Receiving hours alone do not prove an appointment requirement.

### 12.8 Inside Delivery

- `Y`: inside delivery required or deliver inside.
- `N`: explicit no inside delivery.
- Dock delivery and office address do not imply inside delivery.

### 12.9 Forklift Delivery

- `Y`: forklift required/available or customer will unload with forklift.
- `N`: explicit no forklift/not required/not available.
- Liftgate is not the same as forklift; retain liftgate in Delivery Instructions.

## 13. Multiple quotations and multiple items

### 13.1 One acknowledgment references multiple quotations

1. Scan the full acknowledgment for every unique `RE. QUOTE #`.
2. Each unique reference creates one Order Entry sheet.
3. Repeat shared order-level fields on every sheet.
4. Keep project, items, price, quantity, extension, and quote total sheet-specific.
5. Match each imported quotation to its reference.
6. If a quotation is missing, still create the sheet from the acknowledgment reference and mark it for review.
7. Do not replace the acknowledgment Dongan order number with the individual quote reference.

### 13.2 Multiple quotation files without a linking OA/PO

- Distinct quote numbers are not merged merely because customer or project looks similar.
- Different customers are a strong mismatch.
- Tulip groups separately or asks for confirmation before any shared extraction.

### 13.3 Multiple catalog numbers under one order

- Multiple catalogs do not automatically create multiple sheets.
- One quote/order with several sellable items remains one sheet with several item rows.
- Split only when quote references or packet identity require separate sheets.

### 13.4 Note and zero-dollar rows

- A row number or quantity does not make a line a sellable product.
- Exclude quote-reference notes, certificate requirements, warranty/payment/invoicing narrative, and other informational rows.

## 14. Reconciliation and validation

### 14.1 Catalog grouping

- Catalog values are compared case-insensitively after removing decorative asterisks.
- Exact matches group together.
- Closely sized suffix matches may be treated as equivalent when one source includes a harmless prefix; the difference remains reviewable.
- When a quote/acknowledgment defines allowed catalogs, unrelated PO items are not copied into that sheet.

### 14.2 Field conflicts

Tulip flags conflicts for:

- Customer identity or number.
- Purchase-order number.
- Totals and financial amounts.
- Project/terms/delivery values.
- Item quantity, price, extension, or description at comparable priority.
- Differing catalog representations.

### 14.3 Arithmetic checks

1. `Price × PO Qty = Ext. Total` for every item.
2. `Sum of Ext. Total = Total`.
3. `Total + Tax + Shipping + Other = Grand Total` when every applicable component is known.
4. Differences over one cent require review.

### 14.4 Address and semantic checks

- Bill To and Ship To must not contain lines leaked from the other PDF column.
- PO, order, quote, revision, need-by, and ship dates remain separate.
- Incoterm, freight-payment term, shipping amount, and shipping mode remain separate.
- Dongan, buyer, AP, and receiving contacts remain separate.

## 15. Confidence and review states

### High confidence

- Explicit compatible label in the preferred source/layout.
- Matching values across connected documents.
- Line arithmetic and total arithmetic agree.

### Medium confidence

- One explicit compatible OA/PO value with no competitor.
- Catalog supported by manufacturer labeling and cross-source agreement.

### Review required

- Conflicting sources.
- Filename-derived PO date.
- Ambiguous part/material/catalog identity.
- Missing referenced quotation.
- User-forced merge.
- Failed line/order arithmetic.
- Unknown tax/shipping needed for a grand total.

### Missing

- No explicit field-compatible value. Leave blank and highlight it for the user.

## 16. Output and PDF rules

- All extracted fields remain editable in the site.
- Missing required fields stay visibly highlighted.
- Customer Name, Bill To, Ship To, Dongan Contact, SLS Number, Incoterms, Payment Terms, and Order Items headings are centered according to the current template treatment.
- Dongan Contact is displayed as separate Name/Email/Mobile rows.
- Item remove controls are visibly red and bold.
- PDF export uses the blue template style, clear cell borders, wrapped text, and no unnecessary dark-purple section banners.
- The Customer Name label/value block is attached to the address/commercial table.
- Major template tables should move as a whole to the next PDF page when the remaining space is insufficient.
- CSV export is intentionally removed.

## 17. Regression requirements

Any future extraction change should keep these cases passing:

1. All known document types classify correctly.
2. Known packet families group as one packet.
3. Unrelated quotations stay separate.
4. One acknowledgment linking two quotations creates two sheets.
5. PO-only uploads return explicitly present PO number/date.
6. Standalone `PO NUMBER` plus next-line value is read correctly.
7. `Supplier Quotation #`, date, and contact map to the correct Dongan fields.
8. Bill To/Ship To first-line customer fallback works without selecting Dongan.
9. Page-two PO item rows return catalog, description, need-by date, quantity, unit price, and extension.
10. `Tax Value`, line-cost PO total, tax-to-pay, and net PO total map correctly.
11. Price × quantity arithmetic is validated.
12. `DATE ORDERED`, `Created on`, joint Date/PO headers, and title-below-number layouts remain supported.
13. Filename-only PO dates remain review-level.
14. Customer/address data never crosses packet groups.
15. PDF generation preserves labels, table order, blue styling, and page behavior.

## 18. Known limitations and safe behavior

- No OCR for image-only/scanned PDFs.
- Highly unusual PDF coordinate extraction can still merge/split columns incorrectly; resulting conflicts should remain visible.
- A first `DONGAN ELECTRIC MFG CO:` number is selected in the newest manufacturer block; multiple plausible Dongan numbers still deserve review.
- The matching algorithm intentionally favors explicit Dongan reference or PO identity. Incorrect source references can still require user confirmation.
- User edits are session-local unless exported.
- Tulip never sends documents to a shared customer database; browser-side parsing and the current hosted workflow remain session-oriented.

## 19. Processing sequence

```text
Choose files
  → read all pages
  → classify each document
  → build identity signatures
  → compare four matching anchors
  → form packet groups
  → ask before uncertain cross-group merge
  → extract each document independently
  → apply semantic compatibility and source priority
  → group items by catalog identity
  → create one or more Order Entry sheets
  → normalize dates, money, quantities, terms, and contacts
  → run conflict and arithmetic checks
  → show editable review state
  → export the blue template PDF
```

## 20. Relationship to earlier notes

This v5 file supersedes the following as the current single review reference while leaving them intact for history:

- `Tulip-Field-Extraction-Profiles.md`
- `Tulip-Extended-TemplateDraft-Field-Profiles.md`
- `Tulip-Multi-Document-Matching-Framework.md`

