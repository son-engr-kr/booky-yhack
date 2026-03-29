# Booky 배포 TODO

## 완료된 작업
- [x] Backend → GCP Cloud Run 배포 (`https://booky-api-318799600047.us-central1.run.app`)
- [x] Frontend → Vercel 배포 (`https://booky-dvoa9nfjp-shinhunjuns-projects.vercel.app`)
- [x] Vercel에 `booky.ink` 도메인 추가
- [x] Vercel 환경변수 `NEXT_PUBLIC_API_URL` 설정
- [x] Cloud Run 환경변수 (K2_API_KEY, FRONTEND_URL) 설정
- [x] CORS에 `booky.ink` 추가
- [x] deploy 브랜치 생성
- [x] DNS 설정 완료 (Porkbun: A → 76.76.21.21, CNAME www → cname.vercel-dns.com)
- [x] `booky.ink` SSL 인증서 발급 완료
- [x] `www.booky.ink` Vercel 연결 완료

## 남은 작업

### 1. ⚠️ MongoDB 클라우드 연결 (필수 — 현재 사이트 하얀 화면 원인)

현재 MongoDB가 localhost로 되어있어 Cloud Run에서 연결 불가 → 모든 API 타임아웃 → 하얀 화면.

**동료가 해야 할 것:**
1. 로컬 MongoDB 데이터를 클라우드(Atlas 등)로 마이그레이션
2. connection string을 아래 명령어에 넣고 실행:

```bash
gcloud run services update booky-api \
  --set-env-vars="MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/booky,K2_API_KEY=IFM-1mIslee9Txu59dqw,FRONTEND_URL=https://booky.ink" \
  --region=us-central1 \
  --project=theta-bliss-486220-s1
```

**참고:**
- GCP 프로젝트: `theta-bliss-486220-s1`
- Cloud Run 서비스: `booky-api` (us-central1)
- DB 이름: `booky`
- Atlas 사용 시 Network Access에서 `0.0.0.0/0` 허용 필요 (Cloud Run IP 고정 아님)

### 3. api 서브도메인 Cloud Run 매핑 (DNS 설정 후)
api.booky.ink CNAME 추가했으면:
```bash
gcloud run domain-mappings create \
  --service=booky-api \
  --domain=api.booky.ink \
  --region=us-central1 \
  --project=theta-bliss-486220-s1
```
그 후 Vercel 환경변수 업데이트:
```bash
cd frontend
vercel env rm NEXT_PUBLIC_API_URL production
echo "https://api.booky.ink/api" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

### 4. deploy 브랜치 push & 커밋
배포 관련 변경사항 (Dockerfile, CORS, config) 커밋 후 push.

### 5. SSL 확인
- Vercel: 자동 (booky.ink)
- Cloud Run: 자동 (*.run.app) / domain mapping 시 자동 프로비저닝

### 6. Firebase 인증 (필요 시)
Firebase Console → Authentication → Authorized domains에 `booky.ink` 추가
