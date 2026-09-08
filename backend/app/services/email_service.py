import os
import resend
from app.config import settings
from datetime import datetime, timezone

DEFAULT_FROM_EMAIL = "Kalpanaaa Software Solutions <no-reply@kalpanaaa.in>"

OTP_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @media only screen and (max-width: 480px) {
      body { padding: 16px 8px !important; }
      .email-card { padding: 24px 18px !important; border-radius: 12px !important; }
      .email-logo { width: 170px !important; max-width: 100% !important; height: auto !important; }
      .otp-value { font-size: 30px !important; letter-spacing: 8px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:36px 16px;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8f9fc;-webkit-font-smoothing:antialiased;box-sizing:border-box;">
  <div class="email-card" style="max-width:460px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 4px 24px rgba(0,0,0,0.06);box-sizing:border-box;">
    <div style="margin-bottom:18px;">
      <a href="https://kss-workmate.vercel.app" style="text-decoration:none;display:inline-block;">
        <img src="https://kss-workmate.vercel.app/email-logo.png" alt="Workmate Logo" class="email-logo" style="width:200px;max-width:100%;height:auto;display:block;border:none;outline:none;text-decoration:none;" />
      </a>
    </div>
    <h2 style="color:#18181B;margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.01em;">Password Reset OTP</h2>
    <p style="color:#52525B;margin:0 0 20px;font-size:14px;line-height:1.5;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div style="background:#F1EEFF;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <span class="otp-value" style="font-size:36px;font-weight:700;letter-spacing:10px;color:#7C5CFC;font-family:monospace;">{otp}</span>
    </div>
    <p style="color:#71717A;font-size:13px;line-height:1.5;margin:0;">If you didn't request this, ignore this email.</p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;" />
    <p style="color:#A1A1AA;font-size:12px;margin:0 0 6px;">Kalpanaaa Software Solutions &nbsp;·&nbsp; Work Together. Grow Further.</p>
    <p style="color:#D4D4D8;font-size:10px;margin:0;">Requested at: {timestamp}</p>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str) -> bool:
    print(f"[AUTH-OTP] Preparing OTP email for {to_email}: {otp}")
    api_key = settings.RESEND_API_KEY or os.environ.get("RESEND_API_KEY")
    if not api_key:
        print("[AUTH-OTP] ERROR: No RESEND_API_KEY configured in environment or settings.")
        return False

    resend.api_key = api_key
    from_email = settings.RESEND_FROM_EMAIL or os.environ.get("RESEND_FROM_EMAIL") or DEFAULT_FROM_EMAIL

    # Use safe .replace instead of .format to avoid ValueError with CSS curly braces
    formatted_html = (
        OTP_TEMPLATE
        .replace("{otp}", str(otp))
        .replace("{timestamp}", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    )

    try:
        resp = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Your Workmate Password Reset OTP",
            "html": formatted_html,
        })
        print(f"[AUTH-OTP] Sent email to {to_email} successfully. Response: {resp}")
        return True
    except Exception as e:
        print(f"[AUTH-OTP] Primary send failed via {from_email} to {to_email}: {e}")
        # Try fallback sender if domain policy causes rejection
        if "from" in str(e).lower() or "domain" in str(e).lower() or "verify" in str(e).lower():
            try:
                resp = resend.Emails.send({
                    "from": "Workmate <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": "Your Workmate Password Reset OTP",
                    "html": formatted_html,
                })
                print(f"[AUTH-OTP] Sent email via fallback sender to {to_email}: {resp}")
                return True
            except Exception as e2:
                print(f"[AUTH-OTP] Fallback sender also failed: {e2}")
        return False

