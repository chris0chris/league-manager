FROM python:3.11-slim AS python-builder
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_DIR="/app"

WORKDIR ${APP_DIR}

# install build requirements
RUN apt -y update
RUN apt -y install pkg-config
RUN apt -y install python3-dev
RUN apt -y install build-essential
RUN apt -y install default-libmysqlclient-dev

# install environment
COPY ../requirements.txt ${APP_DIR}
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY ../ ${APP_DIR}

# remove existing js files (will be packed below)
RUN rm -rf liveticker/static/liveticker/js
RUN rm -rf scorecard/static/scorecard/js
RUN rm -rf passcheck/static/passcheck/js

# collect static files
RUN python manage.py collectstatic --no-input --clear

FROM node:20-slim AS node-builder
ARG APP_DIR="/liveticker-app"
WORKDIR ${APP_DIR}

COPY ../liveticker ${APP_DIR}

RUN npm ci
RUN npm run build

ARG APP_DIR="/scorecard-app"
WORKDIR ${APP_DIR}

COPY ../scorecard ${APP_DIR}

RUN npm ci
RUN npm run build

ARG APP_DIR="/passcheck-app"
WORKDIR ${APP_DIR}

COPY ../passcheck ${APP_DIR}

RUN npm ci
RUN npm run build

FROM nginx:stable

COPY --from=python-builder /app/league_manager/league_manager/static /static
COPY --from=node-builder /liveticker-app/static /static
COPY --from=node-builder /scorecard-app/static /static
COPY --from=node-builder /passcheck-app/static /static
COPY ./container/nginx.conf /etc/nginx/conf.d/default.conf
