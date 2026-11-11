# GFNCR P1 — Native File Handoff Qualification Dossier (2026-11-11)

## Outcome boundary

- **DEMONSTRATED (isolated browser):** a synthetic PNG is cropped and rotated, exported as a new `File`, assigned to a real Chromium HTML `input[type=file]` through `DataTransfer`, then observed in the form's `FormData`. The original is immediately removed from the native input on selection.
- **DEMONSTRATED (host-independent PHP stubs):** selected callback registration, opt-out filtering, reject-unconfirmed marker logic, and invalid-Multi-File rejection are exercised as pure PHP behavior. These stubs do not prove host hooks execute at the expected points.
- **BLOCKED:** genuine Gravity Forms submission and correct persisted Entry have not been observed. WordPress/GF licensed runtime and test credentials are absent from this executor environment. Do not close P1 or infer product usability.
- **NOT_PROVEN:** actual GF Form Editor save/reopen/export/import, the full native request lifecycle and Ajax/iframe modes, uploaded-file rejection at GF server, same-field GP File Upload Pro detection, cross-browser browser lifecycle, persistence/Entry identity and compatibility with legacy data.

## Identity and environment

- Target: `rezahh107/Gf-Native-Crop-Rotate`; parent `main` was `1f3d46798fb94df834f7f6a79a3498ad2e883470` (matched at preflight).
- Found: public repo, push permission; no open PR before the prototype branch, foundation PR #1 merged, no deploy/release workflow in the inspected repository.
- Local tooling: Linux x86_64, PHP CLI 8.4.24, Node 22.16.0, Python 3.13.5, Chromium 144.0.7559.96 (Debian 13). No local WordPress/GF runtime or GP File Upload Pro license/source discovered. Requested historically-discussed WP 6.8.3 / GF 3.1.1.1 / PHP 8.2 are **not** the executed runtime.
- The local browser was executed with Playwright directly against HTML supplied via `page.set_content` and the exact JS source; there was no Gravity Forms, WordPress, HTTP upload, backend file validation or Entry database.

## Positive isolated browser evidence

Fixture source is `tests/browser_check.py`, `tests/browser-fixture.html`; the output JS is `assets/js/handoff.js`.
- Original generated PNG: **400×200**, **753 bytes**, SHA-256 `2c59c99f8a1b1c1bb2f7a9345742be3b1d732ede30d385a8575ce44d900a89e3`; half image blue, half red.
- Immediately after native selection, original `input.files.length === 0`. A `submit` event before edit confirmation is cancelled.
- Set center-crop fraction 50%, rotate 90°, explicitly confirm. Browser `FormData(form).get('input_1')` is `original-edited.png`, `image/png`, **100×200**, **1091 bytes**. PNG signature observed `89 50 4E 47 0D 0A 1A 0A`. Actual edited file has different size and dimensions from original, with the target `input.files[0]` set to the generated edited `File`.
- Unselected second field was unchanged. Reselection cleared previous marker/File, cancellation left zero files, unsupported text input cleared the native input and blocked a synthetic submit.
- A browser-side confirmation marker is **not tamper-proof evidence** of a real crop; the PHP callback explicitly relies on GF for normal server-side file validation. The demonstration covers the browser handoff primitive, not GF ownership and persistence.

## Source/CI checks

`sh scripts/verify.sh` runs: PHP syntax, JavaScript syntax, PHP host-independent callback/negative probes, exact runtime asset allowlist, repeatable ZIP build, ZIP integrity and comparison of installed-source bytes in the development ZIP.

Local executed: `sh scripts/verify.sh` PASS (with a local stand-in README; CI uses the repository's real README); `python tests/browser_check.py` PASS. The CI status is to be read separately against the final PR Head; a green CI check must never be described as authentic GF integration.

## Known implementation risks / smallest decisive next evidence

1. Install this development ZIP on **an authorized disposable real WordPress** instance with **genuine licensed Gravity Forms**. Record actual WP/PHP/GF versions. In GF Form Editor create a native Single File Upload, enable opt-in and save/reopen; verify callback and frontend input identity. Use no personal images.
2. Submit the synthetic fixture (with and without editing) via native standard postback, then applicable old iframe Ajax and modern Ajax. Inspect the browser request, GF server rejection, `GFAPI::get_entry` value and stored uploaded-file bytes/pixels; assert **same Entry ID and edited dimensions/content**. A passing preview alone cannot establish this.
3. Check `change` listener order / whether GF pre-processes a freshly selected original, and whether GF's Ajax representation uses `$_FILES['input_N']` at the `gform_validation` boundary. Both are unverified, material method assumptions; if either fails, re-evaluate the handoff/guard mechanism rather than claiming a valid mode.
4. Probe disabled and invalid Multi-File configurations, native required/file-type rejection, validation retry, stale processing, quick double-submit, form re-render, and host reinitialization. GP File Upload Pro coexistence and conflict detection require actual licensed vendor evidence. Do not guess property names.
5. Browser asset does not include Cropper.js; the P1 center-crop/rotate is intentionally limited. Pre-decode memory controls and exact optimization policy are deferred. Do not deploy to production or release this branch.

## Official extension-point evidence consulted

- [gform_field_standard_settings](https://docs.gravityforms.com/gform_field_standard_settings/) and [gform_editor_js](https://docs.gravityforms.com/gform_editor_js/) for the field setting.
- [gform_field_content](https://docs.gravityforms.com/gform_field_content/) for frontend markup.
- [gform_enqueue_scripts](https://docs.gravityforms.com/gform_enqueue_scripts/) for per-form asset loading.
- [gform/post_render](https://docs.gravityforms.com/gform-post_render/) and [gform/ajax/post_page_change](https://docs.gravityforms.com/gform-ajax-post_page_change/) for rerender hooks.
- [Gravity Forms validation examples](https://docs.gravityforms.com/custom-logging-statements/) document `gform_validation` and field-level failures. **Exact installed source timing has not been inspected.**
