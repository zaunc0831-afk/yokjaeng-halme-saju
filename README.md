# 욕쟁이 할매의 사주 상담소 — 공개 배포용

한국식 만세력 계산(`manseryeok`)과 서버 측 OpenAI Responses API를 연결한 Node.js/Express 앱입니다. 캐릭터 이미지는 `public/halme.jpg`로 포함되어 있습니다.

## 필요한 것
- Node.js 20 이상 (권장 22)
- OpenAI API 키 및 API 사용 결제 설정
- 공개 배포용 호스팅 계정 (예: Render)

## 로컬 실행
```bash
npm install
cp .env.example .env
# .env의 OPENAI_API_KEY를 실제 키로 교체
npm start
```
브라우저에서 `http://localhost:3000`을 엽니다. `.env` 파일과 API 키를 GitHub에 올리지 마세요.

## Render로 공개 배포
1. 이 폴더의 파일을 새 GitHub 저장소에 올립니다. `.gitignore`가 `.env`와 `node_modules`를 제외하는지 확인하세요.
2. Render에서 **New + → Blueprint**를 선택하고 저장소를 연결합니다. `render.yaml`을 읽어 웹 서비스를 구성합니다.
3. Render 대시보드의 Environment에서 `OPENAI_API_KEY`를 실제 키로 입력합니다. 키는 브라우저 코드에 넣지 않습니다.
4. 배포가 완료되면 Render가 `https://<서비스이름>.onrender.com` 형식의 공개 URL을 제공합니다. 해당 URL을 다른 사람에게 공유할 수 있습니다.
5. `/api/health`를 열어 서버가 살아 있는지 확인합니다. `aiConfigured`가 `true`여야 AI 키가 설정된 상태입니다.

## 기능
- `manseryeok` 패키지로 연주·월주·일주·시주 계산
- 양력/음력 및 윤달 입력
- 오행·음양 카운트, MBTI·분야 선택을 포함해 AI에 맞춤 풀이 요청
- API 키는 서버 환경변수에서만 읽음
- 간단한 IP별 시간당 요청 제한
- `/api/health` 상태 점검

## 중요한 계산/서비스 참고
- `manseryeok`는 KASI 기반 데이터 및 절기 경계를 이용합니다. 프로젝트 README에 명시된 계산 범위와 관법을 확인하세요.
- 출생 시간을 모르면 시주를 임의의 정오 입력으로 계산하되 UI와 AI 지침에서 시주 해석을 제외하라고 알립니다. 시간 미상 시 시주를 완전히 계산하지 않는 별도 표시 방식은 향후 보강할 수 있습니다.
- 기본 설정은 한국 표준시 입력이며 진태양시 보정은 켜지지 않습니다. 출생지 경도/진태양시를 적용하려면 UI 입력과 서버 옵션을 추가해야 합니다.
- 운세는 오락 및 자기성찰용으로 제공하고, 중요한 의사결정에 사용하지 않도록 안내합니다.
- IP rate limit은 단일 인스턴스 메모리 기반의 간단한 보호장치입니다. 규모가 커지면 Redis/관리형 rate limiter, CAPTCHA, 로그/모니터링을 추가하세요.
- 공개 서비스 비용은 호스팅과 AI API 사용량에 따라 발생할 수 있습니다. 사용량 제한과 결제 알림을 설정하세요.

## 환경 변수
- `OPENAI_API_KEY` (필수): OpenAI API 키
- `OPENAI_MODEL` (선택, 기본 `gpt-4.1-mini`): 사용 모델
- `PORT` (선택, 기본 `3000`)
- `RATE_LIMIT_PER_HOUR` (선택, 기본 `20`)

## 출처
- 만세력 패키지: https://github.com/yhj1024/manseryeok
- OpenAI API 가이드: https://developers.openai.com/api/reference/overview
