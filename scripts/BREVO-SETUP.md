# Настройка Brevo (бесплатная транзакционная почта)

Brevo (бывший Sendinblue) — **бесплатно ~300 писем в день**. Письма доходят до любых получателей (Gmail, Mail.ru, Yandex и т.д.).

## 1. Регистрация

1. Откройте https://www.brevo.com и создайте аккаунт (можно через Google).
2. Подтвердите email.

## 2. API-ключ

1. В Brevo: **Settings** (шестерёнка) → **SMTP & API** → вкладка **API Keys**.
2. **Generate a new API key** → имя, например `portfolio`.
3. Скопируйте ключ (показывается один раз).

## 3. Отправитель (Sender)

1. **Senders & IP** → **Senders** → **Add a sender**.
2. Email: `lolyuuu503@gmail.com` (или ваш `BREVO_SENDER_EMAIL`).
3. Имя: `Portfolio`.
4. Сайт (Website): `https://github.com/YuliyaBagrova/portfolio-site` — **не** `localhost`, Brevo его не принимает.
5. Brevo пришлёт письмо на этот адрес — **нажмите ссылку подтверждения**.
6. Статус отправителя должен стать **Verified**.

## 4. Файл `.env`

```env
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-ваш-ключ-здесь
BREVO_SENDER_EMAIL=lolyuuu503@gmail.com
BREVO_SENDER_NAME=Portfolio
```

Сохраните файл (**Ctrl+S**).

## 5. Перезапуск Docker

```bash
docker compose up -d --force-recreate app
```

В логах должно быть:

```
Почта настроена: Brevo (lolyuuu503@gmail.com) — транзакционная доставка получателям
```

## 6. Проверка

1. Откройте http://localhost:3000 → регистрация → «Получить код».
2. Укажите **чужой** email (не только свой Gmail).
3. Код должен прийти во «Входящие» (иногда «Спам» в первый раз).

Тест через API:

```bash
docker compose exec app node -e "
fetch('http://localhost:3000/api/admin/register/test-mail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ваш-email@gmail.com' })
}).then(r => r.json()).then(console.log);
"
```

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `BREVO_API_KEY пуст` | Вставьте ключ в `.env`, сохраните, перезапустите контейнер |
| `Неверный BREVO_API_KEY` | Создайте новый ключ в Brevo |
| `Email отправителя не подтверждён` | Senders → Verify для `BREVO_SENDER_EMAIL` |
| Код на экране, письма нет | Смотрите лог: `docker compose logs app --tail 20` |

## Режимы регистрации

| Переменная | Значение | Поведение |
|------------|----------|-----------|
| `REGISTER_SHOW_CODE=1` | вкл. | Код на экране + письмо (рекомендуется) |
| `REGISTER_DEMO_MODE=1` | вкл. | Только код на экране, без почты |
