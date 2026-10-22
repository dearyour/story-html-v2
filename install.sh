#!/usr/bin/env bash
# story-html-v2 설치: 플러그인 설치 + 자동 업데이트 켜기 + /story-html-v2 짧은 별칭.
#   curl -fsSL https://raw.githubusercontent.com/dearyour/story-html-v2/main/install.sh | bash
# 다시 실행해도 안전하다(이미 있으면 갱신만 한다). CLAUDE_CONFIG_DIR를 따른다.
# v1(story-html, 마켓플레이스 dearyour)과는 따로 설치되며 서로 건드리지 않는다.
set -euo pipefail

MARKET="story-html-v2"
REPO="dearyour/story-html-v2"
PLUGIN="story-html-v2@${MARKET}"
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

command -v claude >/dev/null 2>&1 || { echo "Claude Code CLI(claude)가 필요합니다: https://claude.com/claude-code" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js가 필요합니다(설정 파일 수정과 스킬의 촬영·빌드 스크립트에 씀)." >&2; exit 1; }

echo "1/4 마켓플레이스 추가: ${REPO}"
claude plugin marketplace add "${REPO}" >/dev/null 2>&1 || claude plugin marketplace update "${MARKET}" >/dev/null

echo "2/4 플러그인 설치: ${PLUGIN}"
claude plugin install "${PLUGIN}" >/dev/null 2>&1 || claude plugin update "${PLUGIN}" >/dev/null 2>&1 || true

# 자동 업데이트는 사용자 설정의 마켓플레이스 항목에 저장된다. 'marketplace add'가 그 항목을
# 다시 쓰므로, 추가·설치가 끝난 뒤에 켠다.
echo "3/4 자동 업데이트 켜기"
SETTINGS="${CONFIG_DIR}/settings.json" MARKET="${MARKET}" REPO="${REPO}" node -e '
const fs = require("fs");
const p = process.env.SETTINGS;
const d = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8") || "{}") : {};
d.extraKnownMarketplaces ??= {};
const m = (d.extraKnownMarketplaces[process.env.MARKET] ??= { source: { source: "github", repo: process.env.REPO } });
m.autoUpdate = true;
fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
'

echo "4/4 /story-html-v2 별칭"
mkdir -p "${CONFIG_DIR}/commands"
ALIAS="${CONFIG_DIR}/commands/story-html-v2.md"
if [ ! -e "${ALIAS}" ]; then
  cat > "${ALIAS}" <<'MD'
---
description: story-html-v2 플러그인 스킬(story-html-v2:story-html-v2)로 실제 화면 캡처 기반 스크롤 스토리 HTML을 만든다 — /story-html-v2 별칭
argument-hint: "[만들 내용 · 제품 주소 · 원문 경로 · 요청]"
---

플러그인 스킬 `story-html-v2:story-html-v2`을 Skill 도구로 불러서 그 지침을 그대로 따른다.

요청: $ARGUMENTS
MD
fi

echo "완료. Claude Code를 다시 시작하면 /story-html-v2로 쓸 수 있고, 시작할 때마다 새 버전을 받는다."
