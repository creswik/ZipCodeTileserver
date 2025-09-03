# Modern Node; tileserver-gl-light supports Node 18/20/22
FROM node:22-slim

# Optional (sqlite tools can help debugging mbtiles)
RUN apt-get update && apt-get install -y --no-install-recommends \
  sqlite3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Install tile server (vector only, no server-side raster)
RUN npm install -g tileserver-gl-light

# Cloud Run provides PORT
ENV PORT=8080

# WORKDIR is arbitrary; we read tiles from a mounted bucket at /data
WORKDIR /srv
EXPOSE 8080

# Start tile server pointing at the mounted mbtiles
# You can also supply a config.json (see below) instead of a single mbtiles path
CMD ["tileserver-gl-light", "-p", "8080", "/data/tiles.mbtiles"]
