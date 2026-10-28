# Edge read-aloud protocol

`edge-gec-v2.js` is a JavaScript adaptation of the Sec-MS-GEC v2 implementation
in [rany2/edge-tts drm.py](https://github.com/rany2/edge-tts/blob/b2ffbdd9f43f28f03cc939b5de0f3964aa62d60e/src/edge_tts/drm.py).
Upstream: rany and edge-tts contributors. Pinned revision:
`b2ffbdd9f43f28f03cc939b5de0f3964aa62d60e`.

This adapted module is licensed under LGPL version 3. The original upstream
license notice is preserved in `licenses/edge-tts-LICENSE.txt`; the incorporated
GNU GPL version 3 terms are in `licenses/GPL-3.0.txt`.
The MIT section applies only to upstream srt_composer.py, which is not included.

Changes dated 2026-10-28: ported the token digest to Node.js Buffer and unsigned
32-bit arithmetic; replaced Python-specific loop optimizations with simple
rounds; exposed an explicit millisecond timestamp and client-token argument.
No Python or third-party runtime package is required.

The module remains a separate, replaceable CommonJS source file. To modify or
relink it, edit `edge-gec-v2.js`, run `node tests/edge-tts-protocol.mjs` from
the repository root, then package this cloud-function directory with the
modified module and accompanying licenses. No minification or code secret is
used. This notice does not change the license of unrelated website code.

The speech endpoint is an external service and may change independently.
Do not silently fall back to an unspecified or female voice on service failure.
