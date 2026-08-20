// src/services/email.service.js
// If SMTP env vars aren't set (local dev), we fall back to logging the
// email to the console instead of failing — so password-reset flows are
// testable without a real mail provider configured.

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    transporter = {
      sendMail: async (opts) => {
        console.log('--- DEV EMAIL (no SMTP configured) ---');
        console.log(`To: ${opts.to}`);
        console.log(`Subject: ${opts.subject}`);
        console.log(opts.text || opts.html);
        console.log('---------------------------------------');
        return { messageId: 'dev-console' };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@wisdom.local',
    to: toEmail,
    subject: 'Reset your Wisdom password',
    text: `You requested a password reset. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

module.exports = { sendPasswordResetEmail };
