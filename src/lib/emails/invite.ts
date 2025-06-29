import sgMail from "../sendgrid";
import { SENDER_EMAIL } from "../sendgrid";

interface SendInviteEmailParams {
  email: string;
  inviteId: string;
  projectName: string;
  inviterName: string;
}

export async function sendInviteEmail({
  email,
  inviteId,
  projectName,
  inviterName,
}: SendInviteEmailParams) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?id=${inviteId}`;

  const msg = {
    to: email,
    from: SENDER_EMAIL,
    subject: `You've been invited to join ${projectName} on Warden`,
    text: `
Hi there,

${inviterName} has invited you to join the ${projectName} project on Warden.

Warden helps development teams get real-time alerts when critical events happen in their applications.

Accept the invitation by clicking the link below:
${inviteUrl}

If you weren't expecting this invitation, you can safely ignore this email.

Best regards,
The Warden Team
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: #020205;
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px;
    }
    .content h2 {
      margin-top: 0;
      color: #020205;
    }
    .button {
      display: inline-block;
      background: #FF6B35;
      color: white;
      padding: 12px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      background: #f8f8f8;
      padding: 24px 32px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .project-box {
      background: #f8f8f8;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      text-align: center;
    }
    .project-name {
      font-size: 20px;
      font-weight: 600;
      color: #020205;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏰 Warden</h1>
    </div>
    <div class="content">
      <h2>You've been invited!</h2>
      <p><strong>${inviterName}</strong> has invited you to join:</p>
      
      <div class="project-box">
        <div class="project-name">${projectName}</div>
        <div style="color: #666; margin-top: 4px;">on Warden</div>
      </div>
      
      <p>Warden helps development teams get real-time alerts when critical events happen in their applications.</p>
      
      <center>
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </center>
      
      <p style="font-size: 14px; color: #666; margin-top: 24px;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>© 2024 Warden. All rights reserved.</p>
      <p style="font-size: 12px; margin-top: 8px;">
        This invitation link will expire in 7 days.
      </p>
    </div>
  </div>
</body>
</html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Invite email sent to ${email}`);
  } catch (error) {
    console.error("Error sending invite email:", error);
    throw error;
  }
}
