#!/usr/bin/env bash

# Extract reproducible inputs for convert.mjs. The source PDF is deliberately
# kept in temp/ and is not part of the repository.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
pdf_path="${1:-$root_dir/temp/PMPC-Modernising-with-Free-Software.pdf}"
output_dir="${2:-$root_dir/temp/pdf2md}"

for command_name in pdftotext pdfimages pdfinfo pdffonts; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing Poppler utility: $command_name" >&2
		echo "Install Poppler (for example: sudo apt-get install poppler-utils) and retry." >&2
		exit 1
	fi
done

if [[ ! -f "$pdf_path" ]]; then
	echo "Source PDF not found: $pdf_path" >&2
	exit 1
fi

mkdir -p "$output_dir"
pdftotext -bbox-layout "$pdf_path" "$output_dir/layout.html"
pdfinfo "$pdf_path" > "$output_dir/pdfinfo.txt"
pdffonts "$pdf_path" > "$output_dir/fonts.txt"
pdftotext -v 2>&1 | head -n 1 > "$output_dir/poppler-version.txt"
sha256sum "$pdf_path" > "$output_dir/source.sha256"

photo_dir="$(mktemp -d)"
trap 'rm -rf "$photo_dir"' EXIT

# Extract one embedded JPEG by page and zero-based JPEG ordinal. The ordinal
# deliberately ignores mask files (.pbm), so pages with an image mask remain
# stable and readable here (notably PDF pages 1 and 23).
extract_jpeg() {
	local page="$1"
	local ordinal="$2"
	local target="$3"
	local page_dir="$photo_dir/page-$page"

	if [[ ! -d "$page_dir" ]]; then
		mkdir -p "$page_dir"
		pdfimages -f "$page" -l "$page" -j "$pdf_path" "$page_dir/image"
	fi

	local -a jpgs=()
	mapfile -t jpgs < <(find "$page_dir" -maxdepth 1 -type f -name 'image-*.jpg' -print | LC_ALL=C sort)
	if (( ordinal < 0 || ordinal >= ${#jpgs[@]} )); then
		echo "Expected JPEG ordinal $ordinal on PDF page $page, found ${#jpgs[@]} JPEG(s)." >&2
		exit 1
	fi

	cp "${jpgs[$ordinal]}" "$output_dir/$target"
}

# Photographic / campaign visuals retained in the Markdown edition. Logos and
# the signature are intentionally not included. PDF pages 16 and 17 are omitted.
extract_jpeg 1  0 cover-public-money-public-code.jpg
extract_jpeg 3  1 matthias-kirschner.jpg
extract_jpeg 7  1 francesca-bria.jpg
extract_jpeg 11 0 simon-schlauri.jpg
extract_jpeg 11 1 public-code-visual-page-11.jpg
extract_jpeg 15 0 cedric-thomas.jpg
extract_jpeg 15 1 la-defense-paris.jpg
extract_jpeg 19 0 matthias-stuermer.jpg
extract_jpeg 21 0 chaos-computer-club.jpg
extract_jpeg 23 0 public-code-visual-page-23.jpg
extract_jpeg 23 1 fernanda-weiden.jpg
extract_jpeg 29 0 basanta-thapa.jpg

echo "Extracted PDF inputs to $output_dir"
