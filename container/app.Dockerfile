FROM python:3.14-slim AS app-builder

RUN apt -y update
RUN apt -y install pkg-config
RUN apt -y install python3-dev
RUN apt -y install build-essential
RUN apt -y install default-libmysqlclient-dev   # to build the mysql client
RUN apt -y install git                          # for development dependency in requirements.txt

COPY ../requirements.txt .

RUN pip install --upgrade pip
RUN pip install --target=/py-install -r requirements.txt
RUN pip install --target=/py-install django-debug-toolbar

FROM python:3.14-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_USER="django"
ARG APP_DIR="/app"

RUN apt -y update
RUN apt -y install curl                          # install curl for healthcheck
RUN apt -y install jq                            # install jq for healthcheck
RUN apt -y install default-libmysqlclient-dev    # to run the mysql client
RUN pip install gunicorn

# add user
RUN adduser --disabled-password --home ${APP_DIR} ${APP_USER}
RUN chown ${APP_USER}:${APP_USER} -R ${APP_DIR}

USER ${APP_USER}
COPY --chown=${APP_USER} ../ ${APP_DIR}
RUN rm -rf .git/

COPY --chown=${APP_USER} --from=app-builder /py-install ${APP_DIR}/python-packages/

ENV PYTHONPATH="${APP_DIR}/python-packages:${PYTHONPATH}"

COPY --chown=${APP_USER} ../container/entrypoint.sh /app/entrypoint.sh

RUN chmod 740 /app/entrypoint.sh

WORKDIR ${APP_DIR}
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -A healthcheck -H "Accept: application/json" http://localhost:8000/health/?format=json

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
