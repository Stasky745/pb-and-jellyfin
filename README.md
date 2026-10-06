# PB&Jellyfin

Two Jellyfin users each rank the movies they've watched together. You can see the other person's ranking of a movie only after you've ranked it too. A combined list orders your shared movies by your average rank.

## Run

```sh
cp docker-compose.example.yml docker-compose.yml   # set JELLYFIN_URL and ALLOWED_USERS
docker compose up -d --build
```

Log in with your Jellyfin username and password. Data lives in `./data`: SQLite at `rank.db` and saved posters in `posters/`.

Works over plain http (`http://host:3000`) or behind an HTTPS reverse proxy that sets `X-Forwarded-Proto`.

## Kubernetes

- **Ports:** `3000` serves the app (route your ingress here). `9091` serves Prometheus metrics at `/metrics`. Keep the metrics port off the ingress.
- **Probes:** `GET /healthz` on port `3000` works for both liveness and readiness. It checks that the database responds.
- **Storage:** SQLite and posters live in `/data`. Mount a `ReadWriteOnce` PVC there and run **1 replica** with `strategy: Recreate`, because SQLite can't be shared between pods.
- **Logs:** JSON lines on stdout/stderr, one per request plus logins, Jellyfin failures and errors. `LOG_LEVEL` can be `debug`, `info` (the default), `warn` or `error`.
- **Metrics:** `http_request_duration_seconds{method,route,status}`, `jellyfin_request_duration_seconds{endpoint,status}`, `logins_total{result}`, `ranked_movies{user}`, plus the default Node.js process metrics.
- **Image:** distroless, with no shell. It runs as UID/GID `65532` and only needs to write to `/data`. A matching `securityContext` for the pod:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  runAsGroup: 65532
  fsGroup: 65532
  seccompProfile: { type: RuntimeDefault }
containers:
  - name: pb-and-jellyfin
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: { drop: [ALL] }
```

## Release

Publishing a GitHub release tagged `vX.Y.Z` runs the type check and tests, then pushes a multi-arch (amd64/arm64) image to `ghcr.io/<owner>/<repo>` with tags `vX.Y.Z`, `vX.Y`, `vX` and `latest`.

## Develop

```sh
npm install
JELLYFIN_URL=http://your-jellyfin:8096 ALLOWED_USERS=alice,bob npm run dev
npm test        # ranking/hiding logic
npm run check   # type check
```
