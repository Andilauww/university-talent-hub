# Gunakan oven/bun sebagai builder stage
FROM oven/bun:alpine AS builder

WORKDIR /app

# Salin package.json, lockfile, dan konfigurasi bun
COPY package.json bun.lock bunfig.toml ./

# Install dependencies (menggunakan lockfile)
RUN bun install --frozen-lockfile

# Salin seluruh source code proyek
COPY . .

# Set environment build target ke node-server (atau bun)
ENV NITRO_PRESET=node-server
# Build aplikasi
RUN bun run build

# Stage kedua: Runner yang ringan
FROM oven/bun:alpine AS runner

WORKDIR /app

# Salin output hasil build dari stage builder
COPY --from=builder /app/.output ./.output


# Tentukan port default aplikasi
EXPOSE 8080

# Environment variables untuk production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Jalankan server hasil build
CMD ["bun", "run", "./.output/server/index.mjs"]
