# DBeaver — подключение к Portfolio MySQL

Docker должен быть запущен:

```powershell
docker compose up -d
```

## Параметры подключения

| Поле | Значение |
|------|----------|
| **Тип** | MySQL |
| **Host** | `127.0.0.1` или `localhost` |
| **Port** | `3011` |
| **Database** | `portfolio` |
| **Username** | `root` |
| **Password** | `rootpassword` |

Альтернативный пользователь приложения:

| Username | Password |
|----------|----------|
| `portfolio` | `portfoliopass` |

## Driver properties (важно)

На вкладке **Driver properties** добавьте:

- `allowPublicKeyRetrieval` = `true`
- `useSSL` = `false`

Или в URL:

```
jdbc:mysql://127.0.0.1:3011/portfolio?allowPublicKeyRetrieval=true&useSSL=false&useUnicode=true&characterEncoding=UTF-8
```

## Готовый файл

В папке [`portfolio-connection.xml`](portfolio-connection.xml) — шаблон для импорта.

**DBeaver:** Database → Import connection → выберите этот XML.

## Таблицы пользователей

После регистрации на сайте смотрите:

```sql
SELECT id, name, email, created_at FROM admin_users ORDER BY id DESC;
```

Временные коды регистрации:

```sql
SELECT email, code, expires_at FROM admin_verification_codes;
```

## Если не подключается

1. Проверьте контейнер: `docker compose ps` — `portfolio-mysql` должен быть **Up**
2. Порт **3011** не занят другим приложением
3. В DBeaver Host именно `127.0.0.1`, не имя контейнера `db`
4. Test Connection → при ошибке auth включите `allowPublicKeyRetrieval=true`
