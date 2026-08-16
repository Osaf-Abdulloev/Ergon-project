from app.services.email_service import EmailService

def send_email_sync(to_email: str, subject: str, body_html: str) -> bool:
    return EmailService.send_html_email(to_email, subject, body_html)
