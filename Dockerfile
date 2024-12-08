# syntax=docker/dockerfile:1

ARG BUILD_HASH=dev-build
FROM node:22-alpine3.20 AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV APP_BUILD_HASH=${BUILD_HASH}
RUN npm run build

FROM base AS production

ENV ENV=prod \
    PORT=8080 \
    WEBUI_BUILD_VERSION=${BUILD_HASH} \
    DOCKER=true

# Copy built frontend
COPY --chown=$UID:$GID --from=frontend-build /app/build /app/build
COPY --chown=$UID:$GID --from=frontend-build /app/CHANGELOG.md /app/CHANGELOG.md
COPY --chown=$UID:$GID --from=frontend-build /app/package.json /app/package.json

# Copy backend code
COPY --chown=$UID:$GID backend /app/backend

EXPOSE 8080
HEALTHCHECK CMD curl --silent --fail http://localhost:${PORT:-8080}/health | jq -ne 'input.status == true' || exit 1

CMD ["bash", "start.sh"]
