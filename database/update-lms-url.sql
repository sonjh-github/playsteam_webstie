-- Update the homepage LMS link while preserving source-text integrity.
with revised as (
  select name,
    jsonb_set(data, '{lms_url}', '"https://lms.playsteam.org"'::jsonb) as new_data,
    regexp_replace(raw_content, '"lms_url"\s*:\s*"[^"]*"', '"lms_url": "https://lms.playsteam.org"') as new_raw
  from homepage.data_files
  where name = 'site' and data->>'lms_url' is distinct from 'https://lms.playsteam.org'
)
update homepage.data_files d
set data = r.new_data,
    raw_content = r.new_raw,
    source_sha256 = encode(sha256(convert_to(r.new_raw, 'UTF8')), 'hex')
from revised r
where d.name = r.name;
