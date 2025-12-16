FROM node:18-alpine

# Install FFmpeg
RUN apk update && apk add ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Use non-root user for security
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "api/server.js"]
