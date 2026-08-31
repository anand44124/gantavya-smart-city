import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple
from pathlib import Path
from dotenv import load_dotenv

# Load .env file explicitly
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

def get_smtp_config():
    server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = (os.getenv("SMTP_USER") or os.getenv("GMAIL_USER") or "gantavya2406@gmail.com").strip()
    pwd = (os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD") or "cjlfaokjmynwwaxb").replace(" ", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "Gantavya (गंतव्य) Smart City Portal")
    return server, port, user, pwd, from_name


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Citizen") -> Tuple[bool, str]:
    """
    Sends a real-time OTP verification email to the user's Gmail / email address.
    If SMTP credentials are provided, it delivers a rich HTML email via Gmail SMTP.
    If no SMTP credentials are configured yet, it logs the dispatch and returns simulated delivery.
    """
    subject = f"🔐 Your Gantavya Password Reset Code: {otp_code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .email-container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }}
        .header {{ background: linear-gradient(135deg, #0d9488, #10b981); padding: 28px 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }}
        .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 13px; }}
        .body {{ padding: 30px 24px; color: #1e293b; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
        .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
        .otp-box {{ background: #f0fdf4; border: 2px dashed #0d9488; border-radius: 14px; padding: 18px; text-align: center; margin: 20px 0; }}
        .otp-label {{ font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0d9488; letter-spacing: 1px; margin-bottom: 4px; }}
        .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; margin: 6px 0; }}
        .otp-expiry {{ font-size: 12px; color: #64748b; margin-top: 4px; }}
        .footer {{ background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }}
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>गंतव्य (Gantavya)</h1>
          <p>Smart City Governance & Citizen Mobility Platform</p>
        </div>
        <div class="body">
          <div class="greeting">Hello {user_name},</div>
          <div class="text">
            We received a request to reset the password for your <strong>Gantavya Citizen Account</strong> ({to_email}). Use the 6-digit verification code below to complete your password update.
          </div>
          <div class="otp-box">
            <div class="otp-label">Verification OTP Code</div>
            <div class="otp-code">{otp_code}</div>
            <div class="otp-expiry">⏳ Valid for 10 minutes only. Do not share this code with anyone.</div>
          </div>
          <div class="text" style="font-size: 12.5px; color: #64748b;">
            If you did not request this password reset, please ignore this email or reach out to municipal support.
          </div>
        </div>
        <div class="footer">
          &copy; Gantavya Smart City Grid &middot; Secure Civic Infrastructure Network
        </div>
      </div>
    </body>
    </html>
    """

    server_host, server_port, smtp_user, smtp_pass, from_name = get_smtp_config()

    if not smtp_user or not smtp_pass:
        # Development / Fallback mode
        print(f"\n[Gantavya Real-Time Email Dispatcher] >>> SENT OTP {otp_code} to {to_email} (Simulated Dispatch) <<<\n")
        return True, "Email dispatched (Simulated / Local mode)"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔐 Your Gantavya Verification Code: {otp_code}"
        msg["From"] = f"{from_name} <{smtp_user}>"
        msg["To"] = to_email
        msg["X-Priority"] = "1"
        msg["Priority"] = "Urgent"
        msg["Importance"] = "high"

        part_html = MIMEText(html_content, "html")
        part_text = MIMEText(f"Your Gantavya Password Reset Code is: {otp_code} (Valid for 10 mins).", "plain")

        msg.attach(part_text)
        msg.attach(part_html)

        # Primary: Direct SSL 465 (Fastest on cloud serverless)
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=6) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())
        except Exception as ssl_err:
            print(f"[Gantavya Email Service] SSL 465 notice, trying 587: {ssl_err}")
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=6) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())

        print(f"[Gantavya Email Service] 🚀 Real-time email successfully delivered to {to_email}")
        return True, f"Verification OTP successfully sent to {to_email}"
    except Exception as e:
        print(f"[Gantavya Email Service] SMTP Dispatch Notice: {e}")
        return False, f"SMTP delivery error: {str(e)}"
