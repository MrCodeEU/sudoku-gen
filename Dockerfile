FROM node:20-alpine

# Install required packages
RUN apk add --no-cache curl bash

# Install bun and enable corepack for yarn
RUN curl -fsSL https://bun.sh/install | bash && \
    corepack enable

# Add bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy package files first
COPY package.json .
COPY yarn.lock* .
COPY .yarnrc.yml* .

# Install dependencies
RUN yarn install --immutable

# Copy rest of the files
COPY . .

RUN yarn build

EXPOSE 3000
ENTRYPOINT ["bun", "./build"]
