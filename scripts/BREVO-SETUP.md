# Настройка Brevo (бесплатная транзакционная почта)

Brevo (бывший Sendinblue) — **бесплатно ~300 писем в день**. Письма доходят до любых получателей (Gmail, Mail.ru, Yandex и т.д.).

## Если Brevo не принимает ссылку на GitHub

Brevo часто **отклоняет**:
- `http://localhost:3000`
- `https://github.com/.../portfolio-site` (ссылка на репозиторий)

**Что делать:**

### Вариант А — поле «Сайт» при регистрации аккаунта

1. Ищите галочку **«У меня нет сайта»** / **«I don't have a website yet»** — и пропустите поле.
2. Если поле обязательное — после включения GitHub Pages используйте:
   ```
   https://yuliyabagrova.github.io/portfolio-site/
   ```
3. Или укажите **профиль GitHub** (без `/portfolio-site`):
   ```
   https://github.com/YuliyaBagrova
   ```
4. Или любую **публичную соцсеть**: VK, Telegram-канал, LinkedIn.

### Вариант Б — включить GitHub Pages (рекомендуется)

1. Откройте https://github.com/YuliyaBagrova/portfolio-site/settings/pages
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: **main**, Folder: **/docs**
4. Save → подождите 1–3 минуты
5. Сайт будет доступен по адресу:
   ```
   https://yuliyabagrova.github.io/portfolio-site/
   ```
6. Эту ссылку вставляйте в Brevo в поле Website.

> Страница лежит в папке `docs/index.html` в репозитории.

---

## 1. Регистрация в Brevo

1. Откройте https://www.brevo.com → **Sign up free**.
2. Компания: `Portfolio` или ваше имя (юрлицо не нужно).
3. Сайт: см. блок выше.
4. Подтвердите email.

## 2. API-ключ

1. **Settings** → **SMTP & API** → **API Keys**.
2. **Generate a new API key** → имя `portfolio`.
3. Скопируйте ключ (показывается один раз).

## 3. Отправитель (Sender)

1. **Senders & IP** → **Senders** → **Add a sender**.
2. Email: `lolyuuu503@gmail.com`.
3. Имя: `Portfolio`.
4. Brevo пришлёт **6-значный код** или письмо со ссылкой — подтвердите отправителя.
5. Статус: **Verified** (предупреждение про DKIM для Gmail — нормально для личного email).

## 4. Файл `.env`

```env
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-ваш-ключ-здесь
BREVO_SENDER_EMAIL=lolyuuu503@gmail.com
BREVO_SENDER_NAME=Portfolio
```

Сохраните (**Ctrl+S**).

## 5. Перезапуск Docker

```powershell
docker compose up -d --force-recreate app
```

В логах:

```
Почта настроена: Brevo (lolyuuu503@gmail.com) — транзакционная доставка получателям
```

## 6. Проверка

1. http://localhost:3000 → регистрация → «Получить код».
2. Укажите чужой email — код должен прийти во «Входящие».

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| Ссылка на сайт не принимается | GitHub Pages URL или «нет сайта» |
| `BREVO_API_KEY пуст` | Ключ в `.env`, Ctrl+S, перезапуск Docker |
| `Email отправителя не подтверждён` | Senders → Verify для Gmail |
| Код на экране, письма нет | `docker compose logs app --tail 20` |

## Режимы регистрации на сайте

| Переменная | Поведение |
|------------|-----------|
| `REGISTER_SHOW_CODE=1` | Код на экране + письмо |
| `REGISTER_DEMO_MODE=1` | Только код на экране, без почты |
