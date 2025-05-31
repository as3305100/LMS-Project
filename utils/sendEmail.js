import nodemailer from "nodemailer";

async function sendEmail({to, subject, html}) {

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
     from: `"lms project" <${process.env.SMTP_USER}>`,
     to,
     subject,
     html
  }

  await transporter.sendMail(mailOptions)
}

export default sendEmail
