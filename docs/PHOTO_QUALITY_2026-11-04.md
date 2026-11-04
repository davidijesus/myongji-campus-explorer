# Photo quality review - 4 November 2026

All 20 approved photographs were compared with their highest-resolution verified source files. Seven gallery images previously reduced to a 1600-pixel longest edge now retain the available original resolution. The other 13 already use their available original image pixels and remain unchanged. There are no new building associations or invented photographs; Y32 and Y12 remain without approved images.

| Photograph | Previous display | Current display |
| --- | --- | --- |
| Y24 HYSTEC, wide | 1600 x 808 | 1920 x 970 |
| Y24 HYSTEC, entrance | 1600 x 808 | 1920 x 970 |
| Y30 Myeonghyeon Residence | 1600 x 1200 | 4032 x 3024 |
| Y31 Myeongdeok Residence, front | 1600 x 1200 | 4032 x 3024 |
| Y31 Myeongdeok Residence, oblique | 1600 x 1200 | 4032 x 3024 |
| Y33 Residence 4 | 1600 x 1238 | 3521 x 2725 |
| Y34 Residence 5 | 1600 x 1167 | 3886 x 2834 |

The larger originals preserve actual source detail, especially in the wide mobile layout. At a 760 CSS-pixel viewport, the measured photo frame is 726 x 258 CSS pixels; a density of 3 requires 2178 x 774 image pixels. The former 1600-pixel copies needed 1.361x enlargement. The five large residence originals avoid that enlargement; the two 1920-pixel HYSTEC originals reduce it to 1.134x. This does not recover details absent from the original camera photograph.

## Fidelity, metadata and attribution

The original research files remain private and unchanged. Five residence originals carried camera/location metadata. New public copies remove EXIF, XMP, auxiliary metadata and trailing auxiliary image data without JPEG recompression. Decoded RGB pixels, image dimensions, JPEG scan data and embedded ICC color profiles match the originals exactly. The two HYSTEC originals have no such metadata and retain their exact source hashes. The manifest keeps original-source and public-display hashes separately.

No photo has been cropped, retouched or reconstructed in its stored file. The existing gallery viewport still fills its frame with a proportional centered crop. Captions, known date/quality limitations, credits, source links, original signs, architectural features, watermarks and publisher graphics remain. Copyright remains with the university or credited publisher; these photographs are not part of the application's MIT license.

## AI evaluation and limits

Two conservative AI restoration trials were tested against Y2's 330 x 230 source. Both were rejected: they synthesized details rather than only clarifying existing pixels, including unsupported letter-like marks in one result. Neither candidate is present in the application or public repository. No image is described as AI-enhanced in this release; all manifest `AIUsed` values remain false.

The remaining 13 low or medium-resolution originals cannot be guaranteed to become sharp at every screen density without a better factual source. Y35 remains only 186 x 114; Y2 and S9's night view are 330 x 230. Signage, historical captions and composite images must not be reconstructed to hide that limitation. A separate specialized upscaler was unavailable on the connected free plan; no paid plan, new credentials or extra permissions were acquired.

## Payload and validation scope

The 20 bundled display images now total 20,594,636 bytes, compared with 6,977,054 bytes previously. The single-file offline web bundle is correspondingly larger. First download and memory cost must be assessed alongside the quality improvement; a browser cache does not remove the initial transfer cost.

Sequential desktop measurements found a cold loopback median of approximately 0.87 seconds before and 1.18 seconds after. Under simulated 10 Mbps/80 ms latency with gzip, the measured cold opening was approximately 7.5 seconds before and 18.3 seconds after. This is a substantial first-download tradeoff for retaining the larger images in the offline bundle. Chrome-family private memory sampled after visiting all images was approximately 676 MB before and 953 MB after; this is an instrumented desktop process-family observation, not a physical-phone memory benchmark. The five residence photographs showed clear detail improvements in the wide/high-density comparison; HYSTEC's improvement was subtler.

Validation uses installed desktop Chrome with isolated test profiles and mobile/high-density viewports. It covers every before/after photograph, gallery layout and navigation, cold loading, menu-source failure and reopening the cached PWA offline. These browser checks do not establish physical Android performance or a new APK release. The release record contains final build identifiers and verified test results.

The larger candidate exposed two test-harness limitations that were corrected before acceptance: the default inspector response-body cache could not retain the larger HTML, and an asynchronous predicate passed to the installed Playwright `waitForFunction` was treated as immediately truthy before service-worker installation completed. Exact response hashing now uses its configured inspector session; offline readiness explicitly polls awaited browser evaluations, requires the active controller and verifies the complete cached release before disconnecting. The initial failures are retained in the private verification record and are not counted as passing runs.

The corrected readiness check then exposed a real service-worker defect: after hash verification through a cloned network response, Chromium rejected `Cache.put(index.html)` for the 28 MB HTML. An isolated comparison confirmed that reading the network bytes once, verifying their digest and constructing a new response from those bytes fixes the write. The generated worker uses that path and removes the transport Content-Encoding/Content-Length headers that no longer describe the decoded body. It still rejects mismatched releases before opening the cache. Regression tests cover the large decoded body and failed-integrity rejection.
