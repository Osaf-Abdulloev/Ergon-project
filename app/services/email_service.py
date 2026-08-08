import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str, sender_name: str = "Работодатель HamKor") -> bool:
        if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
            logger.warning("SMTP settings not configured in .env")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{sender_name} <{settings.EMAIL_FROM or settings.EMAIL_USER}>"
            msg["To"] = to_email

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 18px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 24px;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Новое предложение на HamKor.tj</h2>
                  <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Платформа поиска работы и соискателей в Таджикистане</p>
                </div>

                <div style="padding: 8px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                  <p style="margin-top: 0; font-weight: 700; color: #1e293b;">Здравствуйте!</p>
                  <p>Вам поступило новое сообщение от работодателя через платформу <strong>HamKor</strong>:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 16px 0; white-space: pre-wrap; font-size: 14px; color: #0f172a;">{body}</div>
                  
                  <p style="font-size: 13px; color: #64748b;">Вы можете ответить на это письмо напрямую на указный email работодателя или связаться с ним на платформе HamKor.</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
                  © 2026 HamKor Job Search Platform. Все права защищены.
                </p>
              </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, [to_email], msg.as_string())
            server.quit()

            logger.info(f"Successfully sent email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            return False

    @staticmethod
    def send_welcome_email(to_email: str, user_name: str = "") -> bool:
        """Send a rich HTML welcome email upon user registration introducing HamKor and AI tools."""
        if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
            logger.warning("SMTP settings not configured in .env")
            return False

        name_str = f", {user_name}" if user_name else ""
        subject = "Добро пожаловать в HamKor! Ваш умный ИИ-помощник по поиску работы"

        plain_text = f"""
        Здравствуйте{name_str}!
        Добро пожаловать на платформу HamKor.tj — умный сервис поиска работы и подбора кадров в Таджикистане.
        
        Вы можете использовать встроенного ИИ-консультанта для мгновенной генерации резюме, оценки совпадения с вакансиями и поиска лучших предложений.
        
        С уважением,
        Команда HamKor.tj
        """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 16px; text-align: center; color: #ffffff; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Добро пожаловать в HamKor! 🎉</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Умная платформа поиска работы с искусственным интеллектом в Таджикистане</p>
            </div>

            <div style="padding: 8px 0; font-size: 14px; line-height: 1.7; color: #334155;">
              <p style="margin-top: 0; font-weight: 800; font-size: 16px; color: #1e293b;">Здравствуйте{name_str}!</p>
              <p>Поздравляем с успешной регистрацией на платформе <strong>HamKor.tj</strong>.</p>
              
              <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 18px; border-radius: 14px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #6d28d9; font-size: 15px; font-weight: 800;">🚀 Что вам доступно на платформе:</h3>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4c1d95; font-weight: 600; font-size: 13px;">
                  <li style="margin-bottom: 8px;">🤖 <strong>HamKor AI Консультант</strong> — умный ИИ-помощник для составления идеального резюме и анализа совпадений.</li>
                  <li style="margin-bottom: 8px;">🎯 <strong>Умный подбор вакансий</strong> — система автоматически анализирует ваши навыки и находит лучшие предложения.</li>
                  <li style="margin-bottom: 8px;">💬 <strong>Чат в реальном времени</strong> — прямое общение с работодателями и соискателями без посредников.</li>
                  <li>🔔 <strong>Уведомления и Telegram-бот</strong> — получайте мгновенные оповещения в Telegram и на сайте.</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #64748b;">Заполните ваш профиль и создайте резюме с помощью ИИ, чтобы уже сегодня получить отклики от работодателей!</p>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              © 2026 HamKor Job Search Platform. Все права защищены.
            </p>
          </div>
        </body>
        </html>
        """

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"HamKor.tj <{settings.EMAIL_FROM or settings.EMAIL_USER}>"
            msg["To"] = to_email

            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, [to_email], msg.as_string())
            server.quit()

            logger.info(f"Successfully sent welcome email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error sending welcome email to {to_email}: {e}")
            return False
