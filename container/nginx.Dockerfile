FROM python:3.11-slim AS builder
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

# collect static files
RUN python manage.py collectstatic --no-input --clear

FROM nginx:stable

COPY --from=builder /app/league_manager/league_manager/static /static
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
