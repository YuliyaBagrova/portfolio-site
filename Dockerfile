FROM node:20-alpine



WORKDIR /app



COPY package.json package-lock.json* ./

RUN npm install --omit=dev



# При запуске через docker compose папка проекта монтируется поверх /app,

# поэтому COPY ниже нужен только для первой сборки образа без volumes.

COPY server ./server

COPY db ./db

COPY index.html styles.css app.js hero.js hero-banners.js fitness-banners.js fitness-hero.js fitness-catalog.js fitness-filter.js clothing-banners.js clothing-hero.js clothing-filter.js clothing-alerts.js clothing-catalog-icons.js clothing-catalog-promo.js clothing-catalog.js admin.js admin-banner-editor.js admin-home-banner.js admin-fitness-banner.js admin-fitness-catalog.js admin-section-icons.js admin-appearance.js admin-appearance-palette.js admin-fitness.js admin-banners-works.js admin-banners.js admin-clothing-banner.js admin-clothing-catalog-icons.js admin-clothing-alerts.js admin-clothing-catalog-promo.js admin-clothing.js api.js search.js section-icons.js theme-utils.js theme-applier.js site-cart.js site-orders.js site-float-actions.js site-float-actions.css cart.html cart.js cart.css orders.html orders.js orders.css product.html product.js product.css clothing-product.html clothing-product.js clothing-product.css banners-order.html banners-order.js banners-order.css order-confirm.js ./

COPY fonts ./fonts



EXPOSE 3000



CMD ["npm", "start"]

