# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar dependencias según el lockfile encontrado (pnpm/yarn/npm)
COPY package.json package-lock.json yarn.lock pnpm-lock.yaml ./
RUN apk add --no-cache git ca-certificates bash \
    && if [ -f pnpm-lock.yaml ]; then npm i -g pnpm; fi \
    && if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
         elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
         else npm ci --prefer-offline --no-audit --progress=false; fi

# Copiar el código y construir (vite)
COPY . .
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN if [ -f pnpm-lock.yaml ]; then pnpm build; \
        elif [ -f yarn.lock ]; then yarn build; \
        else npm run build; fi

# Stage 2: serve with nginx
FROM nginx:stable-alpine
# SPA fallback + caching basic config
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
RUN mkdir -p /etc/nginx/conf.d
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;

        gzip on;
        gzip_types text/plain application/javascript application/json text/css text/xml application/xml application/xml+rss;

        location / {
                try_files $uri $uri/ /index.html;
        }

        location ~* \.(?:manifest|appcache|html?|xml|json)$ {
                add_header Cache-Control "no-cache, must-revalidate";
        }

        location ~* \.(?:css|js|woff2?|ttf|eot|otf|png|jpg|jpeg|gif|svg)$ {
                add_header Cache-Control "public, max-age=31536000, immutable";
        }
}
EOF

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- --timeout=2 http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]