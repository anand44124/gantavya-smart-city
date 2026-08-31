import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Tuple

SMTP_SERVER = "smtp.gmail.com"
SMTP_USER = "gantavya2406@gmail.com"
SMTP_PASS = "cjlfaokjmynwwaxb"
SMTP_FROM_NAME = "Gantavya Support"


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Citizen") -> Tuple[bool, str]:
    """
    Delivers a clean, anti-spam RFC-compliant verification email to the user's Gmail.
    """
    subject = f"Gantavya Verification Code: {otp_code}"

    text_body = f"""Hello {user_name},

Your 6-digit verification code for Gantavya Smart City Portal is: {otp_code}

This code is valid for 10 minutes. Please do not share this code with anyone.

Regards,
Gantavya Support Team
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: #0d9488; padding: 20px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Gantavya (गंतव्य)</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #ccfbf1;">Smart City Governance & Citizen Mobility</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #0f172a;">Hello {user_name},</p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #475569;">
        We received a request to reset the password for your Gantavya account (<strong>{to_email}</strong>). Use the verification code below:
      </p>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #15803d; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">Verification OTP</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">{otp_code}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Valid for 10 minutes only</div>
      </div>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain="gantavya.gov.in")
        msg["Auto-Submitted"] = "auto-generated"

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=10) as s:
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, [to_email], msg.as_string())

        print(f"[Gantavya Email] Successfully delivered to {to_email}")
        return True, f"OTP sent to {to_email}"
    except Exception as err:
        print(f"[Gantavya Email Error] {err}")
        return False, str(err)
