import resend
from app.config import settings

resend.api_key = settings.RESEND_API_KEY

OTP_TEMPLATE = """
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #f8f9fc; padding: 40px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <img src="https://kss-workmate.vercel.app/logo.webp" alt="Logo" style="height:80px;margin-bottom:24px;" />
    <h2 style="color:#18181B;margin:0 0 8px;">Password Reset OTP</h2>
    <p style="color:#52525B;margin:0 0 24px;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div style="background:#F1EEFF;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#7C5CFC;">{otp}</span>
    </div>
    <p style="color:#71717A;font-size:14px;margin:0;">If you didn't request this, ignore this email.</p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;" />
    <p style="color:#A1A1AA;font-size:12px;margin:0;">Kalpanaaa Software Solutions &nbsp;·&nbsp; Work Together. Grow Further.</p>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str):
    resend.Emails.send({
        "from": settings.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Your OTP Code",
        "html": OTP_TEMPLATE.format(otp=otp),
    })
