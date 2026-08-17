#!/usr/bin/env bash

# Extract reproducible inputs for convert.mjs. The source PDF is deliberately
# kept in temp/ and is not part of the repository.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
pdf_path="${1:-$root_dir/temp/PMPC-Modernising-with-Free-Software.pdf}"
output_dir="${2:-$root_dir/temp/pdf2md}"

for command_name in pdftotext pdftoppm pdfimages pdfinfo pdffonts; do
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
pdfimages -f 3 -l 3 -j "$pdf_path" "$photo_dir/image"
mv "$photo_dir/image-001.jpg" "$output_dir/matthias-kirschner.jpg"

echo "Extracted PDF inputs to $output_dir"
