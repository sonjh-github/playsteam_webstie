-- Branding update; keep original-text integrity constraints consistent.
begin;

with updated as (
  select name,
    replace(replace(replace(replace(raw_content, '주식회사 나컴퍼니', '플레이스팀'), '나컴퍼니가', '플레이스팀이'), '나컴퍼니는', '플레이스팀은'), '나컴퍼니', '플레이스팀') as new_raw
  from homepage.data_files
  where raw_content like '%나컴퍼니%'
)
update homepage.data_files d
set data = u.new_raw::jsonb,
    raw_content = u.new_raw,
    source_sha256 = encode(sha256(convert_to(u.new_raw, 'UTF8')), 'hex')
from updated u
where d.name = u.name;

with updated as (
  select slug,
    replace(replace(replace(replace(frontmatter::text, '주식회사 나컴퍼니', '플레이스팀'), '나컴퍼니가', '플레이스팀이'), '나컴퍼니는', '플레이스팀은'), '나컴퍼니', '플레이스팀')::jsonb as new_frontmatter,
    replace(replace(replace(replace(body_markdown, '주식회사 나컴퍼니', '플레이스팀'), '나컴퍼니가', '플레이스팀이'), '나컴퍼니는', '플레이스팀은'), '나컴퍼니', '플레이스팀') as new_body,
    replace(replace(replace(replace(raw_content, '주식회사 나컴퍼니', '플레이스팀'), '나컴퍼니가', '플레이스팀이'), '나컴퍼니는', '플레이스팀은'), '나컴퍼니', '플레이스팀') as new_raw
  from homepage.articles
  where frontmatter::text like '%나컴퍼니%' or body_markdown like '%나컴퍼니%' or raw_content like '%나컴퍼니%'
)
update homepage.articles a
set frontmatter = u.new_frontmatter,
    body_markdown = u.new_body,
    raw_content = u.new_raw,
    source_sha256 = encode(sha256(convert_to(u.new_raw, 'UTF8')), 'hex')
from updated u
where a.slug = u.slug;

commit;
