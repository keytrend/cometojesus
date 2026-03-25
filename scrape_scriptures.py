#!/usr/bin/env python3
"""
scrape_scriptures.py
────────────────────────────────────────────────────────────────
churchofjesuschrist.org에서 한국어 경전 5권을 스크래핑하여 txt 파일로 저장

필요 패키지:
    pip install requests beautifulsoup4

사용법:
    python scrape_scriptures.py

출력 (scriptures_txt/ 폴더):
    01_구약전서.txt
    02_신약전서.txt
    03_몰몬경.txt
    04_교리와성약.txt
    05_값진진주.txt
"""

import requests
import time
import sys
from bs4 import BeautifulSoup
from pathlib import Path

# ── 설정 ──────────────────────────────────────────────────────
LANG = "kor"
API_BASE = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content"
OUTPUT_DIR = Path("scriptures_txt")
DELAY = 0.4          # 요청 간격 (초) — 서버 부하 방지
TIMEOUT = 30         # HTTP 타임아웃 (초)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://www.churchofjesuschrist.org/",
}

# ── 경전 구조 정의 ─────────────────────────────────────────────
# 형식: (uri_코드, 총_장_수, 한국어_책명)
SCRIPTURES = [
    {
        "name": "구약전서",
        "file": "01_구약전서.txt",
        "base_uri": "/scriptures/ot",
        "books": [
            ("gen",   50, "창세기"),
            ("ex",    40, "출애굽기"),
            ("lev",   27, "레위기"),
            ("num",   36, "민수기"),
            ("deut",  34, "신명기"),
            ("josh",  24, "여호수아"),
            ("judg",  21, "사사기"),
            ("ruth",   4, "룻기"),
            ("1-sam", 31, "사무엘상"),
            ("2-sam", 24, "사무엘하"),
            ("1-kgs", 22, "열왕기상"),
            ("2-kgs", 25, "열왕기하"),
            ("1-chr", 29, "역대상"),
            ("2-chr", 36, "역대하"),
            ("ezra",  10, "에스라"),
            ("neh",   13, "느헤미야"),
            ("esth",  10, "에스더"),
            ("job",   42, "욥기"),
            ("ps",   150, "시편"),
            ("prov",  31, "잠언"),
            ("eccl",  12, "전도서"),
            ("song",   8, "아가"),
            ("isa",   66, "이사야"),
            ("jer",   52, "예레미야"),
            ("lam",    5, "예레미야애가"),
            ("ezek",  48, "에스겔"),
            ("dan",   12, "다니엘"),
            ("hosea", 14, "호세아"),
            ("joel",   3, "요엘"),
            ("amos",   9, "아모스"),
            ("obad",   1, "오바댜"),
            ("jonah",  4, "요나"),
            ("micah",  7, "미가"),
            ("nahum",  3, "나훔"),
            ("hab",    3, "하박국"),
            ("zeph",   3, "스바냐"),
            ("hag",    2, "학개"),
            ("zech",  14, "스가랴"),
            ("mal",    4, "말라기"),
        ],
    },
    {
        "name": "신약전서",
        "file": "02_신약전서.txt",
        "base_uri": "/scriptures/nt",
        "books": [
            ("matt",   28, "마태복음"),
            ("mark",   16, "마가복음"),
            ("luke",   24, "누가복음"),
            ("john",   21, "요한복음"),
            ("acts",   28, "사도행전"),
            ("rom",    16, "로마서"),
            ("1-cor",  16, "고린도전서"),
            ("2-cor",  13, "고린도후서"),
            ("gal",     6, "갈라디아서"),
            ("eph",     6, "에베소서"),
            ("philip",  4, "빌립보서"),
            ("col",     4, "골로새서"),
            ("1-thes",  5, "데살로니가전서"),
            ("2-thes",  3, "데살로니가후서"),
            ("1-tim",   6, "디모데전서"),
            ("2-tim",   4, "디모데후서"),
            ("titus",   3, "디도서"),
            ("philem",  1, "빌레몬서"),
            ("heb",    13, "히브리서"),
            ("james",   5, "야고보서"),
            ("1-pet",   5, "베드로전서"),
            ("2-pet",   3, "베드로후서"),
            ("1-jn",    5, "요한일서"),
            ("2-jn",    1, "요한이서"),
            ("3-jn",    1, "요한삼서"),
            ("jude",    1, "유다서"),
            ("rev",    22, "요한계시록"),
        ],
    },
    {
        "name": "몰몬경",
        "file": "03_몰몬경.txt",
        "base_uri": "/scriptures/bofm",
        "books": [
            ("1-ne",   22, "니파이전서"),
            ("2-ne",   33, "니파이후서"),
            ("jacob",   7, "야곱서"),
            ("enos",    1, "에노스서"),
            ("jarom",   1, "자롬서"),
            ("omni",    1, "옴나이서"),
            ("w-of-m",  1, "몰몬의 말씀"),
            ("mosiah",  29, "모사이야서"),
            ("alma",   63, "앨마서"),
            ("hel",    16, "헬라만서"),
            ("3-ne",   30, "니파이삼서"),
            ("4-ne",    1, "니파이사서"),
            ("morm",    9, "몰몬서"),
            ("ether",  15, "이더서"),
            ("moro",   10, "모로나이서"),
        ],
    },
    {
        "name": "교리와 성약",
        "file": "04_교리와성약.txt",
        "base_uri": "/scriptures/dc-testament",
        "books": [
            ("dc",  138, "교리와 성약"),
            ("od",    2, "공식 선언"),
        ],
    },
    {
        "name": "값진 진주",
        "file": "05_값진진주.txt",
        "base_uri": "/scriptures/pgp",
        "books": [
            ("moses",  8, "모세서"),
            ("abr",    5, "아브라함서"),
            ("js-m",   1, "조셉 스미스—마태"),
            ("js-h",   1, "조셉 스미스—역사"),
            ("a-of-f", 1, "신앙개조"),
        ],
    },
]


# ── 핵심 함수 ───────────────────────────────────────────────────

def fetch_chapter(uri: str) -> str | None:
    """API에서 장 내용을 가져와 순수 텍스트로 반환. 실패 시 None."""
    params = {"lang": LANG, "uri": uri}
    try:
        resp = requests.get(API_BASE, params=params, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  [오류] {uri} — {e}")
        return None

    # API 응답에서 HTML 본문 추출
    content = data.get("content", {})
    body_html = content.get("body", "") or content.get("content", "")
    if not body_html:
        # 다른 키 탐색
        for key in ("markup", "html", "text"):
            body_html = data.get(key, "")
            if body_html:
                break

    if not body_html:
        print(f"  [경고] 빈 응답: {uri}")
        return None

    return parse_chapter_html(body_html)


def parse_chapter_html(html: str) -> str:
    """HTML에서 구절 텍스트만 추출하여 반환."""
    soup = BeautifulSoup(html, "html.parser")

    # 각주 링크(<a class="study-note-ref">)와 마커 제거
    for tag in soup.find_all("a", class_="study-note-ref"):
        tag.decompose()

    # 장 제목 추출
    title = ""
    for tag_name in ("h1", "h2", "h3"):
        el = soup.find(tag_name)
        if el:
            title = el.get_text(strip=True)
            break

    lines = []
    if title:
        lines.append(title)
        lines.append("")

    # 구절 추출: <p class="verse"> + <span class="verse-number"> 구조
    verses = soup.find_all("p", class_=lambda c: c and "verse" in c)
    if not verses:
        # fallback: data-aid 속성을 가진 p 태그
        verses = soup.find_all("p", attrs={"data-aid": True})
    if not verses:
        # fallback: 텍스트가 있는 모든 p 태그
        verses = [p for p in soup.find_all("p") if p.get_text(strip=True)]

    for p in verses:
        # verse-number span에서 구절 번호 추출
        num_span = p.find("span", class_="verse-number")
        verse_num = num_span.get_text(strip=True) if num_span else ""

        # verse-number span 제거 후 본문만 추출
        if num_span:
            num_span.decompose()

        body = p.get_text(separator=" ", strip=True)
        if not body:
            continue

        if verse_num:
            lines.append(f"{verse_num} {body}")
        else:
            lines.append(body)

    return "\n".join(lines)


def scrape_scripture(scripture: dict, out_file: Path):
    """경전 하나를 스크래핑하여 파일에 저장."""
    name = scripture["name"]
    base_uri = scripture["base_uri"]
    books = scripture["books"]

    print(f"\n{'='*60}")
    print(f"  {name} 스크래핑 시작")
    print(f"{'='*60}")

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(f"{'='*60}\n")
        f.write(f"  {name}\n")
        f.write(f"  출처: churchofjesuschrist.org (한국어)\n")
        f.write(f"{'='*60}\n\n")

        total_books = len(books)
        for b_idx, (code, total_chapters, book_name) in enumerate(books, 1):
            print(f"  [{b_idx}/{total_books}] {book_name} ({total_chapters}장)...")

            f.write(f"\n{'─'*50}\n")
            f.write(f"  {book_name}\n")
            f.write(f"{'─'*50}\n\n")

            for ch in range(1, total_chapters + 1):
                uri = f"{base_uri}/{code}/{ch}"
                chapter_text = fetch_chapter(uri)

                if chapter_text:
                    f.write(f"\n[{book_name} {ch}장]\n")
                    f.write(chapter_text)
                    f.write("\n")
                else:
                    f.write(f"\n[{book_name} {ch}장] — 내용을 가져오지 못했습니다.\n")

                sys.stdout.write(f"\r    {ch}/{total_chapters}장 완료   ")
                sys.stdout.flush()
                time.sleep(DELAY)

            print()  # 줄바꿈

    print(f"  저장 완료: {out_file}")


# ── 메인 ────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("한국어 경전 스크래핑 시작")
    print(f"출력 폴더: {OUTPUT_DIR.resolve()}\n")

    for scripture in SCRIPTURES:
        out_file = OUTPUT_DIR / scripture["file"]
        scrape_scripture(scripture, out_file)

    print(f"\n{'='*60}")
    print("  모든 경전 스크래핑 완료!")
    print(f"  폴더: {OUTPUT_DIR.resolve()}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
