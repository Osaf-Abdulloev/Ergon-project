import re
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.domain import Job
from app.models.enums import JobStatus, EmploymentType

import logging

logger = logging.getLogger(__name__)

class TelegramParserService:
    BASE_URLS = [
        "https://t.me/s/Kortj1",
        "https://telegram.me/s/Kortj1"
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_and_sync(self, max_pages: int = 5) -> Dict[str, Any]:
        stats = {"created": 0, "updated": 0, "total_scraped": 0, "errors": 0}
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
        }

        async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True, verify=False) as client:
            for base_url in self.BASE_URLS:
                lowest_id = None
                for page in range(max_pages):
                    try:
                        url_to_fetch = base_url if not lowest_id else f"{base_url}?before={lowest_id}"
                        resp = await client.get(url_to_fetch)
                        if resp.status_code != 200:
                            break

                        html_content = resp.text
                        posts = self._parse_html_posts(html_content)

                        if not posts:
                            break

                        stats["total_scraped"] += len(posts)

                        for post in posts:
                            try:
                                created = await self._save_or_update_job(post)
                                if created:
                                    stats["created"] += 1
                                else:
                                    stats["updated"] += 1
                            except Exception as e:
                                stats["errors"] += 1
                                logger.error(f"Error saving telegram post {post.get('id')}: {e}")

                        # Update lowest_id for pagination
                        post_ids = [int(p['id']) for p in posts if p.get('id') and str(p['id']).isdigit()]
                        if post_ids:
                            min_post_id = min(post_ids)
                            if lowest_id is not None and min_post_id >= lowest_id:
                                break
                            lowest_id = min_post_id
                        else:
                            break

                    except Exception as e:
                        stats["errors"] += 1
                        logger.warning(f"Telegram parser network/scraping notice for page {page} ({base_url}): {e}")
                        break

                if stats["total_scraped"] > 0:
                    break

        return stats

    def _parse_html_posts(self, html: str) -> List[Dict[str, Any]]:
        posts = []
        
        # Match data-post="Kortj1/1234"
        message_blocks = re.findall(
            r'class="[^"]*tgme_widget_message\b[^"]*"[^>]*data-post="Kortj1/(\d+)"[^>]*>(.*?)(?=<div class="[^"]*tgme_widget_message\b|$)',
            html,
            re.DOTALL
        )

        for post_id, block in message_blocks:
            # Extract message text
            text_match = re.search(r'class="[^"]*js-message_text[^"]*"[^>]*>(.*?)</div>', block, re.DOTALL)
            if not text_match:
                continue

            raw_text = text_match.group(1)
            clean_text = self._clean_html_text(raw_text)

            # Skip pinned channel header / deleted message noise
            if "deleted message" in clean_text.lower() or "pinned" in clean_text.lower():
                continue
            if clean_text.startswith("КОР ТЧ |") and len(clean_text) < 150:
                continue
            if len(clean_text.strip()) < 20:
                continue

            # Check if post contains vacancy keywords
            text_lower = clean_text.lower()
            vacancy_keywords = [
                'вакансия', 'требуется', 'ищем', 'работа', 'должность', 'обязанности',
                'требования', 'зарплата', 'оклад', 'график', 'контакты', 'собеседование',
                'разработчик', 'менеджер', 'оператор', 'специалист', 'дизайнер', 'инженер',
                'бухгалтер', 'продавец', 'водитель', 'повар', 'администратор', 'кассир'
            ]
            if not any(kw in text_lower for kw in vacancy_keywords):
                continue

            # Extract title cleanly
            lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
            
            title = "Вакансия в Таджикистане"
            for line in lines:
                cleaned_line = re.sub(r'^[📌🚀🔹▪️♦️🔥⭐‼️⚡📢\s]+', '', line).strip()
                if len(cleaned_line) >= 4 and not cleaned_line.startswith("КОР ТЧ") and not cleaned_line.startswith("http"):
                    title = cleaned_line
                    break

            if len(title) > 90:
                title = title[:87] + "..."

            # Extract Direct Telegram Contact (e.g. @hr_name or t.me/hr_name)
            tg_contact_url = f"https://t.me/Kortj1/{post_id}"
            username_match = re.search(r'(?:@|t\.me/)([A-Za-z0-9_]{4,32})', clean_text)
            if username_match:
                uname = username_match.group(1)
                if uname.lower() not in ["kortj1", "s", "share", "c"]:
                    tg_contact_url = f"https://t.me/{uname}"

            # Extract Salary
            salary_min, salary_max, currency = self._extract_salary(clean_text)

            # Extract Location
            location = self._extract_location(clean_text)

            # Extract Employment Type
            employment_type = self._extract_employment_type(clean_text)

            # Extract Company Name
            company_name = self._extract_company_name(clean_text, lines)

            # Format rich description
            rich_desc = self._build_rich_description(title, company_name, clean_text, tg_contact_url)

            posts.append({
                "id": post_id,
                "title": title,
                "description": rich_desc,
                "salary_min": salary_min,
                "salary_max": salary_max,
                "currency": currency,
                "location": location,
                "employment_type": employment_type,
                "company_name": company_name,
                "url": tg_contact_url
            })

        return posts

    def _clean_html_text(self, html_text: str) -> str:
        text = re.sub(r'<br\s*/?>', '\n', html_text)
        text = re.sub(r'</p>', '\n', text)
        text = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'\2 (\1)', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'&quot;', '"', text)
        text = re.sub(r'&amp;', '&', text)
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&#39;', "'", text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _build_rich_description(self, title: str, company: str, text: str, contact_url: str) -> str:
        parts = []
        parts.append(f"📌 {title}")
        parts.append(f"🏢 Организация: {company}\n")
        parts.append(f"📝 Подробное описание вакансии:\n{text}")
        parts.append(f"\n📲 Для прямого отклика напишите работодателю в Telegram: {contact_url}")
        return "\n\n".join(parts)

    def _extract_salary(self, text: str) -> tuple[Optional[float], Optional[float], str]:
        currency = "TJS"
        if "$" in text or "USD" in text:
            currency = "USD"
        elif "руб" in text.lower() or "RUB" in text:
            currency = "RUB"

        range_match = re.search(r'(?:от\s*)?(\d[\d\s]*\d)\s*(?:-|до)\s*(\d[\d\s]*\d)', text, re.IGNORECASE)
        if range_match:
            try:
                s_min = float(range_match.group(1).replace(' ', ''))
                s_max = float(range_match.group(2).replace(' ', ''))
                return s_min, s_max, currency
            except ValueError:
                pass

        single_match = re.search(r'(?:зарплата|оклад|доход|от|до)?\s*(\d[\d\s]{2,}\d)\s*(?:сомони|tjs|\$|руб)', text, re.IGNORECASE)
        if single_match:
            try:
                val = float(single_match.group(1).replace(' ', ''))
                return val, val, currency
            except ValueError:
                pass

        return None, None, currency

    def _extract_location(self, text: str) -> str:
        text_lower = text.lower()
        if "душанбе" in text_lower or "dushanbe" in text_lower:
            return "Душанбе"
        elif "ходжент" in text_lower or "худжанд" in text_lower or "khujand" in text_lower:
            return "Худжанд"
        elif "бохтар" in text_lower or "курган" in text_lower:
            return "Бохтар"
        elif "куляб" in text_lower or "kulob" in text_lower:
            return "Куляб"
        elif "хорог" in text_lower:
            return "Хорог"
        return "Таджикистан"

    def _extract_employment_type(self, text: str) -> EmploymentType:
        text_lower = text.lower()
        if "удален" in text_lower or "remote" in text_lower or "из дома" in text_lower:
            return EmploymentType.REMOTE
        elif "частичная" in text_lower or "полдня" in text_lower or "гибкий" in text_lower:
            return EmploymentType.PART_TIME
        elif "проект" in text_lower or "фриланс" in text_lower:
            return EmploymentType.CONTRACT
        elif "стажировка" in text_lower or "intern" in text_lower:
            return EmploymentType.INTERNSHIP
        return EmploymentType.FULL_TIME

    def _extract_company_name(self, text: str, lines: List[str]) -> str:
        match = re.search(r'(?:компания|организация|фирма|работодатель|в\s+команду|в)\s+["«]?([A-ZА-ЯЁ0-9a-zа-яё\s\.\-]{2,40})["»]?', text, re.IGNORECASE)
        if match and len(match.group(1).strip()) > 2:
            return match.group(1).strip()
        return "Работодатель (Telegram Kortj1)"

    async def _save_or_update_job(self, post: Dict[str, Any]) -> bool:
        ext_id = str(post["id"])
        stmt = select(Job).where(Job.external_source == "telegram_kortj1", Job.external_id == ext_id)
        res = await self.db.execute(stmt)
        existing_job = res.scalar_one_or_none()

        tg_logo = "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"

        if existing_job:
            existing_job.title = post["title"]
            existing_job.description = post["description"]
            existing_job.salary_min = post["salary_min"]
            existing_job.salary_max = post["salary_max"]
            existing_job.currency = post["currency"]
            existing_job.location = post["location"]
            existing_job.employment_type = post["employment_type"]
            existing_job.external_company_name = post["company_name"]
            existing_job.external_company_logo = tg_logo
            existing_job.external_url = post["url"]
            await self.db.commit()
            return False
        else:
            new_job = Job(
                title=post["title"],
                description=post["description"],
                salary_min=post["salary_min"],
                salary_max=post["salary_max"],
                currency=post["currency"],
                location=post["location"],
                category="Другое",
                employment_type=post["employment_type"],
                status=JobStatus.OPEN,
                is_external=True,
                external_source="telegram_kortj1",
                external_id=ext_id,
                external_url=post["url"],
                external_company_name=post["company_name"],
                external_company_logo=tg_logo
            )
            self.db.add(new_job)
            await self.db.commit()
            return True
