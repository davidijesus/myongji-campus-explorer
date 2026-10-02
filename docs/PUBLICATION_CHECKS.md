# GitHub publication checks

Prepared on October 3, 2026 (Asia/Seoul) for the public repository.

- English README and documentation reviewed, including installation, distribution, evidence and historical validation records.
- `npm ci` completed; root dependencies reported zero known vulnerabilities in that installation run.
- `npm run build:pwa` passed. The regenerated page retained SHA-256 `ac300af2c7920983a47809277125d301ae105d4e91d162b34a48b761ec711529`, matching the v0.5 APK's embedded content.
- `npm test`: 100 tests passed. Native TypeScript syntax checks passed; these syntax checks are not native compilation.
- Markdown links to local files checked. Application behavior was unchanged by documentation preparation; the previous browser/device-validation scope remains in [TEST_REPORT.md](TEST_REPORT.md).
- Dependencies, build caches, translation scratch files, credentials and signing keys are excluded from version control. Machine-specific user paths in the historical autolinking report were anonymized.
- Git commits use the publisher's GitHub no-reply address.

The Android APK remains a development-signed demonstration. This publication does not add a physical-device test, store approval, IPA or hosted PWA.
