import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { spawnSync } from "node:child_process";
import { resolvePreviewMediaPolicy, isolatedPreviewBranch } from "../lib/preview-media-build.mjs";
import { loadFixtureModule, renderMediaFixtures } from "./helpers/render-preview-media.mjs";
const media = loadFixtureModule("lib/preview-media.ts");
const video = loadFixtureModule("lib/video-source.ts");
const { VideoEmbed } = loadFixtureModule("components/VideoEmbed.tsx");

test("Preview layout omits GTM and Clarity with the isolated environment settings", () => {
  const previous = { VERCEL_ENV: process.env.VERCEL_ENV, NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID };
  Object.assign(process.env, { VERCEL_ENV: "preview", NEXT_PUBLIC_GTM_ID: "fixture-ignored", NEXT_PUBLIC_CLARITY_ID: "" });
  try {
    const { default: Layout } = loadFixtureModule("app/layout.tsx");
    const html = renderToStaticMarkup(createElement(Layout, null, createElement("p", null, "Fixture")));
    assert.ok(!html.includes("googletagmanager.com") && !html.includes("clarity.ms"));
    assert.ok(html.includes("application/ld+json"));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("public opt-in cannot bypass the existing staging guard", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", "await import('./next.config.ts')"], {
    env: { ...process.env, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: isolatedPreviewBranch,
      NEXT_PUBLIC_SUPABASE_URL: "https://wrong-project.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-invalid",
      NEXT_PUBLIC_ENABLE_MAPS: "true", NEXT_PUBLIC_MEDIA_POLICY: "standard", PRIVILEGE_MEDIA_POLICY: "standard" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires the verified staging environment/);
});

test("media policy: exact branch and Preview, production and other previews preserved", () => {
  assert.equal(resolvePreviewMediaPolicy({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: isolatedPreviewBranch }), "isolated");
  for (const env of [{ VERCEL_ENV: "production" }, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "other-branch" }, {}])
    assert.equal(resolvePreviewMediaPolicy(env), "standard");
  for (const target of ["production", "development", undefined])
    assert.throws(() => resolvePreviewMediaPolicy({ VERCEL_ENV: target, VERCEL_GIT_COMMIT_REF: isolatedPreviewBranch }));
  assert.throws(() => resolvePreviewMediaPolicy({ VERCEL_ENV: "preview" }));
});

test("missing/unknown compiled policy fails closed and public toggle cannot opt in", () => {
  const old = process.env.PRIVILEGE_MEDIA_POLICY;
  process.env.NEXT_PUBLIC_ENABLE_MAPS = "true";
  try {
    for (const value of [undefined, "", "typo", "isolated"]) {
      if (value === undefined) delete process.env.PRIVILEGE_MEDIA_POLICY;
      else process.env.PRIVILEGE_MEDIA_POLICY = value;
      assert.equal(media.isIsolatedMediaPreview(), true);
    }
  } finally {
    delete process.env.NEXT_PUBLIC_ENABLE_MAPS;
    if (old === undefined) delete process.env.PRIVILEGE_MEDIA_POLICY;
    else process.env.PRIVILEGE_MEDIA_POLICY = old;
  }
});

test("Preview renders actual form/property/video components without iframes or video sources", async () => {
  const html = await renderMediaFixtures("isolated");
  for (const [name, markup] of Object.entries(html)) {
    assert.ok(!/<iframe|<video\b/i.test(markup), name);
    assert.ok(!/<(?:img|link)[^>]+(?:src|href)="https?:/i.test(markup), name);
  }
  assert.match(html.form, /Mapa indisponível neste ambiente de testes/);
  assert.match(html.page, /Mapa indisponível neste ambiente de testes/);
  assert.match(html.videos, /Mídia indisponível neste ambiente de testes/);
  assert.match(html.form, /value="Endereço fictício"/);
  assert.match(html.form, /value="-7.2"/);
  assert.match(html.form, /value="-35.8"/);
  assert.match(html.page, /Endereço fictício/);
});

test("production retains map iframes and valid YouTube/Vimeo/direct video formats", async () => {
  const html = await renderMediaFixtures("standard");
  assert.match(html.form, /<iframe[^>]+google.com\/maps/);
  assert.match(html.page, /<iframe[^>]+google.com\/maps/);
  assert.match(html.videos, /youtube.com\/embed\/abcdefghijk/);
  assert.match(html.videos, /player.vimeo.com\/video\/123456/);
  assert.match(html.videos, /<video[^>]+external.invalid\/fixture.mp4/);
});

const invalid = [
  "https://youtube.com.evil.invalid/watch?v=abcdefghijk",
  "https://notyoutube.com/watch?v=abcdefghijk", "https://youtu.be.evil.invalid/abcdefghijk",
  "https://vimeo.com.evil.invalid/123456", "https://www.google.com/maps?q=fixture",
  "https://arbitrary.invalid/tour", "javascript:alert(1)", "data:text/html,fixture",
  "http://youtube.com/watch?v=abcdefghijk", "//youtube.com/embed/abcdefghijk",
  "https://user:pass@youtube.com/watch?v=abcdefghijk",
  "https://youtube.com:444/watch?v=abcdefghijk", "https://you\\tube.com/watch?v=abcdefghijk",
];
for (const url of invalid) test("video source denies unsafe/arbitrary origin: " + url.split("?")[0], () => {
  assert.equal(video.resolveVideoSource(url), null);
});
for (const url of [
  "https://youtu.be/abcdefghijk", "https://youtube.com/watch?v=abcdefghijk",
  "https://www.youtube.com/embed/abcdefghijk", "https://youtube.com/shorts/abcdefghijk",
  "https://www.youtube-nocookie.com/embed/abcdefghijk", "https://vimeo.com/123456",
  "https://player.vimeo.com/video/123456?h=abc123", "/local.mp4",
  "https://media.invalid/movie.MOV?signature=fixture", "https://media.invalid/movie.webm",
]) test("production source supports legitimate format: " + url.split("?")[0], () => {
  assert.ok(video.resolveVideoSource(url));
});

test("Preview blocks direct videos even if external API key/public toggle is populated", () => {
  const old = process.env.PRIVILEGE_MEDIA_POLICY;
  process.env.PRIVILEGE_MEDIA_POLICY = "isolated";
  try {
    for (const url of ["https://media.invalid/movie.mp4", "/local.mp4", "https://sdpqphiooiuglywcmkxv.supabase.co/storage/v1/object/public/test/movie.mp4"]) {
      const html = renderToStaticMarkup(createElement(VideoEmbed, { url, title: "Contexto mantido" }));
      assert.ok(!html.includes("<video") && !html.includes("<iframe"));
      assert.match(html, /Contexto mantido/);
    }
    assert.equal(media.previewMediaSourceAllowed("https://sdpqphiooiuglywcmkxv.supabase.co/storage/v1/object/public/test/image.jpg"), true);
    for (const url of ["https://evil.invalid/a.jpg", "//evil.invalid/a.jpg", "/\n/evil.invalid/a.jpg", "https://sdpqphiooiuglywcmkxv.supabase.co.evil.invalid/storage/v1/a.jpg"])
      assert.equal(media.previewMediaSourceAllowed(url), false);
    assert.equal(media.previewMediaSourceAllowed("/brand/symbol-blue.png"), true);
  } finally {
    if (old === undefined) delete process.env.PRIVILEGE_MEDIA_POLICY;
    else process.env.PRIVILEGE_MEDIA_POLICY = old;
  }
});
