-- Совместимость с DBeaver (как в СоцПомощник на 3010)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'rootpassword';
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'rootpassword';
ALTER USER 'portfolio'@'%' IDENTIFIED WITH mysql_native_password BY 'portfoliopass';
GRANT ALL PRIVILEGES ON portfolio.* TO 'portfolio'@'%';
GRANT ALL PRIVILEGES ON portfolio.* TO 'root'@'%';
FLUSH PRIVILEGES;
