FROM node:22-bookworm-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
        fonts-liberation \
            libappindicator3-1 \
                libasound2 \
                    libatk-bridge2.0-0 \
                        libatk1.0-0 \
                            libcups2 \
                                libdbus-1-3 \
                                    libgdk-pixbuf2.0-0 \
                                        libgtk-3-0 \
                                            libnspr4 \
                                                libnss3 \
                                                    libx11-xcb1 \
                                                        libxcomposite1 \
                                                            libxdamage1 \
                                                                libxrandr2 \
                                                                    xdg-utils \
                                                                        --no-install-recommends \
                                                                            && rm -rf /var/lib/apt/lists/*

                                                                            # Tell Puppeteer to skip downloading Chromium and use system Chromium
                                                                            ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
                                                                            ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

                                                                            WORKDIR /app

                                                                            # Copy package files and install dependencies
                                                                            COPY package*.json ./
                                                                            RUN npm ci --omit=dev

                                                                            # Copy app source
                                                                            COPY . .

                                                                            EXPOSE 3000

                                                                            CMD ["node", "server.js"]
