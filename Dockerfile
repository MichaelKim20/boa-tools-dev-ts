# From Agora Runner
FROM node:14.15.4-alpine3.12
RUN apk add --no-cache git py-pip alpine-sdk \
    bash autoconf libtool automake

WORKDIR /toolsdev/wd/

ADD . /toolsdev/bin/
RUN npm ci --prefix /toolsdev/bin/
RUN npm run tsc --prefix /toolsdev/bin/
RUN npm run copy-assets --prefix /toolsdev/bin/

# Starts a node process, which compiles TS and watches `src` for changes
ENTRYPOINT [ "/toolsdev/bin/docker/entrypoint.sh" ]
