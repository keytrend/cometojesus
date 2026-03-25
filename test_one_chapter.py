"""
테스트용: 창세기 1장 하나만 생성해서 콘솔 출력 (업로드 안 함)
Supabase 연결도 확인합니다.
"""
import os, json, sys, anthropic, re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

def check_env():
    missing = [k for k, v in {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_KEY,
        "ANTHROPIC_API_KEY": ANTHROPIC_API_KEY
    }.items() if not v]
    if missing:
        print(f"❌ .env 누락: {missing}")
        sys.exit(1)
    print("✅ 환경 변수 OK")

def check_supabase():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    books = sb.table("books").select("id, name_ko").limit(3).execute()
    print(f"✅ Supabase 연결 OK — books 샘플: {books.data}")
    
    # 창세기 book_id 확인
    res = sb.table("books").select("id").eq("name_ko", "창세기").execute()
    if res.data:
        print(f"✅ 창세기 book_id = {res.data[0]['id']}")
    else:
        print(f"⚠️  창세기를 찾지 못했습니다.")
    return sb

def generate_one():
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    print("\n⚙️  창세기 1장 생성 중...")
    
    prompt = """성경 창세기 (Genesis) 1장의 콘텐츠를 생성해주세요.
다음 JSON 구조를 정확히 따르세요:

{
  "key_sentence_ko": "이 장의 핵심 구절 (한국어, 30자 이내)",
  "key_sentence_en": "Key verse (English, under 20 words)",
  "key_sentence_answers_ko": "핵심 구절 빈칸 답안",
  "key_sentence_answers_en": "Fill-in-the-blank answers",
  "characters_ko": "등장인물 (200자 이내)",
  "characters_en": "Characters (under 150 words)",
  "setting_ko": "배경 (150자 이내)",
  "setting_en": "Setting (under 100 words)",
  "geography_ko": "지리 정보 (150자 이내)",
  "geography_en": "Geography (under 100 words)",
  "summary_ko": "내용 요약 (300자 이내)",
  "summary_en": "Summary (under 200 words)",
  "key_events_ko": "주요 사건 (최대 5개)",
  "key_events_en": "Key events (max 5)",
  "modern_translation_ko": "현대어 의역 (400자 이내)",
  "modern_translation_en": "Modern paraphrase (under 250 words)",
  "divine_message_ko": "하나님의 메시지 (200자 이내)",
  "divine_message_en": "Divine message (under 150 words)",
  "historical_notes_ko": "역사적 배경 (200자 이내)",
  "historical_notes_en": "Historical notes (under 150 words)",
  "chapter_links_ko": "연결 구절 (3개 이상)",
  "chapter_links_en": "Connected scriptures (3+)",
  "cross_references_ko": "병행 구절",
  "cross_references_en": "Cross-references",
  "meditation_questions_ko": "묵상 질문 3가지",
  "meditation_questions_en": "3 meditation questions",
  "quiz_ko": "[{\\"q\\":\\"질문\\",\\"a\\":\\"답\\"}] 형식 3개",
  "quiz_en": "[{\\"q\\":\\"question\\",\\"a\\":\\"answer\\"}] 3 items",
  "unit_summary_ko": "단원 요약 (150자 이내)",
  "unit_summary_en": "Unit summary (under 100 words)"
}

순수 JSON만 반환하세요."""

    resp = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4000,
        system="당신은 성경 콘텐츠 전문가입니다. 순수 JSON만 반환하세요.",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    
    data = json.loads(raw)
    print("✅ 생성 성공! 샘플:")
    for key in ["key_sentence_ko", "summary_ko", "divine_message_ko"]:
        print(f"  {key}: {str(data.get(key,''))[:80]}")
    print(f"\n전체 키 수: {len(data)}")
    
    # 예상 키 목록과 비교
    expected = [
        "key_sentence_ko","key_sentence_en","key_sentence_answers_ko","key_sentence_answers_en",
        "characters_ko","characters_en","setting_ko","setting_en","geography_ko","geography_en",
        "summary_ko","summary_en","key_events_ko","key_events_en","modern_translation_ko",
        "modern_translation_en","divine_message_ko","divine_message_en","historical_notes_ko",
        "historical_notes_en","chapter_links_ko","chapter_links_en","cross_references_ko",
        "cross_references_en","meditation_questions_ko","meditation_questions_en",
        "quiz_ko","quiz_en","unit_summary_ko","unit_summary_en"
    ]
    missing = [k for k in expected if k not in data]
    if missing:
        print(f"⚠️  누락 키: {missing}")
    else:
        print("✅ 모든 컬럼 키 포함 확인")
    
    return data

if __name__ == "__main__":
    check_env()
    sb = check_supabase()
    data = generate_one()
    
    print("\n" + "="*50)
    print("테스트 완료! 실제 실행하려면:")
    print("  python generate_chapters.py")
    print("  python generate_chapters.py --book 창세기 --start 1 --end 5")
    print("  python generate_chapters.py --resume   (중단 후 재시작)")
