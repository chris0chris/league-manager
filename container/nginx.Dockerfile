FROM python:3.14-slim AS python-builder
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_DIR="/app"

WORKDIR ${APP_DIR}

# Install build dependencies
RUN apt -y update && \
    apt -y install pkg-config python3-dev build-essential default-libmysqlclient-dev

# Copy uv from official image (faster and more reliable than curl install)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install dependencies first (without source code for better caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable

# Copy the project into the image
COPY . ${APP_DIR}

# Sync the project (installs the local package)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable

# remove existing js files (will be packed below)
RUN rm -rf liveticker/static/liveticker/js
RUN rm -rf scorecard/static/scorecard/js
RUN rm -rf passcheck/static/passcheck/js
RUN rm -rf gameday_designer/static/gameday_designer/js

# collect static files
RUN .venv/bin/python manage.py collectstatic --no-input --clear

FROM node:24-slim AS node-builder
ARG APP_DIR="/liveticker-app"
WORKDIR ${APP_DIR}

COPY liveticker ${APP_DIR}
RUN rm -rf static/liveticker/js

RUN npm ci
RUN npm run build

ARG APP_DIR="/scorecard-app"
WORKDIR ${APP_DIR}

COPY scorecard ${APP_DIR}
RUN rm -rf static/scorecard/js

RUN npm ci
RUN npm run build

ARG APP_DIR="/passcheck-app"
WORKDIR ${APP_DIR}

COPY passcheck ${APP_DIR}
RUN rm -rf static/passcheck/js

RUN npm ci
RUN npm run build

ARG APP_DIR="/gameday-designer-app"
WORKDIR ${APP_DIR}

COPY gameday_designer ${APP_DIR}
RUN rm -rf static/gameday_designer/js

RUN npm ci
RUN npm run build

FROM nginx:stable

COPY --from=python-builder /app/league_manager/league_manager/static /static
COPY --from=node-builder /liveticker-app/static /static
COPY --from=node-builder /scorecard-app/static /static
COPY --from=node-builder /passcheck-app/static /static
COPY --from=node-builder /gameday-designer-app/static /static
COPY ./container/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./container/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD /healthcheck.sh
