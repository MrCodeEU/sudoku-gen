FROM node:20-alpine

RUN apk add --no-cache curl bash

RUN curl -fsSL https://bun.sh/install | bash && \
    corepack enable

ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json .
COPY bun.lockb* .

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

RUN mkdir -p /data

EXPOSE 3000
ENTRYPOINT ["bun", "./build"]
