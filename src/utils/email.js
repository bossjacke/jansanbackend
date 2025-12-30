import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter with timeout configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 3000,    // 3 seconds
  socketTimeout: 10000,    // 10 seconds
});

// Verify transporter connectivity at startup so we get immediate feedback
transporter.verify()
  .then(() => console.log('✅ Email transporter is ready'))
  .catch((err) => console.error('❌ Email transporter verification failed:', err));

// Send Email Function
const sendEmail = async ({ to, subject, text, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  return await transporter.sendMail(mailOptions);
};

export default sendEmail;
