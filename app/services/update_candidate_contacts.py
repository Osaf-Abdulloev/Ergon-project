import asyncio
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.domain import User

REAL_EMAILS_FROM_YORA = [
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
    "z-khaydarova@sabiha.tj",
    "eric.serra@mail.ru",
    "n.muhsin@marmari.tj",
    "stroy.center.hr@gmail.com",
    "multikidbridge@gmail.com",
    "n-saydulloeva@ag-group.tj",
    "k.masrur@globalinklogistics.com"
]

REAL_PHONES_FROM_YORA = [
    "+992 93 900 01 49",
    "+992 98 751 30 07",
    "+992 50 128 67 67",
    "+992 90 532 00 40",
    "+992 20 420 33 33",
    "+992 92 795 00 01",
    "+992 88 889 66 11",
    "+992 92 777 48 88",
    "+992 93 840 55 55",
    "+992 98 710 52 59",
    "+992 30 030 03 60",
    "+992 75 577 77 41",
    "+992 99 444 04 21",
    "+992 93 301 05 46"
]

async def update_real_contacts():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.username.like("yora_candidate_%"))
        res = await session.execute(stmt)
        candidates = res.scalars().all()

        for idx, user in enumerate(candidates):
            user.email = REAL_EMAILS_FROM_YORA[idx % len(REAL_EMAILS_FROM_YORA)]
            user.phone = REAL_PHONES_FROM_YORA[idx % len(REAL_PHONES_FROM_YORA)]
            print(f"Updated [{user.full_name}] => Email: {user.email} | Phone: {user.phone}")

        await session.commit()
        print("Done!")
