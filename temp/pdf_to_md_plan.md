# Deterministic PDF-to-Markdown import

## Summary

Add a reproducible Poppler + Node conversion pipeline for `temp/PMPC-Modernising-with-Free-Software.pdf`, then import the reviewed English transcription into the Astro Starlight site.

The PDF itself remains uncommitted; generated Markdown and infographic assets become site content.

## Implementation changes

- Add a `tools/pdf2md/` pipeline containing:
  - `extract.sh` using `pdftotext -bbox-layout`, `pdftoppm`, `pdfinfo`, and `pdffonts`.
  - `convert.mjs` using exact-pinned `fast-xml-parser`.
  - `layout.json` defining reading-order regions for every page.
  - `fixups.json` for verified compound-word and line-wrap corrections.
  - A layout-debug output mode showing extracted blocks and coordinates.
- Add npm scripts for extraction, conversion, and deterministic verification.
- Add Poppler preflight checks with a clear installation error; record Poppler version, PDF metadata, source hash, and font metadata.
- Configure strict coverage validation: conversion fails on any non-page-number text block not assigned to a region.
- Render infographic pages 16–17 as PNG assets and preserve them in Markdown with alt text.
- Generate the imported document under a new `src/content/docs/modernising-with-free-software/` section, with co-located image assets and Starlight-compatible frontmatter.
- Add the new section to `astro.config.mjs` with an explicit sidebar entry.
- Keep the source PDF in ignored `temp/`; commit only the converter configuration, generated Markdown, and required site assets.

The site integration will follow Astro’s content-collection and route conventions, with no new collection or custom route required. ([Astro content collections](https://docs.astro.build/en/guides/content-collections/), [Astro routing](https://docs.astro.build/en/guides/routing/))

## Assumptions

- The imported content is an English transcription, not a Japanese translation.
- The result is one Starlight document/section rather than separate pages per PDF page.
- Pages 16–17 are represented as images, with textual accessibility transcription out of scope for this pass.
- Poppler is an external system dependency and will be documented rather than added to npm.
- Exact layout rectangles and fixups will be derived from the extracted coordinates and reviewed output, not guessed in advance.
