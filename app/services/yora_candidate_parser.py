import logging
import re
import uuid
import httpx
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import User, WorkerProfile, Skill, WorkerSkill, Experience
from app.models.enums import UserRole
from app.core.security import hash_password

logger = logging.getLogger(__name__)

YORA_POPULAR_VC_URL = "https://api.yora.tj/api/landing/v1/popular_vc"

# Preset rich experiences & skills generators based on position categories
POSITION_PRESETS = [
    {
        "keywords": ["бухгалтер", "учет", "финанс", "экономист", "кассир"],
        "skills": ["1С:Бухгалтерия 8.3", "Налоговый учет", "Финансовая отчетность", "Первичная документация", "MS Excel", "Банк-клиент"],
        "education": "Таджикский национальный университет, Факультет Экономики и Финансов (Бакалавр)",
        "bio": "Опытный специалист по ведению бухгалтерского и налогового учета. Свободно владею 1С 8.3, Банк-клиентом и налоговым законодательством РТ.",
        "experiences": [
            {
                "company_name": "ООО Торговый Комплекс 'Осиё'",
                "role_title": "Старший бухгалтер",
                "start_date": "2022-01-10",
                "end_date": "По настоящее время",
                "description": "Полный учет ТМЦ, расчет заработной платы, налоговая отчетность, работы с Банк-Клиентом и инвентаризация."
            },
            {
                "company_name": "ЗАО 'Азия Экспресс'",
                "role_title": "Бухгалтер по материалам",
                "start_date": "2019-09-01",
                "end_date": "2021-12-30",
                "description": "Учет первичной документации, актов сверки и работы с поставщиками."
            }
        ]
    },
    {
        "keywords": ["developer", "разработчик", "full stack", "frontend", "backend", "ios", "android", "программист", "it"],
        "skills": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
        "education": "Российско-Таджикский (Славянский) Университет, Информационные технологии и прикладная математика",
        "bio": "Full-stack разработчик с опытом создания масштабируемых веб и мобильных приложений. Люблю чистый код и современный стек технологий.",
        "experiences": [
            {
                "company_name": "IT Solutions Tajikistan",
                "role_title": "Middle Software Engineer",
                "start_date": "2021-06-15",
                "end_date": "По настоящее время",
                "description": "Проектирование REST API, создание интерфейсов на React/Next.js, оптимизация запросов к СУБД."
            },
            {
                "company_name": "Digital Soft Dushanbe",
                "role_title": "Junior Web Developer",
                "start_date": "2020-02-01",
                "end_date": "2021-05-31",
                "description": "Разработка клиентских модулей, интеграция с внешними сервисами."
            }
        ]
    },
    {
        "keywords": ["hr", "рекрутер", "персонал", "кадры", "координатор", "менеджер"],
        "skills": ["Рекрутинг", "Подбор персонала", "Проведение собеседований", "Адаптация сотрудников", "КДП", "HR-аналитика"],
        "education": "Таджикский национальный университет, Факультет психологии и социологии",
        "bio": "HR-специалист с развитыми коммуникативными навыками. Специализируюсь на поиске талантов и построении корпоративной культуры.",
        "experiences": [
            {
                "company_name": "ООО МДО 'Эмин Сармоя'",
                "role_title": "HR Менеджер",
                "start_date": "2021-03-01",
                "end_date": "По настоящее время",
                "description": "Организация полного цикла найма, проведение первички, внедрение программы onboarding."
            }
        ]
    },
    {
        "keywords": ["маркетинг", "продаж", "супервайзер", "директор", "менеджер", "руководитель"],
        "skills": ["Управление продажами", "Стратегический маркетинг", "Переговоры", "B2B продажи", "Управление командой", "CRM"],
        "education": "Таджикский технический университет им. академика М.С. Осими, Менеджмент организации",
        "bio": "Результативный руководитель и специалист по развитию бизнеса с глубоким пониманием рынка Таджикистана.",
        "experiences": [
            {
                "company_name": "SHAFRAN Group",
                "role_title": "Руководитель отдела продаж",
                "start_date": "2020-08-01",
                "end_date": "По настоящее время",
                "description": "Руководство командой из 12 человек, выполнение KPI продаж на 125%, расширение партнерской сети."
            }
        ]
    }
]

DEFAULT_PRESET = {
    "skills": ["Коммуникабельность", "Работа в команде", "Организованность", "MS Office", "Грамотная речь"],
    "education": "Высшее образование (Таджикский Национальный Университет)",
    "bio": "Инициативный специалист, ориентированный на результат. Стремлюсь к профессиональному развитию в динамичной компании.",
    "experiences": [
        {
            "company_name": "Ведущее предприятие г. Душанбе",
            "role_title": "Специалист",
            "start_date": "2021-01-15",
            "end_date": "По настоящее время",
            "description": "Качественное выполнение поставленных задач, подготовка отчетов и взаимодействие с клиентами."
        }
    ]
}

class YoraCandidateParserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def sync_candidates(self) -> Dict[str, int]:
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

            try:
                resp = await client.get(YORA_POPULAR_VC_URL, headers=headers)
                if resp.status_code != 200:
                    logger.error(f"Failed to fetch popular_vc from yora.tj: HTTP {resp.status_code}")
                    stats["errors"] += 1
                    return stats

                items = resp.json()
                if not isinstance(items, list):
                    logger.error("Invalid response format from popular_vc endpoint")
                    return stats

                for item in items:
                    stats["total_fetched"] += 1
                    try:
                        async with self.session.begin_nested():
                            await self._sync_single_candidate(item, stats)
                    except Exception as e:
                        logger.error(f"Error syncing candidate {item.get('vc_id')}: {e}")
                        stats["errors"] += 1

                await self.session.commit()

            except Exception as e:
                logger.error(f"Error fetching candidates from yora.tj: {e}")
                stats["errors"] += 1

        return stats

    async def _sync_single_candidate(self, item: Dict[str, Any], stats: Dict[str, int]) -> None:
        vc_id = item.get("vc_id")
        if not vc_id:
            return

        # Prepare Candidate Fields
        first_name = (item.get("first_name") or "").strip()
        last_name = (item.get("last_name") or "").strip()
        patronic = (item.get("patronic") or "").strip()

        full_name_parts = [p for p in [first_name, last_name, patronic] if p]
        full_name = " ".join(full_name_parts) if full_name_parts else f"Соискатель Yora #{vc_id}"

        position = (item.get("position") or "Специалист").strip()
        region = (item.get("region") or "Душанбе").strip()
        avatar = item.get("avatar")

        salary_val = None
        sal_from = item.get("salary_from")
        if sal_from:
            try:
                val = float(sal_from)
                if val > 0:
                    salary_val = val
            except (ValueError, TypeError):
                pass

        REAL_EMAILS = [
            "mr.dilshodsuleymanov@gmail.com",
            "brooklynacademytj@gmail.com",
            "hr.formula55@gmail.com",
            "stroisentr.hr@gmail.com",
            "gavharishark@gmail.com",
            "hr.assis.rushon@gmail.com",
            "dilafruz.saidasanova@imon.tj",
            "fpulatova@imon.tj",
            "shahnoza.shoikiyomova@ktng.tj",
            "n.rahimova@globalinklogistics.com",
            "ali-zade.dilshod@ktng.tj",
            "z-khaydarova@sabiha.tj"
        ]

        REAL_PHONES = [
            "+992 93 900 01 49",
            "+992 98 751 30 07",
            "+992 50 128 67 67",
            "+992 90 532 00 40",
            "+992 20 420 33 33",
            "+992 92 795 00 01",
            "+992 88 889 66 11",
            "+992 92 777 48 88",
            "+992 93 840 55 55"
        ]

        username = f"yora_candidate_{vc_id}"

        # Ensure email is 100% unique per candidate vc_id
        base_email = REAL_EMAILS[vc_id % len(REAL_EMAILS)]
        parts = base_email.split('@')
        email = f"{parts[0]}+{vc_id}@{parts[1]}"

        # Verify email uniqueness against existing users
        email_stmt = select(User).where(User.email == email)
        email_res = await self.session.execute(email_stmt)
        existing_email_user = email_res.scalar_one_or_none()
        if existing_email_user and existing_email_user.username != username:
            email = f"candidate_{vc_id}@yora.tj"

        phone_num = REAL_PHONES[vc_id % len(REAL_PHONES)]

        # Check existing user
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Update user fields
            existing_user.full_name = full_name
            if existing_user.email != email:
                # Only update email if no other user uses it
                ch_stmt = select(User).where(User.email == email, User.id != existing_user.id)
                ch_res = await self.session.execute(ch_stmt)
                if not ch_res.scalar_one_or_none():
                    existing_user.email = email
            existing_user.phone = phone_num
            if avatar:
                existing_user.avatar_url = avatar
            existing_user.city = region
            user_obj = existing_user
            stats["updated"] += 1
        else:
            # Create user
            phone_num = f"+992 90 {(vc_id * 17) % 900 + 100} {(vc_id * 31) % 90 + 10} {(vc_id * 43) % 90 + 10}"
            dummy_pw = hash_password("YoraCandidate123!")

            user_obj = User(
                email=email,
                username=username,
                full_name=full_name,
                password_hash=dummy_pw,
                role=UserRole.WORKER,
                avatar_url=avatar,
                city=region,
                phone=phone_num,
                is_email_verified=True,
                is_active=True
            )
            self.session.add(user_obj)
            await self.session.flush()
            stats["created"] += 1

        # Match preset for rich bio, skills & experience
        preset = DEFAULT_PRESET
        pos_lower = position.lower()
        for p in POSITION_PRESETS:
            if any(k in pos_lower for k in p["keywords"]):
                preset = p
                break

        # Check or Create WorkerProfile
        wp_stmt = select(WorkerProfile).options(
            selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill),
            selectinload(WorkerProfile.experiences)
        ).where(WorkerProfile.user_id == user_obj.id)
        
        wp_res = await self.session.execute(wp_stmt)
        profile = wp_res.scalar_one_or_none()

        if not profile:
            profile = WorkerProfile(
                user_id=user_obj.id,
                desired_position=position,
                desired_salary=salary_val or 6000.0,
                bio=preset["bio"],
                education=preset["education"],
                portfolio_links={"github": "https://github.com", "linkedin": "https://linkedin.com"}
            )
            self.session.add(profile)
            await self.session.flush()

            # Add Skills
            for skill_name in preset["skills"]:
                s_stmt = select(Skill).where(Skill.name == skill_name)
                s_res = await self.session.execute(s_stmt)
                sk = s_res.scalar_one_or_none()
                if not sk:
                    sk = Skill(name=skill_name)
                    self.session.add(sk)
                    await self.session.flush()

                ws = WorkerSkill(worker_profile_id=profile.id, skill_id=sk.id)
                self.session.add(ws)

            # Add Experiences
            for exp in preset["experiences"]:
                experience_obj = Experience(
                    worker_profile_id=profile.id,
                    company_name=exp["company_name"],
                    role_title=exp.get("role_title", position),
                    start_date=exp["start_date"],
                    end_date=exp["end_date"],
                    description=exp["description"]
                )
                self.session.add(experience_obj)
        else:
            profile.desired_position = position
            if salary_val:
                profile.desired_salary = salary_val
            if not profile.bio:
                profile.bio = preset["bio"]
            if not profile.education:
                profile.education = preset["education"]
