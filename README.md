# GF Native Crop & Rotate

**Status: bounded development prototype — isolated browser FileList handoff demonstrated; genuine Gravity Forms submission and Entry persistence NOT_PROVEN.** Do not install on a production site.

This independent, lightweight WordPress plugin is intended to enhance **selected native Gravity Forms Single File Upload** fields. The approved user flow is: select one image → crop and optionally rotate by 90° → explicitly confirm → hand the edited `File` back to the **native file input** → allow Gravity Forms to validate, upload, store and associate it with the correct Entry. Conditional image optimization must not degrade already adequate images unnecessarily.

## Authority and non-negotiable boundaries

The [Owner-approved product goals G-001–G-012](https://docs.google.com/document/d/11JLV8w9CjWFiL_jQ3Xn2qJr_2k73lUubYx9lLxFXyNI/edit) govern behavior. The [project snapshot](https://docs.google.com/document/d/1BCqOw9_h9YEIEJ7UQ-mOC4-GEyVfYFUQMV6hlwu67-Y/edit) records progress but is not product authority.

- Opt-in per field, default OFF; eligible only when the field is a **native Single File Upload** (`multipleFiles = false`). Multi-File limited to one file is *not* equivalent; never silently convert it.
- Crop confirmation is mandatory; manual 90° rotation and conditional optimization are required. A failed, cancelled or incomplete edit must **not** fall back to the unedited original.
- Gravity Forms owns upload requests, server validation, storage, Entry association and confirmation. No parallel uploader, database or Entry model.
- GP File Upload Pro may handle other fields, not the same field. Its actual conflict setting must be verified from the licensed version, not guessed.
- Existing field identities and historical Entry data must never be rewritten implicitly. Preserve Persian/RTL/mobile accessibility and privacy.
- Cropper.js 1.7.0, Canvas, `File` and `DataTransfer` are **unproven implementation candidates**, not an integration claim. No third-party JavaScript or licensed GF distributions are included here.

## What's actually in this repository

| Path | Purpose |
| --- | --- |
| `gf-native-crop-rotate.php` | Opt-in editor, frontend markup, conditional assets and validation callbacks. Genuine GF runtime not yet exercised. |
| `scripts/verify.sh` | Single local/CI source, stub-contract and deterministic ZIP verification entrypoint. |
| `tests/smoke.php` | Host-independent hook/eligibility/marker negative probes using WordPress/Gravity Forms stand-ins; **not** runtime proof. |
| `scripts/package.sh` | Explicit-allowlist ZIP builder; includes PHP, JS and README. |
| `.github/workflows/foundation.yml` | Runs the same source/ZIP verification on PRs and pushes to `main`, with read-only token permission. |
| `AGENTS.md` | Concise AI-assisted contributor entrypoint; not technical enforcement. |

The current bounded prototype keeps PHP hooks in the entrypoint and the browser controller in `assets/js/handoff.js`. No second uploader is introduced. Update the package allowlist and executable verification as implementation grows.

## Development prerequisites and setup

For the **foundation checks only**: a POSIX shell, PHP CLI **8.2 or newer**, Node.js for syntax checking, `zip`, `unzip`, and standard `find`, `diff`, `cmp`, `mktemp` tools. No Composer, Node or licensed plugins are needed to run these checks. The CI runner is Ubuntu 24.04; local PHP versions can differ, so record actual versions.

```sh
sh scripts/verify.sh
sh scripts/package.sh
unzip -l dist/gf-native-crop-rotate-dev.zip
```

`verify.sh` runs PHP/JavaScript syntax, host-stub behavior probes, repeatable ZIP bytes, ZIP integrity and exact package contents/bytes. It exits non-zero on errors. The package is a **development-only prototype**, not a WordPress/Gravity Forms-tested release. Generated packages are ignored by Git.

For a future **authentic integration environment**, separately obtain authorized WordPress and genuine Gravity Forms, install them in a disposable host with synthetic forms, images and Entries, and run a real browser. WordPress 6.8.3 / Gravity Forms 3.1.1.1 / PHP 8.2.x are historically discussed qualification targets, **not verified supported runtime versions**. The installed actual versions, relevant hooks, upload mode and server result must be recorded before a compatibility claim. Do not commit vendor ZIPs, keys, live photos or personal data.

## Next verification boundary (not done)

The remaining decisive native-upload test must show that the edited file survives a genuine Gravity Forms submission and is persisted as the correct Entry's image; prove that cancelled/unconfirmed edits and invalid field configuration cannot bypass the requirement in the installed GF lifecycle. Cover at least standard postback and applicable Ajax modes, with positive and negative synthetic controls. An isolated Canvas demo or fake GF mock **cannot** establish this. GP File Upload Pro same-field conflict detection and historical Entry compatibility remain separate required integration qualifications.

## Packaging, versioning and release controls

The entrypoint header holds the current **development version** (`0.1.0-dev`), with `Update URI` identifying this repository to avoid accidental WordPress.org slug-based updates; it does **not** implement GitHub auto-updates. The ZIP now explicitly packages the PHP bootstrap, JS controller and README with normalized timestamps and atomic output replacement. New assets still require a reviewed allowlist/verification update and authentic installation test. The build intentionally has no auto-tag, release or deploy workflow.

**License is not selected.** Public repository visibility does not grant permission to reuse proprietary dependencies or imply a chosen open-source license. The Owner must decide licensing and publication separately. Later release qualification needs reproducible version-to-commit identity, third-party notices for included assets, artifact verification, install/rollback evidence, and explicit authorization for publish/deploy. No production settings or repositories are changed by these scripts.

## P1 bounded prototype (2026-11-11; not genuine GF acceptance)

An opted-in native **Single File** field gets a minimal center-crop (50–95%), manual 90° rotation and explicit confirmation. On selection the original is immediately **cleared from the native file input**. Canvas exports a new PNG/JPEG File, which is assigned and verified via `DataTransfer`/`input.files`; then a native `change` event is emitted for host listeners. The plug-in does not upload or create Entries.

The server-side `gform_validation` hook rejects an observed uploaded file without the confirmation marker and rejects invalid enabled Multi-File configuration, leaving Gravity Forms' own file validator authoritative. The marker is client-supplied **and is not cryptographic proof of genuine crop**; forged requests, alternative GF Ajax file representations and hook ordering require genuine integration evidence. Same-field GP File Upload Pro conflict introspection is **not implemented** pending licensed vendor evidence. Do not enable both on one field.

**Scope limits:** PNG/JPEG only, 12 MB prototype input cap; 6000×6000 dimension check occurs *after* decoding. A deliberately simple center crop is used, not a production-quality editor. Conditional optimization, giant-image pre-decode memory controls, cross-browser/mobile/accessibility completion and all GF upload modes remain open.

Independent browser experiment (optional developer tools: Python 3, Pillow, Playwright and a Chromium executable):
```sh
python tests/browser_check.py
```
This script tests **real Chromium Canvas → File → native FileList → FormData** against `tests/browser-fixture.html`, a deliberately fabricated DOM. It is **not Gravity Forms**, WordPress, actual HTTP submission, or Entry-persistence proof. See `docs/P1_HANDOFF_EVIDENCE.md` for versions/results and the exact runtime prerequisite.
