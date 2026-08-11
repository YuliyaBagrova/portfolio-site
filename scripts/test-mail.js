require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { verifyMailTransport, sendRegistrationCodeEmail } = require('../server/mail');

async function main() {
  const to = process.argv[2] || process.env.SMTP_USER;

  if (!to) {
    console.error('Укажите email: node scripts/test-mail.js your@gmail.com');
    process.exit(1);
  }

  const status = await verifyMailTransport();
  if (!status.ok) {
    console.error('Ошибка:', status.error);
    process.exit(1);
  }

  await sendRegistrationCodeEmail({ to, code: '123456', expiresMinutes: 15 });
  console.log(`Тестовое письмо отправлено на ${to}`);
}

main().catch((error) => {
  console.error('Ошибка отправки:', error.message);
  process.exit(1);
});
