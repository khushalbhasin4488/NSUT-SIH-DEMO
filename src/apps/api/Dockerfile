FROM node:22-alpine AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://metrology:metrology@localhost:5432/metrology?schema=public
COPY package*.json ./
COPY apps/api/package.json apps/api/
RUN npm install
COPY apps/api apps/api
RUN npm run prisma:generate -w apps/api && npm run build -w apps/api

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY package.json ./
COPY apps/api/package.json apps/api/
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
