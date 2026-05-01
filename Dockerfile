FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV DATA_DIR=/data
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server/index.js"]
