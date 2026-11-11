# Authentic Gravity Forms P1 laboratory (separate from PR #2)

**Scope:** This is a bounded CI integration harness, independent of the product in Draft PR #2. The **standard postback** proof succeeded on lab commit `2e2c2a034b65a09d118487e3384f08846b09e014` in [Actions run 43020195608](https://github.com/rezahh107/Gf-Native-Crop-Rotate/actions/runs/43020195608). Later tests are qualified only if their own run/Head succeeds.

## Source and trust boundary

- Target repository: `rezahh107/Gf-Native-Crop-Rotate`.
- Immutable product under test: PR #2 Head `93739dbfa1efc7999bbbd7d063147d3ced3775fe`; checked out in `subject/` and packaged through its existing `scripts/package.sh`.
- Licensed Gravity Forms input: the **already present** Owner-approved exact package in the GPP WU21 repository source, pinned to GPP commit `34fe6da2bde580869d357ddab82b13fbec6bb846`. It is not checked into, uploaded from, re-hosted, or linked directly from this repository. SHA-256 `542f56ae0747f3661d1474996527298027db3fb8ed3e6469a6391aaabf61069b`; size `5300290`. The same Owner-supplied Google Drive original was independently retrieved through the connected Drive service and its bytes were verified locally. Runtime CI must independently verify the GPP-carried bytes again before using them.
- No access tokens, licensed packages, original media, WordPress database or server logs in uploaded artifacts. Evidence upload is a short allowlist of sanitized JSON only. Runner is disposable.
- Workflow runs only for PRs from the named **same-repository lab branch** into main, with read-only GitHub token. No `pull_request_target`, no forked-user execution, no secrets, no production deploy, no merge or release.
- The pre-existing source repository stores a licensed fixture. This work does **not** treat that repo's visibility as a private security boundary or endorse additional licensed material publication. No new public download URL is introduced.

## Reused verified patterns

SRWF: pinned WordPress 6.8.3, MariaDB 11.4.8 and WP-CLI 2.12.0 CI lab; exact package/hash checks. GPP WU21: manifest/package identity, exact-Head audit and no network fallback for proprietary packages. Gravity Notification Manager: actual GF/Flow integration against genuine plugin source. Vazir: real browser test against WordPress + saved state, with strictly scoped evidence.

## Actual test sequence and falsification

1. Verify lab identity, exact PR #2 SHA, pinned GPP source and authentic Gravity Forms archive size/hash/ZIP integrity before install. Build and verify PR2's exact development ZIP; preserve `sh scripts/verify.sh` as a separate check.
2. Install actual WordPress, MariaDB, GF 3.1.1.1 and PR2 `0.1.0-dev` from that ZIP. Record versions/identity.
3. Via real `GFAPI::add_form`, create synthetic native Single File Upload, `gfncrEnabled=true`. Reopen with `GFAPI::get_form` to prove stored field setting; this **does not prove the Form Editor checkbox's save UI**.
4. Real Chromium on an actual WordPress-served page performs an unconfirmed original-file POST bypassing JS interception; require HTTP/visible GF validation rejection and zero Entry.
5. Fresh page performs synthetic PNG selection → clear original input → center crop 50% → rotate 90° → explicit confirmation → actual native file input → real HTTP standard postback.
6. Require GF confirmation, real HTTP multipart POST, server-observed edited filename and marker from `$_FILES['input_1']` and `$_POST` at validation, and `GFAPI::get_entry`-verified one Entry. Compare incoming temporary upload digest, browser edited File digest and on-disk persisted file digest; all must be exact byte matches. Assert 100×200 PNG and same form identity.
7. FAIL if the raw/original submission creates an Entry, confirmation is missing, `$_FILES` is absent, stored bytes/entry are wrong, or runtime cannot be established. No fixture-only green.
8. After that decisive postback proof, create dedicated synthetic pages for legacy `iframe` and modern `ajax` submission methods (the latter via the documented `gform_form_args` filter). Use genuine browser interactions, assert the installed GF rendered method, successful AJAX confirmation and observable HTTP POST, then independently read all three persisted Entries and compare each file's bytes/dimensions against the edited browser File.
9. The Ajax extension must fail if either method is unsupported by actual GF or the edited File fails to persist. In this case report method-specific evidence; do not label a failure `NOT_APPLICABLE` without inspecting real host behavior. Native Form Editor checkbox save via UI, extra client races/retries, GP FUP coexistence and tamper-proof crop provenance remain independent `NOT_PROVEN` until exercised.

**Limit:** Browser marker can be forged; client opt-in is not tamper-proof proof of physical user cropping. The unconfirmed negative control is narrower: does the real server reject a request with a file but no marker? Mark result accordingly.

## Retained exact standard postback proof (2026-11-11)

Actions run [43020195608](https://github.com/rezahh107/Gf-Native-Crop-Rotate/actions/runs/43020195608), lab Head `2e2c2a034b65a09d118487e3384f08846b09e014`, subject Head `93739dbfa1efc7999bbbd7d063147d3ced3775fe`:

- Actual WordPress `6.8.3`, PHP `8.2.35`, Gravity Forms `3.1.1.1`, MariaDB `11.4.8`, Chromium `140.0.7339.16`.
- Real browser native POST with synthetic original `400×200` PNG, `827` bytes, SHA-256 `9a5dfe80174455e84132501a2b889440e0f67cb28434043b8fbd1945d7693e87`: server observer saw the file but no marker; `gform_validation` rejected it; no Entry was created.
- Same field, explicit center crop `50%` and manual `90°` rotation: edited native PNG `100×200`, `1091` bytes, SHA-256 `082adfd741ef1e369b91cc756c5702d4a109b2981d8f3c1387a969bc54aa7a58`.
- Actual PHP `$_FILES['input_1']` and server-side confirmation marker were observed. Uploaded temporary file, browser File and stored Entry file matched **exact SHA-256**. Genuine `GFAPI::get_entry(1)`, form ID `1`, field `1`, stored Entry/file dimensions matched. `REAL_GF_EDITED_ENTRY_PASS`.
- Real request evidence: browser observed HTTP multipart POSTs, but Playwright did **not** expose the multipart request body; filename/bytes proof comes from the PHP observer plus persisted file. Do not claim the browser captured the opaque POST bytes.
- The setup exercised `GFAPI::add_form` → `GFAPI::get_form` readback of opt-in; it did **not** exercise the interactive Form Editor Save button.
- Sanitized exact-run evidence: Actions artifact `gfncr-authentic-p1-43020195608-1`. Contains JSON only, no licensed package, real user data or image bytes.

## Local developer commands (requires actual installed host)

`sh scripts/verify.sh` remains independent of licensed assets. The authentic integration workflow does not run in the present assistant container (no MySQL or required PHP extension). Reproduce by running the trusted workflow in an authorized GitHub runner. Do not invoke the browser harness against a mock HTML substitute and call it authentic. The runner's step conclusions, logs and sanitized JSON determine its actual result.
