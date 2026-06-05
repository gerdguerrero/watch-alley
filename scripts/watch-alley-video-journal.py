#!/usr/bin/env python3
"""Build a Supabase archive SQL packet from a social-video-watch output folder.

This script intentionally does NOT connect to Supabase and does NOT require API keys.
It produces SQL that can be reviewed and applied through trusted tooling such as the
Hermes Supabase MCP tools.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from typing import Any


DEFAULT_TERMS = [
    "The Watch Alley",
    "Seiko",
    "Seiko Philippines",
    "Philippine Limited Edition",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def sql_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def sql_jsonb(value: Any) -> str:
    return sql_literal(json.dumps(value, ensure_ascii=False, sort_keys=True)) + "::jsonb"


def sql_text_array(values: list[str]) -> str:
    if not values:
        return "array[]::text[]"
    return "array[" + ", ".join(sql_literal(v) for v in values) + "]::text[]"


def slugify(text: str) -> str:
    value = text.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value[:120].strip("-") or "untitled-video-journal-draft"


def flatten_transcript(segments: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for segment in segments:
        text = str(segment.get("text") or "").strip()
        if text:
            parts.append(text)
    return "\n".join(parts)


def file_size(path: Path) -> int | None:
    try:
        return path.stat().st_size
    except OSError:
        return None


def artifact_row(kind: str, path: Path, base_dir: Path, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    mime_type = mimetypes.guess_type(path.name)[0]
    return {
        "kind": kind,
        "local_path": str(path),
        "relative_path": str(path.relative_to(base_dir)) if path.exists() else path.name,
        "mime_type": mime_type,
        "size_bytes": file_size(path),
        "metadata": metadata or {},
    }


def build_artifacts(base_dir: Path) -> list[dict[str, Any]]:
    artifacts: list[dict[str, Any]] = []
    named = [
        ("metadata_json", base_dir / "metadata.json"),
        ("transcript_markdown", base_dir / "transcript.md"),
        ("transcript_json", base_dir / "transcript.json"),
        ("report", base_dir / "report.md"),
        ("ocr", base_dir / "ocr.txt"),
        ("frames_manifest", base_dir / "frames_manifest.json"),
        ("contact_sheet", base_dir / "contact_sheet.jpg"),
        ("audio", base_dir / "audio_16k.wav"),
        ("video", base_dir / "download" / "video.mp4"),
    ]
    for kind, path in named:
        if path.exists():
            artifacts.append(artifact_row(kind, path, base_dir))

    for group, kind in [("sample", "sample_frame"), ("scene", "scene_frame")]:
        frame_dir = base_dir / "frames" / group
        if frame_dir.exists():
            for path in sorted(frame_dir.glob("*.jpg")):
                artifacts.append(artifact_row(kind, path, base_dir, {"frame_group": group}))
    return artifacts


def infer_platform(metadata: dict[str, Any], source_url: str) -> str:
    extractor = str(metadata.get("extractor") or "").lower()
    url = source_url.lower()
    if "facebook" in extractor or "facebook.com" in url or "fb.watch" in url:
        return "facebook"
    if "instagram" in extractor or "instagram.com" in url:
        return "instagram"
    if "tiktok" in extractor or "tiktok.com" in url:
        return "tiktok"
    if "youtube" in extractor or "youtu" in url:
        return "youtube"
    if "twitter" in extractor or "x.com" in url or "twitter.com" in url:
        return "x"
    return "other"


def build_sql(args: argparse.Namespace) -> str:
    base_dir = Path(args.artifact_dir).expanduser().resolve()
    metadata = read_json(base_dir / "metadata.json", {})
    transcript_json = read_json(base_dir / "transcript.json", {})
    raw_json = read_json(base_dir / "transcript_raw_mlx.json", {})
    frames_manifest = read_json(base_dir / "frames_manifest.json", {})

    source_url = args.source_url or metadata.get("source") or metadata.get("webpage_url") or ""
    if not source_url:
        raise SystemExit("Missing source URL. Pass --source-url or include metadata.json with source/webpage_url.")

    platform = args.platform or infer_platform(metadata, source_url)
    external_id = args.external_id or metadata.get("id")
    canonical_url = args.canonical_url or metadata.get("webpage_url") or source_url
    title = args.title or metadata.get("title") or base_dir.name
    description = metadata.get("description")
    uploader = metadata.get("uploader")
    duration_seconds = metadata.get("duration") or (metadata.get("media") or {}).get("duration_seconds")
    upload_date = metadata.get("upload_date")
    published_at_sql = "null"
    if upload_date and re.fullmatch(r"\d{8}", str(upload_date)):
        published_at_sql = sql_literal(f"{str(upload_date)[:4]}-{str(upload_date)[4:6]}-{str(upload_date)[6:8]}T00:00:00Z") + "::timestamptz"

    segments = transcript_json.get("segments") if isinstance(transcript_json, dict) else []
    if not isinstance(segments, list):
        segments = []
    transcript_markdown = read_text(Path(args.transcript_markdown_file).expanduser().resolve()) if args.transcript_markdown_file else read_text(base_dir / "transcript.md")
    if args.transcript_text_file:
        transcript_text = read_text(Path(args.transcript_text_file).expanduser().resolve())
    else:
        transcript_text = args.transcript_text or flatten_transcript(segments) or transcript_markdown
    transcript_hash = hashlib.sha256(transcript_text.encode("utf-8")).hexdigest()
    source_label = str(transcript_json.get("source") or "unknown") if isinstance(transcript_json, dict) else "unknown"
    provider = args.provider or source_label.split(":", 1)[0]
    model = args.model or (source_label.split(":", 1)[1] if ":" in source_label else None)
    terms = args.terms or DEFAULT_TERMS

    artifacts = build_artifacts(base_dir)

    article_title = args.article_title
    article_body = read_text(Path(args.article_body_file).expanduser().resolve()) if args.article_body_file else ""
    article_slug = args.article_slug or (slugify(article_title) if article_title else None)
    article_tags = args.article_tags or []
    article_summary = args.article_summary
    article_read_minutes = args.article_read_minutes
    if article_body and article_read_minutes is None:
        word_count = len(re.findall(r"\S+", article_body))
        article_read_minutes = max(1, round(word_count / 220))

    artifact_values = []
    for item in artifacts:
        artifact_values.append(
            "(" + ", ".join([
                "(select id from source_upsert)",
                "(select id from transcript_insert)",
                sql_literal(item["kind"]),
                "null",
                "null",
                "null",
                sql_literal(item["local_path"]),
                sql_literal(item["mime_type"]),
                sql_literal(item["size_bytes"]),
                sql_jsonb({**item.get("metadata", {}), "relative_path": item.get("relative_path")}),
            ]) + ")"
        )

    article_cte = "journal_insert as (\n  select null::uuid as id\n),"
    generation_cte = "generation_insert as (\n  select null::uuid as id\n)"
    if article_title and article_summary and article_body:
        article_cte = f"""journal_insert as (
  insert into watch_alley.journal_posts (
    slug, title, summary, body_markdown, hero_image, tags,
    status, publish_at, author, read_minutes, published_at
  )
  values (
    {sql_literal(article_slug)},
    {sql_literal(article_title)},
    {sql_literal(article_summary)},
    {sql_literal(article_body)},
    null,
    {sql_text_array(article_tags)},
    {sql_literal(args.article_status)},
    null,
    {sql_literal(args.article_author)},
    {sql_literal(article_read_minutes)},
    case when {sql_literal(args.article_status)} = 'published' then now() else null end
  )
  on conflict (slug) do update set
    title = excluded.title,
    summary = excluded.summary,
    body_markdown = excluded.body_markdown,
    hero_image = excluded.hero_image,
    tags = excluded.tags,
    status = excluded.status,
    publish_at = excluded.publish_at,
    author = excluded.author,
    read_minutes = excluded.read_minutes,
    published_at = case
      when excluded.status = 'published' and watch_alley.journal_posts.published_at is null then now()
      when excluded.status <> 'published' then null
      else watch_alley.journal_posts.published_at
    end
  returning id
),"""
        generation_cte = f"""generation_insert as (
  insert into watch_alley.article_generation_runs (
    source_id, transcript_run_id, journal_post_id, angle, prompt_version, brief,
    output_title, output_slug, output_summary, output_tags, output_body_markdown,
    fact_check_notes, quality_status, metadata
  )
  values (
    (select id from source_upsert),
    (select id from transcript_insert),
    (select id from journal_insert),
    {sql_literal(args.angle)},
    {sql_literal(args.prompt_version)},
    {sql_literal(args.brief)},
    {sql_literal(article_title)},
    {sql_literal(article_slug)},
    {sql_literal(article_summary)},
    {sql_text_array(article_tags)},
    {sql_literal(article_body)},
    {sql_jsonb(args.fact_check_notes)},
    'needs_review',
    {sql_jsonb({"artifact_dir": str(base_dir), "frames_manifest_counts": {"sample": len(frames_manifest.get("sample_frames", [])) if isinstance(frames_manifest, dict) else None, "scene": len(frames_manifest.get("scene_frames", [])) if isinstance(frames_manifest, dict) else None}})}
  )
  returning id
)"""

    artifact_values_sql = ",\n    ".join(artifact_values) if artifact_values else "((select id from source_upsert), (select id from transcript_insert), 'other', null, null, null, null, null, null, '{}'::jsonb)"

    sql = f"""begin;

with source_upsert as (
  insert into watch_alley.content_sources (
    source_type, platform, source_url, canonical_url, external_id,
    client_account, title, description, uploader, duration_seconds,
    published_at, metadata, status
  )
  values (
    'video',
    {sql_literal(platform)},
    {sql_literal(source_url)},
    {sql_literal(canonical_url)},
    {sql_literal(external_id)},
    {sql_literal(args.client_account)},
    {sql_literal(title)},
    {sql_literal(description)},
    {sql_literal(uploader)},
    {sql_literal(duration_seconds)},
    {published_at_sql},
    {sql_jsonb(metadata)},
    'drafted'
  )
  on conflict (platform, external_id) where external_id is not null do update set
    source_url = excluded.source_url,
    canonical_url = excluded.canonical_url,
    client_account = excluded.client_account,
    title = excluded.title,
    description = excluded.description,
    uploader = excluded.uploader,
    duration_seconds = excluded.duration_seconds,
    published_at = excluded.published_at,
    metadata = excluded.metadata,
    status = excluded.status,
    error_message = null
  returning id
),
old_preferred as (
  update watch_alley.transcript_runs
  set is_preferred = false
  where source_id = (select id from source_upsert)
  returning id
),
transcript_insert as (
  insert into watch_alley.transcript_runs (
    source_id, run_type, provider, model, language, asr_prompt, terms,
    transcript_text, transcript_markdown, segments, raw_json, corrections,
    sha256, is_preferred, metadata
  )
  values (
    (select id from source_upsert),
    {sql_literal(args.run_type)},
    {sql_literal(provider)},
    {sql_literal(model)},
    {sql_literal(args.language)},
    {sql_literal(args.asr_prompt)},
    {sql_text_array(terms)},
    {sql_literal(transcript_text)},
    {sql_literal(transcript_markdown)},
    {sql_jsonb(segments)},
    {sql_jsonb(raw_json)},
    {sql_jsonb(args.corrections)},
    {sql_literal(transcript_hash)},
    true,
    {sql_jsonb({"artifact_dir": str(base_dir), "transcript_source": source_label})}
  )
  returning id
),
artifact_insert as (
  insert into watch_alley.video_artifacts (
    source_id, transcript_run_id, kind, bucket, storage_path, public_url,
    local_path, mime_type, size_bytes, metadata
  )
  values
    {artifact_values_sql}
  returning id
),
{article_cte}
{generation_cte}
select
  (select id from source_upsert) as source_id,
  (select id from transcript_insert) as transcript_run_id,
  (select count(*) from artifact_insert) as artifact_count,
  (select id from journal_insert) as journal_post_id,
  (select id from generation_insert) as generation_run_id;

commit;
"""
    return sql


def main() -> None:
    parser = argparse.ArgumentParser(description="Create Watch Alley video transcript archive SQL from social-video-watch output.")
    parser.add_argument("artifact_dir", help="social-video-watch output directory")
    parser.add_argument("--source-url")
    parser.add_argument("--canonical-url")
    parser.add_argument("--external-id")
    parser.add_argument("--platform", choices=["facebook", "instagram", "tiktok", "youtube", "x", "local", "other"])
    parser.add_argument("--client-account", default="the-watch-alley")
    parser.add_argument("--title")
    parser.add_argument("--provider")
    parser.add_argument("--model")
    parser.add_argument("--run-type", default="asr", choices=["caption", "asr", "manual", "corrected"])
    parser.add_argument("--language", default="tl-en")
    parser.add_argument("--asr-prompt")
    parser.add_argument("--terms", action="append", default=[])
    parser.add_argument("--transcript-text")
    parser.add_argument("--transcript-text-file")
    parser.add_argument("--transcript-markdown-file")
    parser.add_argument("--correction", dest="corrections", action="append", default=[])
    parser.add_argument("--article-title")
    parser.add_argument("--article-slug")
    parser.add_argument("--article-summary")
    parser.add_argument("--article-body-file")
    parser.add_argument("--article-tags", action="append", default=[])
    parser.add_argument("--article-author", default="The Watch Alley")
    parser.add_argument("--article-status", default="draft", choices=["draft", "scheduled", "published"])
    parser.add_argument("--article-read-minutes", type=int)
    parser.add_argument("--angle", default="event-recap")
    parser.add_argument("--prompt-version", default="watch-alley-video-journal-v1")
    parser.add_argument("--brief")
    parser.add_argument("--fact-check-note", dest="fact_check_notes", action="append", default=[])
    parser.add_argument("--out-sql", required=True)
    args = parser.parse_args()

    if args.terms:
        args.terms = [term.strip() for item in args.terms for term in item.split(",") if term.strip()]
    if args.article_tags:
        args.article_tags = [tag.strip() for item in args.article_tags for tag in item.split(",") if tag.strip()]

    sql = build_sql(args)
    out_path = Path(args.out_sql).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8")
    print(f"Wrote SQL archive packet: {out_path}")


if __name__ == "__main__":
    main()
