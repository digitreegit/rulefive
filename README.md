# RuleFive

한 종목을 **5% 내리면 사고, 5% 오르면 파는** 단순한 Alpaca 자동매매 도우미.
Next.js로 만들어 **Vercel에 배포**하고, 외부 무료 스케줄러가 주기적으로 깨워서 판단합니다.

- 거래/현금 입출금은 모두 **Alpaca**에서 일어납니다.
- 대시보드: 총 투자액 / 총액 / 총 손익 + 30일 실적 그래프
- 설정: 종목, 변동 % (기본 5%), 봇 ON/OFF
- 기본은 **페이퍼(모의)** 모드. 키만 바꾸면 라이브로 전환됩니다.

> ⚠️ 단순 ±5% 전략은 한 방향으로 계속 가는 장에서는 손해가 날 수 있습니다. 수익을 보장하지 않습니다.

---

## 동작 원리

1. 봇이 처음 켜지면 그 순간 가격을 **기준가(reference)**로 저장합니다.
2. 보유 중이 아니면(현금) → 기준가 대비 **−5%** 되면 가용 현금 전액 매수, 기준가를 매수가로 갱신.
3. 보유 중이면 → 기준가 대비 **+5%** 되면 전량 매도, 기준가를 매도가로 갱신.
4. 외부 스케줄러(cron-job.org)가 10~15분마다 `/api/cron/run`을 호출해 위 판단을 반복합니다.

대시보드 숫자:
- **총 투자액** = Alpaca 순입금액(입금−출금). 비면 설정에서 수동 입력 가능.
- **총액** = 현재 계좌 평가액(현금 + 보유 가치).
- **총 손익** = 총액 − 총 투자액.

---

## 기술 스택

- Next.js 14 (App Router) + TypeScript + Tailwind
- Alpaca REST API (거래/시세/잔고)
- Supabase (설정값 + 봇 상태 + 거래 로그 저장)
- 그래프: Recharts
- 스케줄러: cron-job.org (무료)

---

## 배포 가이드 (Step by Step)

### 1) Alpaca 키 발급
- 페이퍼: https://app.alpaca.markets/paper/dashboard/overview → API Keys 생성
- 라이브(나중): https://app.alpaca.markets → 라이브 계좌, 크립토 거래 활성화, $500 입금 확인
- 거래하려는 종목(예: `XRP/USD`)이 Alpaca에서 실제 거래 가능한지 확인. 안 되면 `BTC/USD` 등으로.

### 2) Supabase 프로젝트
- https://supabase.com → New project (무료)
- **SQL Editor**에서 `supabase/schema.sql` 내용을 붙여넣고 실행
- **Project Settings → API**에서 `Project URL`과 `service_role` 키 복사

### 3) GitHub
- 이 코드를 `https://github.com/digitreegit/rulefive`에 푸시 (아래 "로컬 → GitHub" 참고)

### 4) Vercel
- https://vercel.com → Add New → Project → `digitreegit/rulefive` Import
- **Environment Variables**에 `.env.example`의 모든 값 입력:
  - `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`
  - `ALPACA_TRADING_BASE_URL` = `https://paper-api.alpaca.markets` (페이퍼)
  - `ALPACA_DATA_URL` = `https://data.alpaca.markets`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET` (= `openssl rand -hex 32`)
  - `APP_PASSWORD` (대시보드 로그인 비번, 직접 정함)
  - `AUTH_SECRET` (= `openssl rand -hex 32`)
- Deploy. 이후 GitHub에 푸시할 때마다 자동 배포됩니다.

### 5) 스케줄러 (cron-job.org, 무료)
- https://cron-job.org → 가입 → Create cronjob
- URL: `https://rulefive.skyface.com/api/cron/run`
- 주기: 매 10~15분
- **Advanced → Headers**에 추가:
  - `Authorization: Bearer <CRON_SECRET 값>`
- 저장 후 "Test run"으로 200 응답 확인

### 6) 도메인 (rulefive.skyface.com)
- Vercel 프로젝트 → Settings → Domains → `rulefive.skyface.com` 추가
- Network Solutions DNS에 Vercel이 안내하는 레코드 추가:
  - 보통 `rulefive` 호스트에 **CNAME → `cname.vercel-dns.com`**
- 전파되면 Vercel이 자동으로 인증서를 발급합니다.

### 7) 첫 실행
- `https://rulefive.skyface.com` 접속 → `APP_PASSWORD`로 로그인
- Settings에서 종목/% 확인 → 대시보드에서 **Start**
- 첫 cron 실행 때 기준가가 잡히고, 이후 ±5%에서 자동 매매됩니다.

---

## 페이퍼 → 라이브 전환
Vercel 환경변수만 바꾸면 됩니다 (코드 변경 없음):
- `ALPACA_API_KEY`, `ALPACA_SECRET_KEY` → 라이브 키
- `ALPACA_TRADING_BASE_URL` → `https://api.alpaca.markets`
- 저장 후 Redeploy.

---

## 로컬 개발
```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```
cron을 수동으로 한 번 돌리려면:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/run
```

## 로컬 → GitHub
```bash
git init
git add .
git commit -m "Initial RuleFive app"
git branch -M main
git remote add origin https://github.com/digitreegit/rulefive.git
git push -u origin main
```
