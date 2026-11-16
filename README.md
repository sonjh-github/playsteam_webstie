# PLAYSTEAM 홈페이지

Eleventy 3.1.2 기반의 플레이스팀 홈페이지입니다. 콘텐츠 원본은 Supabase `roota-content` 프로젝트의 `homepage` 스키마입니다.

## 실행

Node.js 20 이상에서:

```sh
npm ci
npm start
```

```sh
npm test
npm run build
npm run verify
```

`npm run build`는 공개 읽기 전용 RPC `homepage_snapshot`을 호출하여 JSON 설정, 공개 기사, 원본 이미지 파일을 내려받고 `_site/`에 정적 홈페이지를 생성합니다. 다운로드나 이미지 해시 검증에 실패하면 빌드가 중단됩니다. 데이터가 없는 경우 예전 저장본으로 대신 빌드하지 않습니다. 빌드 전에 기존 결과물을 지워 공개 해제한 기사가 남지 않게 합니다.

`supabase.public.json`에는 프로젝트 URL과 **publishable key**만 들어 있습니다. 이 키는 공개 가능한 식별자이며, 실제 접근은 DB 권한과 RLS 정책으로 제한됩니다. 서비스 키·DB 비밀번호는 사용하지 않습니다. 필요하면 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` 환경변수로 대체할 수 있습니다.

## 데이터 관리

| 테이블 | 빌드 데이터 |
|---|---|
| `homepage.data_files` | `data` 컬럼의 audiences, boxes, home, programs, site, trends |
| `homepage.articles` | `published=true`인 행의 `frontmatter`, `body_markdown` |
| `homepage.media_assets` | 이미지 `content` 바이너리, 경로, 크기, SHA-256 |

빌드는 원문 백업 컬럼 대신 현재 `data`와 `frontmatter`를 읽습니다. 기존 이관 테이블의 무결성 제약조건 때문에 JSON 데이터를 편집할 때는 `raw_content`와 `source_sha256`도 함께 일치시켜야 합니다. 기사 `frontmatter.published=false`는 다음 빌드부터 제외됩니다. 생성된 기사 메타데이터 컬럼(`title`, `published` 등)은 `frontmatter`에서 자동 계산됩니다.

콘텐츠 변경은 다음 빌드·배포에 반영됩니다. 방문할 때마다 DB를 호출하는 방식은 아닙니다. Git 기반 CMS는 더 이상 데이터 원본이 아니므로 `/admin/`은 Supabase와 빌드 관리 링크를 안내합니다.

## GitHub Actions

코드를 `main`에 올리면 Supabase 데이터를 읽어 테스트·빌드·링크 검증을 실행하고 Pages 아티팩트를 만듭니다. DB만 수정한 경우 Actions의 **홈페이지 빌드 및 배포 → Run workflow**를 실행합니다.

실제 GitHub Pages 공개는 저장소 Settings → Pages에서 Source를 GitHub Actions로 설정한 뒤, Run workflow의 `deploy`를 켜서 실행합니다. 일반 코드 push는 검증과 아티팩트 생성만 수행합니다. 기존 `playsteam.co.kr` 도메인 설정은 가져오지 않았습니다.

프로젝트 Pages 기본 경로는 `/playsteam_webstie/`입니다. 루트 도메인 배포 시 `SITE_PATH_PREFIX=/`로, canonical 주소는 `SITE_URL`로 지정합니다. 워크플로 설정도 같은 값으로 맞춥니다.

## 구조

- `src/`: 기존 레이아웃, Nunjucks 템플릿, CSS, JavaScript
- `scripts/sync-homepage.mjs`: Supabase 연결·다운로드·무결성 검증
- `scripts/verify-build.mjs`: 생성 페이지의 로컬 링크와 이미지 해시 검증
- `database/homepage-read-api.sql`: 공개 읽기 API와 RLS 정책 정의
- `docs/original-readme.md`: 이전 저장소의 안내 문서 (이전 배포/CMS 설명은 현재 방식과 다름)

다운로드한 콘텐츠와 이미지는 git에서 제외하며, `.cache/homepage-manifest.json`에 마지막 동기화 결과를 기록합니다.
