# The build output is plain JS, so build once on the native platform and only copy per target arch.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev && mkdir /data

# Distroless: no shell or package manager, runs as the numeric non-root user 65532.
FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production DATABASE_PATH=/data/rank.db
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/build build
COPY --from=build /app/server.js ./
COPY --from=build --chown=65532:65532 /data /data
VOLUME /data
EXPOSE 3000 9091
USER 65532:65532
CMD ["server.js"]
