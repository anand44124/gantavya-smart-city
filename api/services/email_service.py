import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple

SMTP_SERVER = "smtp.gmail.com"
SMTP_USER = "gantavya2406@gmail.com"
SMTP_PASS = "cjlfaokjmynwwaxb"
SMTP_FROM_NAME = "Gantavya (गंतव्य) Smart City"


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Citizen") -> Tuple[bool, str]:
    """
    Delivers a real 6-digit verification code to the recipient's Gmail inbox.
    Uses direct SSL 465 with fallback to TLS 587.
    """
    subject = f"🔐 Your Gantavya Password Reset Code: {otp_code}"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">गंतव्य (Gantavya)</h1>
              <p style="margin: 6px 0 0; color: #e6fffa; font-size: 13px;">Smart City Governance & Citizen Mobility Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Hello {user_name},</p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your <strong>Gantavya Citizen Account</strong> (<strong>{to_email}</strong>). Use the verification code below to proceed:
              </p>
              <div style="background: #f0fdf4; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0d9488; letter-spacing: 1.5px; margin-bottom: 6px;">Verification OTP Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0f172a; margin: 4px 0;">{otp_code}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 6px;">⏳ Valid for 10 minutes only. Do not share this code.</div>
              </div>
              <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Gantavya Smart City Portal &middot; Ministry of Housing & Urban Affairs</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    plain_text = f"Your Gantavya Password Reset Code is: {otp_code} (Valid for 10 minutes). Do not share this code."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email
        msg["X-Priority"] = "1"
        msg["Priority"] = "Urgent"
        msg["Importance"] = "high"

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        # Try Port 465 SSL first
        try:
            with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())
            print(f"[Gantavya Email] 🚀 Dispatched via SSL 465 to {to_email}")
            return True, f"OTP sent to {to_email}"
        except Exception as e465:
            print(f"[Gantavya Email] 465 failed ({e465}), trying 587 STARTTLS...")
            with smtplib.SMTP(SMTP_SERVER, 587, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())
            print(f"[Gantavya Email] 🚀 Dispatched via TLS 587 to {to_email}")
            return True, f"OTP sent to {to_email}"
    except Exception as err:
        print(f"[Gantavya Email ERROR] {err}")
        return False, str(err)
