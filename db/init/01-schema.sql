CREATE TABLE IF NOT EXISTS sections (

  id VARCHAR(32) PRIMARY KEY,

  title VARCHAR(128) NOT NULL,

  work_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS works (

  id INT AUTO_INCREMENT PRIMARY KEY,

  section_id VARCHAR(32) NOT NULL,

  title VARCHAR(255) NOT NULL,

  description TEXT,

  category VARCHAR(32),

  tags VARCHAR(255),

  placeholder_text VARCHAR(128),

  gradient VARCHAR(255),

  image_data LONGTEXT,

  price_usd DECIMAL(10, 2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_works_section

    FOREIGN KEY (section_id) REFERENCES sections(id)

    ON DELETE CASCADE

);



CREATE TABLE IF NOT EXISTS admin_users (

  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(128),

  email VARCHAR(255) NOT NULL UNIQUE,

  password_hash VARCHAR(255),

  avatar_data MEDIUMTEXT NULL,

  location VARCHAR(128) NULL,

  phone VARCHAR(32) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS site_users (

  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(128),

  email VARCHAR(255) NOT NULL UNIQUE,

  password_hash VARCHAR(255),

  avatar_data MEDIUMTEXT NULL,

  location VARCHAR(128) NULL,

  phone VARCHAR(32) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS site_verification_codes (

  id INT AUTO_INCREMENT PRIMARY KEY,

  email VARCHAR(255) NOT NULL,

  code VARCHAR(16) NOT NULL,

  name VARCHAR(128),

  password_hash VARCHAR(255) NOT NULL,

  expires_at TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_site_verify_email (email),

  INDEX idx_site_verify_expires (expires_at)

);



CREATE TABLE IF NOT EXISTS hero_banners (

  slide_index TINYINT PRIMARY KEY,

  image_data LONGTEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS fitness_hero_banners (

  slide_index TINYINT PRIMARY KEY,

  image_data LONGTEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS clothing_hero_banners (

  slide_index TINYINT PRIMARY KEY,

  image_data LONGTEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS clothing_alerts (

  id INT AUTO_INCREMENT PRIMARY KEY,

  alert_type VARCHAR(16) NOT NULL,

  badge VARCHAR(32) NOT NULL,

  title VARCHAR(128) NOT NULL,

  description TEXT,

  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS clothing_catalog_promo (

  id VARCHAR(32) PRIMARY KEY,

  image_data LONGTEXT,

  promo_label VARCHAR(64) NOT NULL DEFAULT 'Горячие предложения',

  promo_title VARCHAR(128) NOT NULL DEFAULT '',

  promo_subtitle VARCHAR(255) NOT NULL DEFAULT '',

  promo_link VARCHAR(512) NOT NULL DEFAULT '',

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS app_migrations (

  id VARCHAR(64) PRIMARY KEY,

  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



CREATE INDEX idx_works_section_id ON works(section_id);

CREATE INDEX idx_works_category ON works(category);

CREATE INDEX idx_clothing_alerts_sort_order ON clothing_alerts(sort_order);



CREATE TABLE IF NOT EXISTS work_reviews (

  id INT AUTO_INCREMENT PRIMARY KEY,

  work_id INT NOT NULL,

  author_name VARCHAR(128) NOT NULL,

  rating TINYINT NOT NULL,

  review_text TEXT,

  admin_reply TEXT,

  admin_reply_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reviews_work

    FOREIGN KEY (work_id) REFERENCES works(id)

    ON DELETE CASCADE

);



CREATE TABLE IF NOT EXISTS work_orders (

  id INT AUTO_INCREMENT PRIMARY KEY,

  work_id INT NOT NULL,

  customer_name VARCHAR(128) NOT NULL,

  email VARCHAR(255) NOT NULL,

  phone VARCHAR(32),

  quantity INT NOT NULL DEFAULT 1,

  message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_work

    FOREIGN KEY (work_id) REFERENCES works(id)

    ON DELETE CASCADE

);



CREATE INDEX idx_work_reviews_work_id ON work_reviews(work_id);

CREATE INDEX idx_work_orders_work_id ON work_orders(work_id);



CREATE TABLE IF NOT EXISTS section_icons (

  section_id VARCHAR(32) PRIMARY KEY,

  image_data LONGTEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);

