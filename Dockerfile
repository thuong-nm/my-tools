FROM node:24-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

COPY prisma ./prisma/

RUN npm ci --verbose

COPY . .

# NODE_ENV is deliberately NOT pinned here. Next sets it per command (development for `next
# dev`, production for `next build`); pinning it to development made `next build` mix dev and
# production React and die prerendering /_global-error.
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
