FROM python:3.11-slim AS app-builder
ARG APP_DIR="/app"

RUN apt -y update
RUN apt -y install curl                          # install curl for healthcheck
RUN apt -y install pkg-config
RUN apt -y install python3-dev
RUN apt -y install build-essential
RUN apt -y install default-libmysqlclient-dev   # to build the mysql client
RUN apt -y install git                          # for development dependency in requirements.txt

WORKDIR ${APP_DIR}
COPY ../requirements.txt ${APP_DIR}

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install django-debug-toolbar

FROM python:3.11-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_USER="django"
ARG APP_DIR="/app"

RUN apt -y update
RUN apt -y install default-libmysqlclient-dev   # to run the mysql client
RUN pip install gunicorn

# add user
RUN adduser --disabled-password --home ${APP_DIR} ${APP_USER}
RUN chown ${APP_USER}:${APP_USER} -R ${APP_DIR}

USER ${APP_USER}
COPY --chown=${APP_USER} ../ ${APP_DIR}
RUN rm -rf .git/

COPY --chown=${APP_USER} --from=app-builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

COPY --chown=${APP_USER} ../container/entrypoint.sh /app/entrypoint.sh

RUN chmod 740 /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
