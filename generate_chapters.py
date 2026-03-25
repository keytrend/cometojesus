"""
cometojesus.co.kr — 챕터 자동 생성 & Supabase 업로드 스크립트
사용법:
  python generate_chapters.py              # 구약 전체 (창세기 1장부터)
  python generate_chapters.py --book 창세기 --start 1 --end 10   # 특정 범위
  python generate_chapters.py --book 출애굽기                     # 특정 책 전체
  python generate_chapters.py --resume                            # 중단된 곳부터 재시작
"""

import anthropic
import os
import sys
import json
import time
import argparse
import re
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# ─────────────────────────────────────────────
# 환경 변수 로드
# ─────────────────────────────────────────────
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# ─────────────────────────────────────────────
# 구약 책 목록 (한국어 이름, 영어 이름, 장 수)
# ─────────────────────────────────────────────
OLD_TESTAMENT = [
    ("창세기",      "Genesis",         50),
    ("출애굽기",    "Exodus",          40),
    ("레위기",      "Leviticus",       27),
    ("민수기",      "Numbers",         36),
    ("신명기",      "Deuteronomy",     34),
    ("여호수아",    "Joshua",          24),
    ("사사기",      "Judges",          21),
    ("룻기",        "Ruth",             4),
    ("사무엘상",    "1 Samuel",        31),
    ("사무엘하",    "2 Samuel",        24),
    ("열왕기상",    "1 Kings",         22),
    ("열왕기하",    "2 Kings",         25),
    ("역대상",      "1 Chronicles",    29),
    ("역대하",      "2 Chronicles",    36),
    ("에스라",      "Ezra",            10),
    ("느헤미야",    "Nehemiah",        13),
    ("에스더",      "Esther",          10),
    ("욥기",        "Job",             42),
    ("시편",        "Psalms",         150),
    ("잠언",        "Proverbs",        31),
    ("전도서",      "Ecclesiastes",    12),
    ("아가",        "Song of Solomon",  8),
    ("이사야",      "Isaiah",          66),
    ("예레미야",    "Jeremiah",        52),
    ("예레미야애가","Lamentations",     5),
    ("에스겔",      "Ezekiel",         48),
    ("다니엘",      "Daniel",          12),
    ("호세아",      "Hosea",           14),
    ("요엘",        "Joel",             3),
    ("아모스",      "Amos",             9),
    ("오바댜",      "Obadiah",          1),
    ("요나",        "Jonah",            4),
    ("미가",        "Micah",            7),
    ("나훔",        "Nahum",            3),
    ("하박국",      "Habakkuk",         3),
    ("스바냐",      "Zephaniah",        3),
    ("학개",        "Haggai",           2),
    ("스가랴",      "Zechariah",       14),
    ("말라기",      "Malachi",          4),
]

# ─────────────────────────────────────────────
# 체크포인트 파일 (진행 상황 저장)
# ─────────────────────────────────────────────
CHECKPOINT_FILE = "checkpoint.json"

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": []}  # [{"book": "창세기", "chapter": 3}, ...]

def save_checkpoint(completed_list):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump({"completed": completed_list}, f, ensure_ascii=False, indent=2)

def is_completed(completed_list, book_ko, chapter_num):
    return any(c["book"] == book_ko and c["chapter"] == chapter_num for c in completed_list)

# ─────────────────────────────────────────────
# Claude API로 챕터 콘텐츠 생성
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """당신은 성경(구약·신약) 및 LDS 경전 전문 콘텐츠 작성가입니다.
요청한 성경 장에 대해 정확하고 충실한 콘텐츠를 JSON 형식으로 생성합니다.
모든 필드는 지정된 언어로 작성하되, 신학적으로 정확하고 LDS(말일성도 예수 그리스도 교회) 관점을 존중합니다.
반드시 순수 JSON만 반환하고, 마크다운 코드블록이나 설명 텍스트는 절대 포함하지 마세요."""

def build_prompt(book_ko: str, book_en: str, chapter: int) -> str:
    return f"""성경 {book_ko} ({book_en}) {chapter}장의 콘텐츠를 생성해주세요.

다음 JSON 구조를 정확히 따르세요 (모든 키 포함, 값이 없으면 빈 문자열 사용):

{{
  "key_sentence_ko": "이 장의 핵심 구절 (한국어, 30자 이내)",
  "key_sentence_en": "Key verse of this chapter (English, under 20 words)",
  "key_sentence_answers_ko": "핵심 구절의 빈칸 채우기 답안 (예: '①하나님 ②빛')",
  "key_sentence_answers_en": "Fill-in-the-blank answers for key verse (e.g. '①God ②light')",
  "characters_ko": "등장인물 목록 및 간략 설명 (한국어, 200자 이내)",
  "characters_en": "Characters list with brief descriptions (English, under 150 words)",
  "setting_ko": "배경 시대와 장소 설명 (한국어, 150자 이내)",
  "setting_en": "Time period and location (English, under 100 words)",
  "geography_ko": "관련 지명 및 지리 정보 (한국어, 150자 이내)",
  "geography_en": "Geographic locations mentioned (English, under 100 words)",
  "summary_ko": "이 장의 내용 요약 (한국어, 300자 이내)",
  "summary_en": "Chapter summary (English, under 200 words)",
  "key_events_ko": "주요 사건 목록 (한국어, 각 사건 1~2문장씩, 최대 5개)",
  "key_events_en": "Key events list (English, 1-2 sentences each, max 5 events)",
  "modern_translation_ko": "현대어 의역 요약 (한국어, 400자 이내, 쉬운 표현)",
  "modern_translation_en": "Modern paraphrase summary (English, under 250 words, simple language)",
  "divine_message_ko": "하나님의 메시지 및 영적 교훈 (한국어, 200자 이내)",
  "divine_message_en": "Divine message and spiritual lesson (English, under 150 words)",
  "historical_notes_ko": "역사적·문화적 배경 설명 (한국어, 200자 이내)",
  "historical_notes_en": "Historical and cultural context (English, under 150 words)",
  "chapter_links_ko": "이 장과 연결되는 다른 성경 구절 (한국어, 3개 이상)",
  "chapter_links_en": "Connected scriptures (English, 3+ references with brief notes)",
  "cross_references_ko": "병행 구절 및 교차 참조 (한국어)",
  "cross_references_en": "Cross-references (English)",
  "meditation_questions_ko": "묵상 질문 3가지 (한국어, 각 질문 1문장)",
  "meditation_questions_en": "3 meditation questions (English, one sentence each)",
  "quiz_ko": "이 장 관련 퀴즈 문제 3개와 답 (한국어, JSON 배열 형식: [{{\\"q\\":\\"질문\\",\\"a\\":\\"답\\"}}])",
  "quiz_en": "3 quiz questions with answers (English, JSON array: [{{\\"q\\":\\"question\\",\\"a\\":\\"answer\\"}}])",
  "unit_summary_ko": "단원 요약 (한국어, 이 장이 속한 더 큰 이야기 흐름 설명, 150자 이내)",
  "unit_summary_en": "Unit summary (English, how this chapter fits the larger narrative, under 100 words)"
}}

책: {book_ko} ({book_en})
장: {chapter}장

중요: 순수 JSON만 반환하세요. 마크다운, 설명, 주석 없이."""

def generate_chapter_content(client: anthropic.Anthropic, book_ko: str, book_en: str, chapter: int, max_retries: int = 3) -> dict:
    """Claude API를 호출해 챕터 콘텐츠를 생성합니다."""
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-opus-4-5",
                max_tokens=4000,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": build_prompt(book_ko, book_en, chapter)}
                ]
            )
            raw = response.content[0].text.strip()

            # 혹시 마크다운 코드블록이 있으면 제거
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            data = json.loads(raw)
            return data

        except json.JSONDecodeError as e:
            print(f"  ⚠️  JSON 파싱 오류 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
        except anthropic.RateLimitError:
            wait = 60 * (attempt + 1)
            print(f"  ⏳ Rate limit — {wait}초 대기...")
            time.sleep(wait)
        except Exception as e:
            print(f"  ❌ API 오류 (시도 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(10)

    raise RuntimeError(f"{book_ko} {chapter}장 생성 실패 (최대 재시도 초과)")

# ─────────────────────────────────────────────
# Supabase 업로드
# ─────────────────────────────────────────────
def get_book_id(supabase: Client, book_ko: str) -> int | None:
    """books 테이블에서 book_id를 가져옵니다."""
    result = supabase.table("books").select("id").eq("name_ko", book_ko).execute()
    if result.data:
        return result.data[0]["id"]
    # title_ko가 없으면 name 컬럼 시도
    result = supabase.table("books").select("id").eq("name", book_ko).execute()
    if result.data:
        return result.data[0]["id"]
    return None

def upload_chapter(supabase: Client, book_id: int, chapter_num: int, content: dict) -> bool:
    """chapters 테이블에 데이터를 upsert합니다."""
    row = {
        "book_id": book_id,
        "chapter_number": chapter_num,
        **content
    }
    try:
        supabase.table("chapters").upsert(row, on_conflict="book_id,chapter_number").execute()
        return True
    except Exception as e:
        print(f"  ❌ 업로드 오류: {e}")
        return False

# ─────────────────────────────────────────────
# 메인 실행
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="cometojesus 챕터 자동 생성 및 업로드")
    parser.add_argument("--book",   type=str, help="특정 책 이름 (한국어, 예: 창세기)")
    parser.add_argument("--start",  type=int, default=1, help="시작 장 번호 (기본값: 1)")
    parser.add_argument("--end",    type=int, default=None, help="끝 장 번호 (기본값: 마지막 장)")
    parser.add_argument("--resume", action="store_true", help="체크포인트에서 재시작")
    parser.add_argument("--delay",  type=float, default=3.0, help="API 호출 사이 대기 시간(초), 기본 3초")
    parser.add_argument("--dry-run", action="store_true", help="생성만 하고 업로드 안 함 (테스트용)")
    args = parser.parse_args()

    # 환경 변수 확인
    missing = []
    if not SUPABASE_URL:   missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:   missing.append("SUPABASE_SERVICE_KEY")
    if not ANTHROPIC_API_KEY: missing.append("ANTHROPIC_API_KEY")
    if missing:
        print(f"❌ .env 파일에 다음 변수가 없습니다: {', '.join(missing)}")
        sys.exit(1)

    # 클라이언트 초기화
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 체크포인트 로드
    checkpoint = load_checkpoint()
    completed = checkpoint["completed"]

    # 처리할 책 목록 결정
    if args.book:
        books_to_process = [b for b in OLD_TESTAMENT if b[0] == args.book]
        if not books_to_process:
            print(f"❌ 책 '{args.book}'을 찾을 수 없습니다.")
            print("사용 가능한 책:", [b[0] for b in OLD_TESTAMENT])
            sys.exit(1)
    else:
        books_to_process = OLD_TESTAMENT

    total_chapters = sum(
        len(range(args.start, (args.end or b[2]) + 1)) for b in books_to_process
    )
    processed = 0
    skipped = 0
    errors = []

    print(f"\n{'='*60}")
    print(f"  cometojesus 챕터 생성 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  대상 책: {len(books_to_process)}권 / 총 챕터: {total_chapters}장")
    print(f"  모드: {'DRY RUN (업로드 안 함)' if args.dry_run else '실제 업로드'}")
    print(f"{'='*60}\n")

    for book_ko, book_en, total_ch in books_to_process:
        # book_id 조회
        book_id = None
        if not args.dry_run:
            book_id = get_book_id(supabase_client, book_ko)
            if book_id is None:
                print(f"⚠️  '{book_ko}' — books 테이블에서 book_id를 찾을 수 없습니다. 건너뜁니다.")
                continue

        start_ch = args.start
        end_ch = args.end if args.end else total_ch

        print(f"\n📖 {book_ko} ({book_en}) — {start_ch}~{end_ch}장 (book_id={book_id})")

        for ch in range(start_ch, end_ch + 1):
            # 이미 완료된 챕터면 건너뜀
            if args.resume and is_completed(completed, book_ko, ch):
                print(f"  ⏭️  {book_ko} {ch}장 — 이미 완료, 건너뜀")
                skipped += 1
                continue

            print(f"  ⚙️  {book_ko} {ch}장 생성 중...", end=" ", flush=True)
            start_time = time.time()

            try:
                content = generate_chapter_content(anthropic_client, book_ko, book_en, ch)
                elapsed = time.time() - start_time
                print(f"✅ 생성 완료 ({elapsed:.1f}s)", end="")

                if not args.dry_run:
                    ok = upload_chapter(supabase_client, book_id, ch, content)
                    if ok:
                        print(" → ☁️  업로드 완료")
                        completed.append({"book": book_ko, "chapter": ch})
                        save_checkpoint(completed)
                    else:
                        print(" → ❌ 업로드 실패")
                        errors.append(f"{book_ko} {ch}장 업로드 실패")
                else:
                    print(f" → 🔍 DRY RUN (업로드 생략)")
                    print(f"     샘플 — key_sentence_ko: {content.get('key_sentence_ko', '')[:60]}")

                processed += 1

            except Exception as e:
                print(f"\n  ❌ 오류: {e}")
                errors.append(f"{book_ko} {ch}장: {e}")
                # 오류가 나도 계속 진행
                time.sleep(10)
                continue

            # API 과부하 방지
            time.sleep(args.delay)

    # 완료 요약
    print(f"\n{'='*60}")
    print(f"  완료: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  생성: {processed}장 / 건너뜀: {skipped}장 / 오류: {len(errors)}건")
    if errors:
        print(f"\n  오류 목록:")
        for e in errors:
            print(f"    - {e}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
