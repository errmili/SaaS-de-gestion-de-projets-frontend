# Multi-stage build
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build:prod

# Stage 2: Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/projecthub-frontend /usr/share/nginx/html

# ✅ CHANGÉ ICI : 10000 → 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# # Multi-stage build
# FROM node:18-alpine AS build

# WORKDIR /app
# COPY package*.json ./
# COPY node_modules ./node_modules
# COPY . .

# # Build production
# RUN npm run build:prod

# # SOLUTION : Copier manuellement index.html si absent
# RUN if [ ! -f /app/dist/projecthub-frontend/index.html ]; then \
#     cp /app/src/index.html /app/dist/projecthub-frontend/index.html; \
#     echo "✅ Index.html copié manuellement"; \
# fi

# # Vérifier que index.html est maintenant présent
# RUN ls -la /app/dist/projecthub-frontend/index.html

# # Stage 2: Nginx
# FROM nginx:alpine
# RUN rm -rf /usr/share/nginx/html/*
# RUN rm -rf /etc/nginx/conf.d/*
# COPY nginx.conf /etc/nginx/nginx.conf
# COPY --from=build /app/dist/projecthub-frontend /usr/share/nginx/html

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
