import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def _send_smtp_message(msg: MIMEMultipart, to_email: str) -> bool:
        user = settings.get_smtp_user
        password = settings.get_smtp_password
        host = settings.get_smtp_host
        port = settings.get_smtp_port

        if not user or not password:
            logger.warning("SMTP settings not configured in .env (EMAIL_USER / SMTP_USER is empty)")
            return False

        sender = settings.get_email_from
        msg["From"] = f"HamKor.tj <{sender}>" if "<" not in msg.get("From", "") else msg["From"]
        msg["To"] = to_email

        try:
            if port == 465 or getattr(settings, "SMTP_SSL", False):
                with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                    server.login(user, password)
                    server.sendmail(sender, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.starttls()
                    server.login(user, password)
                    server.sendmail(sender, [to_email], msg.as_string())

            logger.info("Successfully sent email to %s via %s:%s", to_email, host, port)
            return True
        except Exception as e:
            logger.error("Error sending email to %s via %s:%s: %s", to_email, host, port, e)
            return False

    @staticmethod
    def send_email(to_email: str, subject: str, body: str, sender_name: str = "Работодатель HamKor") -> bool:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{settings.get_email_from}>"

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
              
              <p style="font-size: 13px; color: #64748b;">Вы можете ответить на это письмо напрямую на указанный email работодателя или связаться с ним на платформе HamKor.</p>
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

        return EmailService._send_smtp_message(msg, to_email)

    @staticmethod
    def send_welcome_email(to_email: str, user_name: str = "") -> bool:
        """Send a rich HTML welcome email upon user registration introducing HamKor and AI tools."""
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

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        return EmailService._send_smtp_message(msg, to_email)

    @staticmethod
    def send_verification_code_email(to_email: str, code: str) -> bool:
        """Send 6-digit verification code email."""
        subject = f"Ваш код подтверждения HamKor: {code}"
        plain_text = f"Ваш код для подтверждения email на платформе HamKor: {code}\nКод действителен в течение 15 минут."

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 24px;">
              <h2 style="margin: 0; font-size: 22px; font-weight: 800;">Подтверждение регистрации</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">HamKor.tj — Платформа поиска работы</p>
            </div>
            <div style="text-align: center; padding: 12px 0;">
              <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">Введите этот 6-значный код для активации вашего аккаунта:</p>
              <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #6366f1; padding: 16px 36px; border-radius: 12px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4f46e5;">
                {code}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">Код действителен 15 минут. Не сообщайте его никому.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">© 2026 HamKor.tj</p>
          </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        return EmailService._send_smtp_message(msg, to_email)

    @staticmethod
    def send_application_status_email(to_email: str, job_title: str, status_ru: str, feedback: str = "") -> bool:
        """Send notification email about application status update."""
        subject = f"Обновление статуса отклика на вакансию «{job_title}»: {status_ru}"
        feedback_block = f"<div style='background-color: #f1f5f9; border-left: 4px solid #6366f1; padding: 12px; margin: 12px 0;'><strong>Примечание работодателя:</strong> {feedback}</div>" if feedback else ""

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 18px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Изменение статуса отклика</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">HamKor.tj</p>
            </div>
            <p>Здравствуйте!</p>
            <p>Статус вашего отклика на вакансию <strong>«{job_title}»</strong> изменён на: <span style="font-weight: 800; color: #4f46e5;">{status_ru}</span>.</p>
            {feedback_block}
            <p>Вы можете войти на платформу HamKor для просмотра подробностей и связи с работодателем.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">© 2026 HamKor.tj</p>
          </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg.attach(MIMEText(f"Статус вашего отклика на «{job_title}»: {status_ru}", "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        return EmailService._send_smtp_message(msg, to_email)
