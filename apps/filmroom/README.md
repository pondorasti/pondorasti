# Filmroom

A personal viewer for the four original projections from the September 8, 2026 right shoulder study. The images and DICOM ZIP are committed with the app, like the bundled data in `biomarkers` and `buff`. Opening the page loads the study automatically.

The interface follows macOS light and dark appearance. Full-resolution DICOM pixels are decoded in a browser worker, preserving their 12-bit values for windowing, comparison, and PNG export.

## Bundled study

- `public/study/DICOM/` contains the four unchanged original DICOM images.
- `public/study/DICOMDIR` is the original study index.
- `public/study/right-shoulder-xray-dicom.zip` is the unchanged four-image archive, including DICOMDIR.
- `src/study.json` defines projection names, ordering, asset paths, dimensions, and reference hashes.

These are the actual medical images, with their original DICOM metadata. They are included in the public repository and copied into each deployed build. This is a fixed study app; there is no file-import step or upload service. It is a personal image browser, not a validated diagnostic workstation.

## Run locally

From the repository root, using Bun 1.4 or newer:

```sh
bun install --frozen-lockfile
bun run --cwd apps/filmroom dev
```

Open the loopback URL printed by Vite. The study loads automatically.

```sh
bun run --cwd apps/filmroom test
bun run --cwd apps/filmroom build
bun run --cwd apps/filmroom preview
```

The production build in `apps/filmroom/dist` contains the application, decoder, WebAssembly binary, and complete `study` asset directory. Serve it over HTTP; no external CDN or local file selection is needed. Relative URLs support hosting under a subpath.

## Deploy to Hunk

[Open Filmroom in Hunk](https://app.hunk.851.sh/domain-851-sh/filmroom). The deployment is visible to the `851.sh` workspace.

Install the [Hunk CLI](https://www.npmjs.com/package/@851-labs/hunk) and run `hunk login` with an account in that workspace. Then, from the repository root:

```sh
bun run --cwd apps/filmroom deploy
```

The checked-in `.hunk/config.json` contains the stable Hunk ID, with no credentials. The deploy command rebuilds the app, copies that link into the build directory, and pushes only `dist` to the existing hunk. Hunk excludes `.hunk` from uploaded assets. Keep the source configuration in place: Vite replaces the build directory on each build.

## Controls

| Action | Control |
| --- | --- |
| Select image | Sidebar, `1`–`4`, or left/right arrows |
| Pan | Drag with the Pan tool (`V`) |
| Window level / width | Inspector sliders, or vertical/horizontal drag with Window (`W`) |
| Zoom | Scroll, pinch, or `+` / `−` |
| Fit | Double-click or `F` |
| Reset selected image | `R` |
| Invert | `I` |
| Compare | `C`; all four projections |
| Rotate / flip | Toolbar |

Each image keeps its own window, zoom, and orientation. In comparison mode, select a viewport before adjusting it. Reloading restores the original display settings.

**Export PNG** saves the full image with its current window, inversion, rotation, and flip. Zoom and pan do not crop the export. **Save DICOM originals** downloads the committed ZIP byte for byte, including all four images and DICOMDIR. The original metadata is preserved.

## Validation

The bundled-study tests verify every source DICOM against its reference SHA-256 hash, compare the extracted originals with the ZIP entries, and check the archive hash. All four decoded pixel buffers must match the independent pydicom reference hashes in the manifest.

The renderer and parser also have synthetic tests for windowing boundaries, signed pixels, rescale, grayscale polarity, unsupported formats, and lossless JPEG 2000 decoding. `test/fixtures/gradient.j2k` is a synthetic 16 × 16 grayscale ramp.

The app uses [dicom-parser](https://github.com/cornerstonejs/dicomParser) and [Cornerstone's OpenJPEG codec](https://github.com/cornerstonejs/codecs), bundled with Vite. Tests use Bun's built-in runner and fflate for archive verification.
