FROM node:20-bullseye

# Install spacetime CLI
RUN curl --proto '=https' --tlsv1.2 -sSf https://install.spacetimedb.com | sh
ENV PATH="/root/.spacetime/bin:${PATH}"

WORKDIR /app/backend

# Copy backend package.json
COPY package*.json ./
RUN npm install

# Copy all backend files
COPY . .

# Server uses 8787 by default
EXPOSE 8787

CMD ["node", "scripts/api-server.mjs"]
