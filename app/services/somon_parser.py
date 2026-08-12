import logging
import re
import asyncio
import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Job
from app.models.enums import EmploymentType, JobStatus

logger = logging.getLogger(__name__)

SOMON_VACANCIES_BASE_URL = "https://somon.tj/vakansii/dushanbe/"
SOMON_DOMAIN = "https://somon.tj"

def parse_somon_salary(raw_salary: Optional[str]) -> Tuple[Optional[float], Optional[float], str]:
    if not raw_salary or not isinstance(raw_salary, str):
        return None, None, "TJS"
    
    clean = raw_salary.lower().replace("\xa0", " ").replace(" ", "").replace("c.", "").replace("сомони", "").replace("смн", "").replace("тјs", "")
    
    if "договорная" in clean or "ценанеуказана" in clean or not clean:
        return None, None, "TJS"

    # Range format: e.g. 3000-6000 or от3000до6000
    range_match = re.search(r'(?:от)?(\d+)(?:до|-|–|—)(\d+)', clean)
    if range_match:
        try:
            return float(range_match.group(1)), float(range_match.group(2)), "TJS"
        except ValueError:
            pass

    ot_match = re.search(r'от(\d+)', clean)
    if ot_match:
        try:
            return float(ot_match.group(1)), None, "TJS"
        except ValueError:
            pass

    do_match = re.search(r'до(\d+)', clean)
    if do_match:
        try:
            return None, float(do_match.group(1)), "TJS"
        except ValueError:
            pass

    single_match = re.search(r'(\d+)', clean)
    if single_match:
        try:
            val = float(single_match.group(1))
            return val, val, "TJS"
        except ValueError:
            pass

    return None, None, "TJS"


def map_somon_employment_type(title: str, description: str) -> EmploymentType:
    comb = f"{title} {description}".lower()
    if "удален" in comb or "дистанцио" in comb or "фриланс" in comb or "remote" in comb:
        return EmploymentType.REMOTE
    if "частичн" in comb or "гибк" in comb or "смен" in comb or "полдня" in comb or "part-time" in comb:
        return EmploymentType.PART_TIME
    if "стажировк" in comb or "практик" in comb or "intern" in comb:
        return EmploymentType.INTERNSHIP
    if "проект" in comb or "контракт" in comb or "времен" in comb:
        return EmploymentType.CONTRACT
    return EmploymentType.FULL_TIME


def detect_somon_category(title: str, description: str) -> str:
    comb = f"{title} {description}".lower()
    if any(k in comb for k in ["it", "программист", "разработчик", "дизайнер", "python", "javascript", "react", "веб"]):
        return "IT & Технологии"
    if any(k in comb for k in ["бухгалтер", "финанс", "кассир", "аудит", "банк", "налог"]):
        return "Финансы и банки"
    if any(k in comb for k in ["торгов", "продаж", "консультант", "менеджер по продажам", "супервайзер"]):
        return "Торговля & Продажи"
    if any(k in comb for k in ["водитель", "курьер", "доставк", "логист", "склад"]):
        return "Логистика & Транспорт"
    if any(k in comb for k in ["ресепш", "администратор", "офис-менеджер", "секретарь"]):
        return "Услуги & Консалтинг"
    if any(k in comb for k in ["учитель", "преподаватель", "педагог", "воспитатель"]):
        return "Образование & Наука"
    if any(k in comb for k in ["врач", "медсестра", "фармацевт", "стоматолог"]):
        return "Медицина & Фармацевтика"
    if any(k in comb for k in ["инженер", "строитель", "электрик", "мастер", "прораб"]):
        return "Строительство & Архитектура"
    return "Вакансии"


class SomonParserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
        }

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

    async def fetch_item_links(self, client: httpx.AsyncClient, page: int = 1) -> List[str]:
        if page == 1:
            page_url = SOMON_VACANCIES_BASE_URL
        else:
            page_url = f"{SOMON_VACANCIES_BASE_URL}?page={page}"
            
        try:
            res = await client.get(page_url)
            if res.status_code != 200:
                logger.warning(f"Somon.tj list page {page} returned status {res.status_code}")
                return []
            
            res.encoding = "utf-8"
            soup = BeautifulSoup(res.text, "html.parser")
            
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith("/adv/") and href not in links:
                    links.append(href)
            return links
        except Exception as err:
            logger.error(f"Error fetching Somon.tj page {page}: {err}")
            return []

    async def parse_detail_page(self, client: httpx.AsyncClient, href: str) -> Optional[Dict[str, Any]]:
        full_url = SOMON_DOMAIN + href if href.startswith("/") else href
        
        # Extract external ID from URL e.g. /adv/14524576_retsepshion/ -> 14524576
        id_match = re.search(r'/adv/(\d+)', href)
        if not id_match:
            return None
        external_id = id_match.group(1)

        try:
            res = await client.get(full_url)
            if res.status_code != 200:
                return None
            res.encoding = "utf-8"
            soup = BeautifulSoup(res.text, "html.parser")

            title_el = soup.select_one(".announcement-title, h1, .title")
            title = title_el.get_text(strip=True) if title_el else "Вакансия"

            price_el = soup.select_one(".announcement-price, .price-tag, .js-announcement-price, .price")
            raw_salary = price_el.get_text(strip=True) if price_el else None
            salary_min, salary_max, currency = parse_somon_salary(raw_salary)

            desc_el = soup.select_one(".announcement-description, .js-announcement-text, [itemprop='description']")
            raw_desc = desc_el.get_text("\n", strip=True) if desc_el else ""
            clean_desc = self._clean_text(raw_desc)

            author_el = soup.select_one(".announcement-author__name, .user-name, .author-name")
            employer_name = author_el.get_text(strip=True) if author_el else "Somon Работодатель"

            img_el = soup.select_one(".announcement-gallery img, .image-gallery img, img[itemprop='image']")
            logo_url = img_el["src"] if img_el and img_el.has_attr("src") else None
            if logo_url and logo_url.startswith("//"):
                logo_url = "https:" + logo_url

            chars = []
            for char_el in soup.select(".announcement-characteristics__item, .characteristics-list__item, li.char"):
                txt = char_el.get_text(" ", strip=True)
                if txt:
                    chars.append(txt)

            # Build full formatted description
            desc_parts = []
            desc_parts.append(f"🏢 Компания: {employer_name}")
            desc_parts.append(f"📍 Локация: г. Душанбе")
            if raw_salary:
                desc_parts.append(f"💰 Оплата: {raw_salary}")
            if chars:
                desc_parts.append(f"📋 Характеристики:\n• " + "\n• ".join(chars))
            
            if clean_desc:
                desc_parts.append(f"📌 Описание вакансии:\n{clean_desc}")
            
            desc_parts.append(f"\nℹ️ Вакансия импортирована с портала somon.tj")
            full_description = "\n\n".join(desc_parts)

            emp_type = map_somon_employment_type(title, clean_desc)
            cat_name = detect_somon_category(title, clean_desc)

            return {
                "external_id": external_id,
                "external_url": full_url,
                "title": title,
                "description": full_description,
                "salary_min": salary_min,
                "salary_max": salary_max,
                "currency": currency,
                "location": "г. Душанбе",
                "category": cat_name,
                "employment_type": emp_type,
                "external_company_name": employer_name,
                "external_company_logo": logo_url,
                "characteristics": chars,
                "raw_salary": raw_salary
            }
        except Exception as err:
            logger.error(f"Error parsing detail page {full_url}: {err}")
            return None

    async def fetch_and_sync(self, max_pages: int = 10, delay_seconds: float = 0.2) -> Dict[str, int]:
        stats = {
            "total_fetched": 0,
            "created": 0,
            "updated": 0,
            "errors": 0
        }

        async with httpx.AsyncClient(timeout=30.0, headers=self.headers, follow_redirects=True) as client:
            all_hrefs = []
            for page in range(1, max_pages + 1):
                hrefs = await self.fetch_item_links(client, page)
                if not hrefs:
                    break
                all_hrefs.extend(hrefs)
                await asyncio.sleep(delay_seconds)

            # Deduplicate hrefs
            unique_hrefs = list(dict.fromkeys(all_hrefs))
            stats["total_fetched"] = len(unique_hrefs)
            logger.info(f"SomonParserService: Found {len(unique_hrefs)} unique vacancy links across {max_pages} pages.")

            for href in unique_hrefs:
                try:
                    data = await self.parse_detail_page(client, href)
                    if not data:
                        stats["errors"] += 1
                        continue

                    # Check if vacancy already exists in DB by external_source & external_id
                    stmt = select(Job).where(
                        Job.external_source == "somon.tj",
                        Job.external_id == data["external_id"]
                    )
                    res = await self.session.execute(stmt)
                    existing_job = res.scalar_one_or_none()

                    if existing_job:
                        existing_job.title = data["title"]
                        existing_job.description = data["description"]
                        existing_job.salary_min = data["salary_min"]
                        existing_job.salary_max = data["salary_max"]
                        existing_job.currency = data["currency"]
                        existing_job.location = data["location"]
                        existing_job.category = data["category"]
                        existing_job.employment_type = data["employment_type"]
                        existing_job.external_company_name = data["external_company_name"]
                        existing_job.external_company_logo = data["external_company_logo"]
                        stats["updated"] += 1
                    else:
                        new_job = Job(
                            title=data["title"],
                            description=data["description"],
                            salary_min=data["salary_min"],
                            salary_max=data["salary_max"],
                            currency=data["currency"],
                            location=data["location"],
                            category=data["category"],
                            employment_type=data["employment_type"],
                            status=JobStatus.OPEN,
                            is_external=True,
                            external_source="somon.tj",
                            external_id=data["external_id"],
                            external_url=data["external_url"],
                            external_company_name=data["external_company_name"],
                            external_company_logo=data["external_company_logo"],
                            tags={"characteristics": data["characteristics"]}
                        )
                        self.session.add(new_job)
                        stats["created"] += 1

                    await self.session.commit()
                    await asyncio.sleep(delay_seconds)
                except Exception as err:
                    logger.error(f"Error syncing Somon.tj vacancy {href}: {err}")
                    await self.session.rollback()
                    stats["errors"] += 1

        logger.info(f"SomonParserService sync finished: {stats}")
        return stats
