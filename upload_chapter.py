"""
upload_chapter.py
─────────────────────────────────────────────────
Claude가 생성한 장(chapter) 콘텐츠를 Supabase에 자동 업로드하는 스크립트

사용법:
  pip install supabase python-dotenv
  python upload_chapter.py

준비:
  .env 파일에 아래 두 줄 작성:
    SUPABASE_URL=https://xxxxxxxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJhbGci...  (service_role key — Settings > API)
"""

import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# ── 1. 책(book) ID 조회 헬퍼 ─────────────────────────────
def get_book_id(book_name_ko: str) -> int:
    res = supabase.table("books").select("id").eq("name_ko", book_name_ko).single().execute()
    if res.data:
        return res.data["id"]
    raise ValueError(f"책을 찾을 수 없습니다: {book_name_ko}")


# ── 2. 장 콘텐츠 업로드 함수 ─────────────────────────────
def upload_chapter(book_name_ko: str, chapter_number: int, content: dict):
    book_id = get_book_id(book_name_ko)

    row = {"book_id": book_id, "chapter_number": chapter_number, **content}

    # upsert: 이미 존재하면 업데이트, 없으면 insert
    res = (
        supabase.table("chapters")
        .upsert(row, on_conflict="book_id,chapter_number")
        .execute()
    )
    print(f"  ✓ {book_name_ko} {chapter_number}장 업로드 완료")
    return res


# ── 3. 사용 예시 ─────────────────────────────────────────
# Claude가 생성한 내용을 아래 딕셔너리 형식으로 붙여넣으세요.

genesis_47 = {
    "key_sentence_ko": "하나님은 [①]과 죽음의 위기 속에서도 [②]을 통해 민족을 지키시고, 야곱의 마지막 [③]을 통해 [④]을 향한 소망을 [⑤]로 이어가셨다.",
    "key_sentence_answers_ko": ["기근", "요셉", "믿음", "언약의 땅", "다음 세대"],
    "key_sentence_en": "God protected his people even through [①] and death, using [②], and passed hope toward [④] through Jacob's final [③] to [⑤].",
    "key_sentence_answers_en": ["famine", "Joseph", "faith", "the promised land", "the next generation"],

    "summary_ko": "요셉은 가족을 이끌고 애굽 왕 바로를 알현하여 고센 땅 정착을 허락받는다. 이후 극심한 기근 속에서 탁월한 국가 경영을 통해 애굽 백성의 돈, 가축, 토지를 모두 바로에게 귀속시키고, 수확의 5분의 1을 세금으로 내는 제도를 확립한다. 야곱은 애굽에서 17년을 살다가 임종이 가까워지자 요셉에게 자신을 가나안 조상의 묘에 묻어달라고 간청하며 맹세를 받는다.",
    "summary_en": "Joseph presents his family to Pharaoh and secures their settlement in Goshen. During the famine he transfers the money, livestock, and land of Egypt to Pharaoh establishing a 20% harvest tax. The dying Jacob makes Joseph swear to bury him in Canaan.",

    "original_text": "요셉이 바로에게 가서 고하되 나의 아버지와 형들과 그들의 양과 소와 모든 소유가 가나안 땅에서 와서 고센 땅에 있나이다...",

    "characters_ko": [
        {"name": "요셉", "role": "야곱의 11번째 아들 · 애굽 총리"},
        {"name": "야곱", "role": "요셉의 아버지 · 입국 시 130세 · 임종 시 147세"},
        {"name": "바로", "role": "애굽 왕 · 요셉에게 전권 위임"},
    ],
    "characters_en": [
        {"name": "Joseph", "role": "11th son of Jacob · Prime Minister of Egypt"},
        {"name": "Jacob", "role": "Joseph's father · Age 130 on arrival · 147 at death"},
        {"name": "Pharaoh", "role": "King of Egypt · Delegated full authority to Joseph"},
    ],

    "setting_ko": "애굽 고센 땅(라암셋) · 바로의 궁 · 7년 기근 중반기",
    "setting_en": "Land of Goshen (Rameses), Egypt · Pharaoh's palace · Mid-point of the 7-year famine",

    "key_events_ko": [
        {"num": 1, "title": "야곱 가족의 고센 정착", "desc": "요셉의 주선으로 야곱 가족이 바로를 알현하고 고센(라암셋)에 정착 허가를 받는다."},
        {"num": 2, "title": "국가 경영 — 돈 → 가축 → 토지", "desc": "단계적으로 돈, 가축, 토지를 바로에게 귀속시키고 5분의 1 세제를 확립한다."},
        {"num": 3, "title": "야곱의 마지막 유언", "desc": "147세 야곱이 가나안 조상의 묘에 묻어달라는 맹세를 요셉에게 받는다."},
    ],
    "key_events_en": [
        {"num": 1, "title": "Settlement in Goshen", "desc": "Jacob's family meets Pharaoh and receives permission to settle in Goshen."},
        {"num": 2, "title": "Economic Policy", "desc": "Joseph gradually transfers money, livestock, and land to Pharaoh, establishing a 20% tax."},
        {"num": 3, "title": "Jacob's Final Request", "desc": "The dying Jacob (147) makes Joseph swear to bury him in Canaan."},
    ],

    "modern_translation_ko": [
        {"subtitle": "요셉 가족, 바로를 만나다", "text": "요셉이 바로에게 나아가 아뢰었다. \"제 아버지와 형들이 양과 소와 모든 재산을 이끌고 가나안 땅에서 와서 지금 고센 땅에 머물고 있습니다.\""},
        {"subtitle": "야곱, 바로 앞에 서다", "text": "야곱이 바로에게 축복을 빌었다. 바로가 물었다. \"연세가 어떻게 되십니까?\" 야곱이 대답했다. \"나그네로 살아온 세월이 130년입니다.\""},
    ],
    "modern_translation_en": [
        {"subtitle": "Joseph's Family Meets Pharaoh", "text": "Joseph said to Pharaoh, 'My father and brothers have come from Canaan with their flocks and herds. They are now in Goshen.'"},
        {"subtitle": "Jacob Before Pharaoh", "text": "Jacob blessed Pharaoh, who asked, 'How old are you?' Jacob replied, 'I have been a pilgrim for 130 years.'"},
    ],

    "divine_message_ko": {
        "theme": "고난 속에서도 하나님의 언약은 흔들리지 않는다",
        "rows": [
            {"key": "섭리", "val": "기근이라는 최악의 위기가 오히려 이스라엘 민족을 보호하고 번성케 하는 통로가 됨"},
            {"key": "신실하심", "val": "야곱이 죽어가면서도 가나안 땅을 포기하지 않음 — 약속의 땅을 향한 끝까지의 믿음"},
            {"key": "청지기", "val": "요셉은 권력을 백성을 살리는 도구로 사용"},
        ],
    },
    "divine_message_en": {
        "theme": "Even in suffering, God's covenant does not waver",
        "rows": [
            {"key": "Providence", "val": "The famine becomes the very means by which God protects and multiplies Israel"},
            {"key": "Faithfulness", "val": "Jacob's refusal to abandon hope in Canaan reflects trust in God's promise"},
            {"key": "Stewardship", "val": "Joseph uses his power to save the people, not for personal gain"},
        ],
    },

    "historical_notes_ko": [
        {"title": "고센 땅 (라암셋 지역)", "desc": "현재 이집트 나일강 삼각주 동부. 텔 엘-답바 유적에서 가나안계 셈족 문화층이 발굴됨."},
        {"title": "수확의 5분의 1 세제", "desc": "20%는 고대 근동 기준으로 합리적인 세율. 본문은 이 법이 오늘날까지 유효하다고 명시함."},
        {"title": "허벅지 아래 맹세", "desc": "고대 족장 사회에서 가장 엄숙한 계약 형식 (창 24:2와 동일)."},
    ],
    "historical_notes_en": [
        {"title": "Land of Goshen (Rameses)", "desc": "Located in the eastern Nile Delta. Semitic Canaanite settlement confirmed at Tell el-Dab'a."},
        {"title": "20% Harvest Tax", "desc": "A reasonable rate by ancient Near Eastern standards. The text states this law endures to the present day."},
        {"title": "Oath on the Thigh", "desc": "The most solemn form of covenant in patriarchal society (same as Gen 24:2)."},
    ],

    "chapter_links_ko": {
        "prev": {"num": 46, "desc": "야곱 가족의 가나안 → 애굽 이주 여정"},
        "current": "고센 정착 · 국가 경영 · 야곱의 유언",
        "next": {"num": 48, "desc": "야곱이 에브라임과 므낫세를 축복함"},
        "transition": "47장은 야곱 가족의 정착을 완성하고, 야곱의 임종(48-49장)을 예비하는 전환점이다.",
    },
    "chapter_links_en": {
        "prev": {"num": 46, "desc": "Jacob's family journeys from Canaan to Egypt"},
        "current": "Settlement in Goshen · Economic policy · Jacob's final wish",
        "next": {"num": 48, "desc": "Jacob blesses Ephraim and Manasseh"},
        "transition": "Ch.47 completes the family's settlement and prepares for Jacob's death in Ch.48-49.",
    },

    "cross_references_ko": [
        {"canon": "신약전서", "ref": "사도행전 7:14-15", "desc": "스데반의 설교에서 야곱의 애굽 이주와 죽음을 언급"},
        {"canon": "히브리서", "ref": "히브리서 11:21", "desc": "야곱이 죽을 때 경배함 — 믿음의 영웅으로 기록"},
        {"canon": "몰몬경", "ref": "니파이후서 3:4-7", "desc": "요셉의 후손에서 예언자가 나온다는 약속"},
    ],
    "cross_references_en": [
        {"canon": "New Testament", "ref": "Acts 7:14-15", "desc": "Stephen's speech references Jacob's move to Egypt"},
        {"canon": "Hebrews", "ref": "Hebrews 11:21", "desc": "Jacob worshipped as he died — recorded as a hero of faith"},
        {"canon": "Book of Mormon", "ref": "2 Nephi 3:4-7", "desc": "Promise that a prophet would arise from Joseph's descendants"},
    ],

    "meditation_questions_ko": [
        "기근 같은 위기가 오히려 나의 삶에서 축복의 통로가 된 경험이 있나요?",
        "나에게 주어진 능력을 청지기처럼 이웃을 위해 사용하고 있나요?",
        "삶을 마무리할 때 어떤 믿음의 고백을 남기고 싶은가요?",
    ],
    "meditation_questions_en": [
        "Have you experienced a crisis that became an unexpected blessing?",
        "Are you using your abilities as a steward — for others, not just yourself?",
        "What confession of faith do you want to leave behind at the end of your life?",
    ],

    "quiz_ko": [
        {"q": "야곱이 바로에게 말한 나이는?", "opts": ["110세","120세","130세","140세","147세"], "ans": 2, "exp": "야곱은 130년이라고 대답했습니다 (창 47:9)."},
        {"q": "요셉이 거두어들인 순서로 올바른 것은?", "opts": ["가축→돈→토지","토지→가축→돈","돈→토지→가축","돈→가축→토지","가축→토지→돈"], "ans": 3, "exp": "돈 → 가축 → 토지 순입니다 (창 47:14-20)."},
        {"q": "요셉이 제정한 세율은?", "opts": ["10분의 1","8분의 1","5분의 1","4분의 1","3분의 1"], "ans": 2, "exp": "수확의 5분의 1(20%)입니다 (창 47:24)."},
        {"q": "야곱이 임종을 맞이한 나이는?", "opts": ["130세","137세","140세","145세","147세"], "ans": 4, "exp": "147세입니다 (창 47:28)."},
        {"q": "야곱이 요셉에게 맹세하게 한 것은?", "opts": ["요셉이 왕이 되게 하라","고센 땅에 묻어달라","형들을 내보내라","가나안 조상의 묘에 묻어달라","유산을 나누어 주라"], "ans": 3, "exp": "가나안 조상의 묘에 묻어달라고 했습니다 (창 47:29-30)."},
    ],
    "quiz_en": [
        {"q": "How old did Jacob say he was?", "opts": ["110","120","130","140","147"], "ans": 2, "exp": "Jacob said he had been a pilgrim for 130 years (Gen 47:9)."},
        {"q": "In what order did Joseph collect resources?", "opts": ["Livestock→Money→Land","Land→Livestock→Money","Money→Land→Livestock","Money→Livestock→Land","Livestock→Land→Money"], "ans": 3, "exp": "Money, then livestock, then land (Gen 47:14-20)."},
        {"q": "What percentage was the harvest tax?", "opts": ["10%","12.5%","20%","25%","33%"], "ans": 2, "exp": "One-fifth (20%) of the harvest (Gen 47:24)."},
        {"q": "How old was Jacob when he died?", "opts": ["130","137","140","145","147"], "ans": 4, "exp": "Jacob died at age 147 (Gen 47:28)."},
        {"q": "What did Jacob ask Joseph to swear?", "opts": ["Make Joseph king","Bury him in Goshen","Send brothers home","Bury him in Canaan","Divide the inheritance"], "ans": 3, "exp": "Jacob asked to be buried with his ancestors in Canaan (Gen 47:29-30)."},
    ],

    "unit_summary_ko": {
        "range": "창세기 43-47장",
        "chapters": ["창 43장", "창 44장", "창 45장", "창 46장", "창 47장"],
        "message": "형들이 베냐민을 데리고 내려오면서 시작된 화해의 실마리는 유다의 간청, 요셉의 자기 계시, 야곱 가족의 이주를 거쳐 고센 정착으로 완성된다. 핵심: 하나님의 섭리는 인간의 가장 큰 죄도 구속의 도구로 만든다.",
        "next_unit": "창세기 48-50장 — 야곱의 축복과 임종, 요셉의 마지막 유언",
    },
    "unit_summary_en": {
        "range": "Genesis 43-47",
        "chapters": ["Gen 43", "Gen 44", "Gen 45", "Gen 46", "Gen 47"],
        "message": "The reconciliation begun when the brothers bring Benjamin to Egypt is completed through Judah's plea, Joseph's self-revelation, and the family's settlement in Goshen. Core: God's providence can turn even the worst human sin into an instrument of redemption.",
        "next_unit": "Genesis 48-50 — Jacob's blessings, death, and Joseph's final vow",
    },
}

# ── 실행 ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("창세기 47장 업로드 중...")
    upload_chapter("창세기", 47, genesis_47)
    print("\n완료! Supabase Table Editor에서 확인하세요.")
