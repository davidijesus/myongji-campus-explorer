# Protected content-update workflow

This optional server workflow is used by the Expo integration when configured. The primary Java/System WebView Android app has no remote content-refresh feature; its bundled data is updated through a new build. See [V05_NATIVE_CHANGES.md](V05_NATIVE_CHANGES.md) for variant details.

## Run the service

Build the shared code first. Configure environment variables from `server/.env.example`; this file is an example, not automatically loaded. Node can load an actual server-only file with `--env-file`, or a deployment platform can inject secrets.

```sh
npm run build
# Generate your own secret; never commit its output.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Save it securely as ADMIN_TOKEN in server/.env, then:
node --env-file=server/.env server/server.cjs
```

The default listener is loopback port 8080. Put it behind an HTTPS reverse proxy or an authorized hosting service before using it from a mobile device. Use one process and persistent storage for this file-backed version; multiple replicas need a transactional database/locking redesign. Configure health checks, backups and server monitoring before production.

Set `EXPO_PUBLIC_CONTENT_URL` in the mobile build to your authorized HTTPS `/v1/content` endpoint. It is a public read URL, not an administrative credential. Client refresh validates incoming data, rejects rollback versions and retains the previous cache on failure.

## Read, edit, verify and publish

The administrative CLI uses `CONTENT_SERVER_URL` and `ADMIN_TOKEN` from its environment. It refuses insecure remote HTTP endpoints; loopback HTTP is allowed for development.

```sh
node --env-file=server/.env server/admin.cjs get review-copy.json
# Preserve that original as an internal backup before editing.
# Edit records, verify sources, increase version by exactly 1,
# and set an accurate updatedAt timestamp.
node scripts/validate.cjs review-copy.json
node --env-file=server/.env server/admin.cjs publish review-copy.json
```

The server requires bearer authentication for administrative reads and writes. It does not accept browser-origin administrative requests or expose public editing privileges. `If-Match` revision checks prevent a stale edit from silently replacing a newer dataset; the final write uses atomic rename. Re-read and reconcile a conflict rather than retrying with a forced overwrite.

The CLI's model validation is not source verification. A human reviewer must ensure a source actually supports the place, entrance, hours, event or access claim. An unverified record should stay unverified. Do not put private student information, contact details or unnecessary personal data in the public dataset.

## Event lifecycle

Keep an unreviewed event in draft state. When its source, venue, dates and language are verified, publish it. Mark a cancellation explicitly; mark a completed event completed. The public endpoint removes drafts and the upcoming feed filters canceled/completed/finished records. A modified event still needs an updated evidence timestamp and correct organizer information.

## Rollback and recovery

Keep administrator-reviewed dataset copies in a protected location. To restore content, take a known-good copy, assign a **new higher version** and a current publication timestamp, revalidate it and publish it normally. Do not decrement versions: clients deliberately reject rollback revisions.

The server emits only publication action/version/time/hash when an audit callback is enabled; it does not log bearer tokens or user location. In-memory request limits are basic abuse protection, not a replacement for perimeter controls. Rotate a compromised token, restrict administrative access, and investigate any data publication made with it. For institutional production use, replace the shared admin token with a suitable identity provider and per-editor audit trail.
