-- Published homepage content only; no service-role key or schema exposure required.
grant usage on schema homepage to anon, authenticated;
grant select (name, data) on homepage.data_files to anon, authenticated;
grant select (slug, frontmatter, body_markdown, published) on homepage.articles to anon, authenticated;
grant select (public_path, content, byte_size, source_sha256) on homepage.media_assets to anon, authenticated;

create policy homepage_settings_read on homepage.data_files for select to anon, authenticated
using (name in ('audiences', 'boxes', 'home', 'programs', 'site', 'trends'));
create policy homepage_published_articles_read on homepage.articles for select to anon, authenticated using (published is true);
create policy homepage_media_read on homepage.media_assets for select to anon, authenticated using (true);

create function public.homepage_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
 select jsonb_build_object(
  'version', 1,
  'settings', coalesce((select jsonb_object_agg(d.name, d.data) from homepage.data_files d), '{}'::jsonb),
  'articles', coalesce((select jsonb_agg(jsonb_build_object(
    'slug', a.slug, 'frontmatter', a.frontmatter, 'body_markdown', a.body_markdown
  ) order by a.slug) from homepage.articles a where a.published is true), '[]'::jsonb),
  'media', coalesce((select jsonb_agg(jsonb_build_object(
    'path', m.public_path, 'byte_size', m.byte_size, 'sha256', m.source_sha256,
    'base64', encode(m.content, 'base64')
  ) order by m.public_path) from homepage.media_assets m), '[]'::jsonb)
 );
$function$;
revoke all on function public.homepage_snapshot() from public;
grant execute on function public.homepage_snapshot() to anon, authenticated, service_role;
comment on function public.homepage_snapshot() is 'Read-only build snapshot of homepage settings, published articles, and original public media; caller RLS applies.';
notify pgrst, 'reload schema';

