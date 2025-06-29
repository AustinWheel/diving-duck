import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("Missing SENDGRID_API_KEY environment variable");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Export the configured SendGrid instance
export default sgMail;

// Export common sender email (you'll need to verify this in SendGrid)
export const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL || "consolewardenemails@gmail.com";
