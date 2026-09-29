FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server.js index.html manus-routes.json ./
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
