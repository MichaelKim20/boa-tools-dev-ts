# From Agora Runner
FROM node:14.15.4-alpine3.12
RUN apk add --no-cache git py-pip alpine-sdk \
    bash autoconf libtool automake

WORKDIR /dev/wd/

ADD . /dev/bin/
RUN npm ci --prefix /dev/bin/

# Starts a node process, which compiles TS and watches `src` for changes
ENTRYPOINT [ "/dev/bin/docker/entrypoint.sh" ]
