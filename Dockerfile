FROM node:20-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
COPY client/package.json client/
COPY server/package.json server/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN cd client && pnpm install && pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
