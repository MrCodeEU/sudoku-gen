FROM node:20-alpine

RUN apk add --no-cache curl bash python3 make g++

RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json .

RUN bun install

COPY . .

RUN bun run build

RUN mkdir -p /data

EXPOSE 3000
ENTRYPOINT ["bun", "./build"]
