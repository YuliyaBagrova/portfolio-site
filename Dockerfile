FROM node:20-alpine



WORKDIR /app



COPY package.json package-lock.json* ./

RUN npm install --omit=dev



# При запуске через docker compose папка проекта монтируется поверх /app,

# поэтому COPY ниже нужен только для первой сборки образа без volumes.

COPY server ./server

COPY db ./db

COPY index.html styles.css app.js hero.js hero-banners.js fitness-banners.js fitness-hero.js fitness-catalog.js fitness-filter.js clothing-banners.js clothing-hero.js clothing-filter.js clothing-alerts.js clothing-catalog-icons.js clothing-catalog-promo.js admin.js admin-banner-editor.js admin-appearance.js admin-fitness.js admin-clothing.js api.js search.js section-icons.js ./

COPY fonts ./fonts



EXPOSE 3000



CMD ["npm", "start"]

