# GF Native Crop & Rotate

**Status: repository foundation only — no working crop, rotate, upload integration or saved-Entry behavior yet.** Do not install this development package on a production site expecting image editing.

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
| `gf-native-crop-rotate.php` | WordPress-discoverable plugin header and safe inert bootstrap. Registers **no** hooks. |
| `scripts/verify.sh` | Single local/CI foundation verification entrypoint. |
| `tests/smoke.php` | Host-independent header and inert-bootstrap checks; **not** WordPress runtime proof. |
| `scripts/package.sh` | Explicit-allowlist ZIP builder; currently includes only the plugin entrypoint and README. |
| `.github/workflows/foundation.yml` | Runs the same verification on PRs and pushes to `main`, with read-only token permission. |
| `AGENTS.md` | Concise AI-assisted contributor entrypoint; not technical enforcement. |

When genuine runtime integration is implemented, keep PHP host/field logic in a small `includes/` boundary and browser controller/processing under `assets/js/` only as needed. **These directories and scripts do not yet exist**; do not assume missing components are working or add placeholder files. Update the package allowlist and executable verification as implementation grows.

## Development prerequisites and setup

For the **foundation checks only**: a POSIX shell, PHP CLI **8.2 or newer**, `zip`, `unzip`, and standard `find`, `diff`, `cmp`, `mktemp` tools. No Composer, Node or licensed plugins are needed to run these checks. The CI runner is Ubuntu 24.04; local PHP versions can differ, so record actual versions.

```sh
sh scripts/verify.sh
sh scripts/package.sh
unzip -l dist/gf-native-crop-rotate-dev.zip
```

`verify.sh` runs syntax checks for tracked/source PHP files, a real CLI smoke check of the inert entrypoint, repeatable ZIP bytes, ZIP integrity and exact package contents/bytes. It exits non-zero on errors. The package is **a development-only WordPress plugin folder structure**, not a functional or WordPress-tested release. Generated packages are ignored by Git.

For a future **authentic integration environment**, separately obtain authorized WordPress and genuine Gravity Forms, install them in a disposable host with synthetic forms, images and Entries, and run a real browser. WordPress 6.8.3 / Gravity Forms 3.1.1.1 / PHP 8.2.x are historically discussed qualification targets, **not verified supported runtime versions**. The installed actual versions, relevant hooks, upload mode and server result must be recorded before a compatibility claim. Do not commit vendor ZIPs, keys, live photos or personal data.

## Next verification boundary (not done)

The first decisive native-upload test must show that the edited file replaces the real native input, survives the appropriate Gravity Forms submission path, and is persisted as the correct Entry's image; prove that cancelled/unconfirmed edits and invalid field configuration cannot bypass the requirement. Cover at least standard postback and applicable Ajax modes, with positive and negative synthetic controls. An isolated Canvas demo or fake GF mock **cannot** establish this. GP File Upload Pro same-field conflict detection and historical Entry compatibility remain separate required integration qualifications.

## Packaging, versioning and release controls

The entrypoint header holds the current **development version** (`0.0.1-dev`), with `Update URI` identifying this repository to avoid accidental WordPress.org slug-based updates; it does **not** implement GitHub auto-updates. The ZIP uses a fixed allowlist, normalized timestamps and atomic output replacement; adding runtime PHP/JS/CSS requires explicitly updating both `scripts/package.sh` and verification expectations, checking the ZIP's actual contents, and testing installation against real WordPress. The build intentionally has no auto-tag, release or deploy workflow.

**License is not selected.** Public repository visibility does not grant permission to reuse proprietary dependencies or imply a chosen open-source license. The Owner must decide licensing and publication separately. Later release qualification needs reproducible version-to-commit identity, third-party notices for included assets, artifact verification, install/rollback evidence, and explicit authorization for publish/deploy. No production settings or repositories are changed by these scripts.
