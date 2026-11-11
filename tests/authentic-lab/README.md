# Authentic Gravity Forms P1 laboratory (separate from PR #2)

**Scope:** This is a bounded experimental CI integration harness. It does not change the product source in Draft PR #2, and it does not claim successful Entry persistence before a real runner reports it.

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
6. Require GF confirmation, captured outgoing edited filename and marker, real `$_FILES['input_1']` at validation, and `GFAPI::get_entry`-verified one Entry. Compare incoming temporary upload digest, browser edited File digest and on-disk persisted file digest; all must be exact byte matches. Assert 100×200 PNG and same form identity.
7. FAIL if the raw/original submission creates an Entry, confirmation is missing, `$_FILES` is absent, stored bytes/entry are wrong, or runtime cannot be established. No fixture-only green.
8. Only after first successful P1 postback should Ajax, re-render, races, repeated submission and vendor coexistence be added. They remain `NOT_PROVEN` until actually executed.

**Limit:** Browser marker can be forged; client opt-in is not tamper-proof proof of physical user cropping. The unconfirmed negative control is narrower: does the real server reject a request with a file but no marker? Mark result accordingly.

## Local developer commands (requires actual installed host)

`sh scripts/verify.sh` remains independent of licensed assets. The authentic integration workflow does not run in the present assistant container (no MySQL or required PHP extension). Reproduce by running the trusted workflow in an authorized GitHub runner. Do not invoke the browser harness against a mock HTML substitute and call it authentic. The runner's step conclusions, logs and sanitized JSON determine its actual result.
