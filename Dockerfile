FROM python:3.11-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_USER="django"
ARG APP_DIR="/app"
# install curl for healthcheck
RUN apt -y update
RUN apt -y install curl
RUN apt -y install pkg-config
RUN apt -y install python3-dev
RUN apt -y install build-essential
RUN apt -y install default-libmysqlclient-dev
# add user
RUN adduser --disabled-password --home ${APP_DIR} ${APP_USER}
RUN chown ${APP_USER}:${APP_USER} -R ${APP_DIR}

WORKDIR ${APP_DIR}
COPY --chown=${APP_USER} ./requirements.txt ${APP_DIR}
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

USER ${APP_USER}

COPY --chown=${APP_USER} . ${APP_DIR}

EXPOSE 8000
RUN chmod 740 /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
