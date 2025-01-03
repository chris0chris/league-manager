FROM python:3.11-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ARG APP_USER="django"
ARG APP_DIR="/app"
# install curl for healthcheck
RUN apt-get -y update; apt-get -y install curl
# add user
RUN adduser --disabled-password --home ${APP_DIR} ${APP_USER}
RUN chown ${APP_USER}:${APP_USER} -R ${APP_DIR}

WORKDIR ${APP_DIR}
COPY --chown=${APP_USER} . ${APP_DIR}
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

USER ${APP_USER}

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
