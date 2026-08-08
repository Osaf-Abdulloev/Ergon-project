import logging
import re
import httpx
from urllib.parse import unquote
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Job
from app.models.enums import EmploymentType, JobStatus

logger = logging.getLogger(__name__)

YORA_API_SEARCH_URL = "https://api.yora.tj/api/v1/vacancy_search"
YORA_BASE_VACANCY_URL = "https://yora.tj/ru/vacancies"

class YoraParserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def _map_employment_type(work_format_name: Optional[str]) -> EmploymentType:
        if not work_format_name:
            return EmploymentType.FULL_TIME
        name_lower = work_format_name.lower()
        if "удал" in name_lower or "дистанц" in name_lower:
            return EmploymentType.REMOTE
        if "частич" in name_lower or "гибк" in name_lower or "смен" in name_lower:
            return EmploymentType.PART_TIME
        if "стаж" in name_lower or "практик" in name_lower:
            return EmploymentType.INTERNSHIP
        if "проект" in name_lower or "контракт" in name_lower:
            return EmploymentType.CONTRACT
        return EmploymentType.FULL_TIME

    @staticmethod
    def _clean_text(raw_text: Optional[str]) -> str:
        if not raw_text or not isinstance(raw_text, str):
            return ""
        text = re.sub(r'<br\s*/?>', '\n', raw_text)
        text = re.sub(r'</p>', '\n', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'&quot;', '"', text)
        text = re.sub(r'&amp;', '&', text)
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&#39;', "'", text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def _build_description(item: Dict[str, Any]) -> str:
        parts = []

        org_name = item.get("organisation_name") or "Работодатель"
        pos_title = item.get("position") or "Специалист"
        region = item.get("region_id_name") or "Таджикистан"
        exp_level = item.get("experience_level_name")
        work_format = item.get("work_format_name")

        meta_info = []
        meta_info.append(f"🏢 Компания: {org_name}")
        meta_info.append(f"📍 Локация: {region}")
        if exp_level:
            meta_info.append(f"💼 Требуемый опыт: {exp_level}")
        if work_format:
            meta_info.append(f"⏰ Формат работы: {work_format}")
        parts.append("\n".join(meta_info))

        position_txt = YoraParserService._clean_text(item.get("position_txt"))
        if position_txt and len(position_txt) > 20:
            parts.append(f"📌 Описание вакансии:\n{position_txt}")

        responsibilities = YoraParserService._clean_text(item.get("responsibilities"))
        if responsibilities:
            parts.append(f"📋 Обязанности:\n{responsibilities}")

        requirements = YoraParserService._clean_text(item.get("requirements"))
        if requirements:
            parts.append(f"🎯 Требования к кандидату:\n{requirements}")

        conditions = YoraParserService._clean_text(item.get("conditions"))
        if conditions:
            parts.append(f"🎁 Условия и преимущества:\n{conditions}")

        if len(parts) == 1:
            parts.append(f"Компания {org_name} приглашает специалиста на должность {pos_title} в городе {region}.")

        parts.append(f"\nℹ️ Вакансия верифицирована и импортирована с официального портала yora.tj")
        return "\n\n".join(parts)

    async def fetch_and_sync(self, max_pages: Optional[int] = None, page_size: int = 50) -> Dict[str, int]:
        stats = {
            "total_fetched": 0,
            "created": 0,
            "updated": 0,
            "errors": 0
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }

            current_page = 1
            total_pages = 1

            while current_page <= total_pages:
                if max_pages and current_page > max_pages:
                    break

                try:
                    params = {
                        "page": current_page,
                        "page_size": page_size
                    }
                    response = await client.get(YORA_API_SEARCH_URL, headers=headers, params=params)

                    if response.status_code != 200:
                        logger.error(f"Failed to fetch page {current_page} from yora.tj API: HTTP {response.status_code}")
                        stats["errors"] += 1
                        break

                    data = response.json()
                    total_pages = data.get("total_pages", 1)
                    items = data.get("data", [])

                    for item in items:
                        stats["total_fetched"] += 1
                        try:
                            async with self.session.begin_nested():
                                await self._sync_single_vacancy(client, item, stats)
                        except Exception as e:
                            logger.error(f"Error syncing vacancy {item.get('id')}: {e}")
                            stats["errors"] += 1

                    await self.session.commit()

                except Exception as e:
                    logger.error(f"Error fetching page {current_page} from yora.tj: {e}")
                    stats["errors"] += 1
                    break

                current_page += 1

        return stats

    async def _sync_single_vacancy(self, client: httpx.AsyncClient, item: Dict[str, Any], stats: Dict[str, int]) -> None:
        vac_id = item.get("id")
        if not vac_id:
            return

        external_id = str(vac_id)
        external_source = "yora.tj"
        title = (item.get("position") or "Вакансия").strip()
        description = self._build_description(item)

        salary_min = None
        sal_from = item.get("salary_from")
        if sal_from:
            try:
                val = float(sal_from)
                if val > 0:
                    salary_min = val
            except (ValueError, TypeError):
                pass

        salary_max = None
        sal_to = item.get("salary_to")
        if sal_to:
            try:
                val = float(sal_to)
                if val > 0:
                    salary_max = val
            except (ValueError, TypeError):
                pass

        raw_currency = item.get("currency_name") or "TJS"
        if "Somoni" in raw_currency or "TJS" in raw_currency:
            currency = "TJS"
        elif "USD" in raw_currency or "Dollar" in raw_currency or "$" in raw_currency:
            currency = "USD"
        elif "RUB" in raw_currency or "Ruble" in raw_currency:
            currency = "RUB"
        else:
            currency = raw_currency[:50]
        location = item.get("region_id_name") or "Таджикистан"
        work_format = item.get("work_format_name")
        employment_type = self._map_employment_type(work_format)

        org_name = (item.get("organisation_name") or "Компания").strip()
        org_logo = await self._extract_logo_async(client, item)
        external_url = f"{YORA_BASE_VACANCY_URL}/{external_id}"

        req_dict = {
            "experience_level": item.get("experience_level_name"),
            "work_format": work_format,
            "responsibilities": self._clean_text(item.get("responsibilities")),
            "requirements": self._clean_text(item.get("requirements"))
        }

        # Check existing job
        stmt = select(Job).where(
            Job.external_source == external_source,
            Job.external_id == external_id
        )
        result = await self.session.execute(stmt)
        existing_job = result.scalar_one_or_none()

        if existing_job:
            existing_job.title = title
            existing_job.description = description
            existing_job.salary_min = salary_min
            existing_job.salary_max = salary_max
            existing_job.currency = currency
            existing_job.location = location
            existing_job.employment_type = employment_type
            existing_job.requirements = req_dict
            existing_job.external_company_name = org_name
            existing_job.external_company_logo = org_logo
            existing_job.external_url = external_url
            existing_job.status = JobStatus.OPEN
            stats["updated"] += 1
        else:
            new_job = Job(
                company_id=None,
                title=title,
                description=description,
                salary_min=salary_min,
                salary_max=salary_max,
                currency=currency,
                location=location,
                employment_type=employment_type,
                status=JobStatus.OPEN,
                requirements=req_dict,
                is_external=True,
                external_source=external_source,
                external_id=external_id,
                external_url=external_url,
                external_company_name=org_name,
                external_company_logo=org_logo
            )
            self.session.add(new_job)
            stats["created"] += 1

    async def _extract_logo_async(self, client: httpx.AsyncClient, item: Dict[str, Any]) -> str:
        raw_logo = (
            item.get("organisation_avatar_url") or
            item.get("employer_avatar_url") or
            item.get("logo") or
            item.get("photo_url") or
            item.get("avatar") or
            item.get("organisation_logo")
        )
        if raw_logo and isinstance(raw_logo, str) and raw_logo.strip():
            url = raw_logo.strip()
            if url.startswith("http://") or url.startswith("https://"):
                return url
            if url.startswith("/"):
                return f"https://yora.tj{url}"
            return f"https://yora.tj/{url}"

        org = item.get("organisation_name") or "HamKor"
        initial = org[0].upper() if org and org[0].isalnum() else "E"
        
        gradients = [
            ("4f46e5", "7c3aed"),
            ("059669", "0d9488"),
            ("dc2626", "ea580c"),
            ("2563eb", "0284c7"),
            ("d97706", "ca8a04"),
            ("7c3aed", "c026d3"),
        ]
        g_idx = abs(hash(org)) % len(gradients)
        c1, c2 = gradients[g_idx]

        return f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23{c1}'/><stop offset='100%' stop-color='%23{c2}'/></linearGradient></defs><rect width='120' height='120' rx='32' fill='url(%23g)'/><text x='60' y='76' font-size='56' font-weight='900' font-family='sans-serif' fill='white' text-anchor='middle'>{initial}</text></svg>"
