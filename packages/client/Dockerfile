# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV API_UPSTREAM=http://api:8000
ENV PORT=80

EXPOSE 80
CMD ["/bin/sh", "-c", "export DNS_RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf) && envsubst '${API_UPSTREAM} ${PORT} ${DNS_RESOLVER}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
