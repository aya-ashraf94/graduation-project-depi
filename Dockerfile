FROM node:20-alpine AS frontend-build
WORKDIR /app/Frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
RUN npx ng build --configuration production

FROM node:20-alpine
WORKDIR /app
COPY Backend/package.json Backend/package-lock.json ./Backend/
WORKDIR /app/Backend
RUN npm ci --omit=dev
COPY Backend/ ./
COPY --from=frontend-build /app/Frontend/dist/nefisant-app/browser ../Frontend/dist/nefisant-app/browser
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
