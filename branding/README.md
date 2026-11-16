# 플레이스팀 브랜드 에셋

웹사이트가 Supabase에서 내려받는 브랜드 이미지의 변경 원본입니다. `homepage.media_assets`의 같은 파일명(`/assets/img/…`)에 반영했습니다.

- `og.jpg`: 공유 미리보기 이미지, 1200×630
- `apple-touch-icon.png`: P 아이콘, 180×180
- `favicon-32.png`: P 아이콘, 32×32
- `favicon.svg`: 같은 P 아이콘의 벡터 버전

래스터 이미지는 내장 image_gen 편집 도구로 기존 이미지의 브랜드 표기를 변경하고, macOS sips로 웹용 크기와 형식으로 변환했습니다. SVG는 기존 벡터 아이콘의 문자 경로를 P로 바꿨습니다.

## 공유 이미지 편집 프롬프트

Use case: text-localization. Edit target: the supplied existing 1200x630 website Open Graph banner. Preserve the dark navy background, exact existing layout, the white constellation drawing on the right and orange center node, all spacing, and the large white Korean slogan '묻고, 판단하고, 해내다'. Change ONLY these two brand text areas: top-left orange 'Na Company' becomes orange 'PLAYSTEAM'; bottom-left grey '주식회사 나컴퍼니 · 대전 본사 · 울산 교육센터' becomes grey '플레이스팀 · 대전 본사 · 울산 교육센터'. Render the Korean text precisely. Keep aspect ratio 1200:630. No new elements, logos, effects or borders. Intended as a production website sharing image.

## 아이콘 편집 프롬프트

Use case: text-localization. Edit target: this website icon. Replace ONLY the large white capital N with a large white capital P, a bold geometric sans-serif P, to rebrand the site PLAYSTEAM. Preserve the flat dark charcoal rounded-square tile, rounded corners with transparent area outside the tile, flat white letter, and the small coral-orange circular dot at lower right. Center and balance the P naturally in the existing icon with the dot to its lower right. Exact same simple flat visual system; no glow, gradients, shadows, outlines or other added details. Square image, intended to be downscaled to 180x180 and 32x32.
