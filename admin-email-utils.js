(function initAdminEmailUtils() {
  const CYRILLIC_EMAIL_HOMOGLYPHS = {
    '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
    '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u04cf': 'l', '\u0501': 'e',
    '\u051b': 't', '\u0410': 'a', '\u0415': 'e', '\u041e': 'o', '\u0420': 'p',
    '\u0421': 'c', '\u0423': 'y', '\u0425': 'x'
  };

  const COMMON_DOMAIN_TYPOS = {
    'gmail.con': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmail.om': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'yandex.tu': 'yandex.ru',
    'yndex.ru': 'yandex.ru',
    'mai.ru': 'mail.ru',
    'mail.u': 'mail.ru',
    'mail.ri': 'mail.ru'
  };

  function fixCommonDomainTypos(email) {
    const [local, domain] = String(email || '').split('@');
    if (!local || !domain) return email;
    const fixedDomain = COMMON_DOMAIN_TYPOS[domain] || domain;
    return `${local}@${fixedDomain}`;
  }

  function sanitizeAdminEmail(value) {
    let email = String(value || '').trim().normalize('NFKC');
    email = email.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
    email = email.split('').map((char) => CYRILLIC_EMAIL_HOMOGLYPHS[char] || char).join('');
    email = fixCommonDomainTypos(email.trim().toLowerCase());
    return email;
  }

  window.sanitizeAdminEmail = sanitizeAdminEmail;
})();
