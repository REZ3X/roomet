import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.BREVO_SMTP_HOST;
  const port = Number(process.env.BREVO_SMTP_PORT) || 587;
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[Email] Brevo SMTP credentials not found — email service disabled",
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });

  transporter.verify((error) => {
    if (error) {
      console.error("[Email] Brevo SMTP connection failed:", error);
    } else {
      console.log("[Email] Brevo SMTP server is ready to send emails");
    }
  });

  return transporter;
}

function getFrom(): { name: string; address: string } {
  return {
    name: process.env.BREVO_FROM_NAME || "Roomet",
    address: process.env.BREVO_FROM_EMAIL || "noreply@roomet.app",
  };
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn("[Email] No SMTP — skipping verification email to", email);
    return false;
  }

  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;

  try {
    const info = await t.sendMail({
      from: getFrom(),
      to: email,
      subject: "Verify your Roomet account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; color: #1a1a2e; padding: 0; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
            <h1 style="font-size: 26px; color: #ffffff; margin: 0; font-weight: 700; letter-spacing: -0.3px;">Roomet</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Verify your email address</p>
          </div>
          <div style="padding: 32px 28px;">
            <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">Hi there,</p>
            <p style="margin: 0 0 28px; font-size: 15px; color: #374151; line-height: 1.6;">
              Thanks for signing up for Roomet! Click the button below to verify your email and activate your account.
            </p>
            <div style="text-align: center; margin: 0 0 28px;">
              <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 40px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(79,70,229,0.3);">
                Verify Email
              </a>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                ⚠ This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
              If the button doesn't work, copy this link:<br/>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding: 16px 28px; text-align: center;">
            <p style="margin: 0; color: #d1d5db; font-size: 12px;">&copy; Roomet — End-to-End Encrypted Chat Rooms</p>
          </div>
        </div>
      `,
      text: `Welcome to Roomet!\n\nPlease verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
    });

    console.log(
      `✅ [Email] Verification email sent to ${email}: ${info.messageId}`,
    );
    return true;
  } catch (error) {
    console.error("❌ [Email] Failed to send verification email:", error);
    return false;
  }
}

export async function sendRoomInviteEmail(
  email: string,
  inviterName: string,
  roomTitle: string,
  inviteCode: string,
): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  const joinUrl = `${APP_URL}/room/join/${inviteCode}`;

  try {
    const info = await t.sendMail({
      from: getFrom(),
      to: email,
      subject: `${inviterName} invited you to join "${roomTitle}" on Roomet`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; color: #1a1a2e; padding: 0; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
            <h1 style="font-size: 26px; color: #ffffff; margin: 0; font-weight: 700;">Roomet</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Room Invitation</p>
          </div>
          <div style="padding: 32px 28px;">
            <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">You've been invited!</p>
            <p style="margin: 0 0 28px; font-size: 15px; color: #374151; line-height: 1.6;">
              <strong>${inviterName}</strong> invited you to join <strong>"${roomTitle}"</strong> on Roomet.
            </p>
            <div style="text-align: center; margin: 0 0 28px;">
              <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 40px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(79,70,229,0.3);">
                Join Room
              </a>
            </div>
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
              <a href="${joinUrl}" style="color: #6366f1; word-break: break-all;">${joinUrl}</a>
            </p>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding: 16px 28px; text-align: center;">
            <p style="margin: 0; color: #d1d5db; font-size: 12px;">&copy; Roomet</p>
          </div>
        </div>
      `,
      text: `${inviterName} invited you to join "${roomTitle}" on Roomet.\n\nJoin here: ${joinUrl}`,
    });

    console.log(
      `✅ [Email] Room invite email sent to ${email}: ${info.messageId}`,
    );
    return true;
  } catch (error) {
    console.error("❌ [Email] Failed to send room invite email:", error);
    return false;
  }
}
