# Filmroom

A personal viewer for the four original projections from the September 8, 2026 right shoulder study. The images and DICOM ZIP are committed with the app. Opening the page loads the study automatically.

The interface follows macOS light and dark appearance. Full-resolution DICOM pixels are decoded in a browser worker, preserving their 12-bit values for windowing, comparison, and PNG export.

## Stack

TanStack Start and Router, React, Base UI and Tailwind CSS, served by a Cloudflare Worker at [filmroom.alexandru.so](https://filmroom.alexandru.so). The page shell is server-rendered; decoding and drawing happen in the browser:

- `src/dicom/` parses DICOM (`loader.ts`), decodes lossless JPEG 2000 (`jpeg2000.ts`, OpenJPEG WebAssembly), applies LINEAR windowing (`renderer.ts`) and loads the bundled study in a worker (`study.worker.ts`).
- `src/viewer/view.ts` owns each projection's canvas: windowing, pan, zoom, rotation, flip and export. `use-filmroom.ts` holds the rest of the viewer state.
- `src/components/` is the interface, built from Base UI primitives.

## Bundled study

- `public/study/DICOM/` contains the four unchanged original DICOM images.
- `public/study/right-shoulder-xray-dicom.zip` is the unchanged four-image archive, including DICOMDIR.
- `src/dicom/study.json` defines projection names, ordering, asset paths, dimensions, and reference hashes.

These are the actual medical images, with their original DICOM metadata. They are included in the public repository and served as static assets with each deployment. This is a fixed study app; there is no file-import step or upload service. It is a personal image browser, not a validated diagnostic workstation.

## Run locally

From the repository root:

```sh
bun install
bun run --cwd apps/filmroom dev
```

Open the URL printed by Vite. The study loads automatically.

```sh
bun run --cwd apps/filmroom test
bun run --cwd apps/filmroom build
bun run --cwd apps/filmroom preview
```

`preview` serves the production build in the local Workers runtime.

## Deploy

Pushing to `main` deploys automatically. The `alexandru-filmroom` Worker is connected to this repository through Cloudflare Workers Builds, which runs `bun run typecheck && bun run test && bun run build` and then `npx wrangler deploy` from `apps/filmroom`, but only when a push touches `apps/filmroom/*` or `bun.lock`. Build logs are in the Cloudflare dashboard under the Worker's Deployments; commits get a status check on GitHub.

To deploy by hand from your machine (with an authorized Wrangler login):

```sh
bun run --cwd apps/filmroom deploy
```

The deploy script builds the app and runs `wrangler deploy`. The Worker (`alexandru-filmroom`) and its custom domain are declared in `wrangler.jsonc`; deploying configures DNS and TLS. Use an authorized Wrangler login or an appropriately scoped token.

## Controls

| Action               | Control                                                          |
| -------------------- | ---------------------------------------------------------------- |
| Select image         | Sidebar, `1`–`4`, or left/right arrows                           |
| Pan                  | Drag with the Pan tool (`V`)                                     |
| Window level / width | Inspector sliders, or vertical/horizontal drag with Window (`W`) |
| Zoom                 | Scroll, pinch, or `+` / `−`                                      |
| Fit                  | Double-click or `F`                                              |
| Reset selected image | `R`                                                              |
| Invert               | `I`                                                              |
| Compare              | `C`; all four projections                                        |
| Rotate / flip        | Toolbar                                                          |

Each image keeps its own window, zoom, and orientation. In comparison mode, select a viewport before adjusting it. Reloading restores the original display settings.

**Export PNG** saves the full image with its current window, inversion, rotation, and flip. Zoom and pan do not crop the export. **Save DICOM originals** downloads the committed ZIP byte for byte, including all four images and DICOMDIR. The original metadata is preserved.

## Validation

The bundled-study tests verify every source DICOM against its reference SHA-256 hash, compare the extracted originals with the ZIP entries, and check the archive hash. All four decoded pixel buffers must match the independent pydicom reference hashes in the manifest.

The renderer and parser also have synthetic tests for windowing boundaries, signed pixels, rescale, grayscale polarity, unsupported formats, and lossless JPEG 2000 decoding. `test/fixtures/gradient.j2k` is a synthetic 16 × 16 grayscale ramp.

The app uses [dicom-parser](https://github.com/cornerstonejs/dicomParser) and [Cornerstone's OpenJPEG codec](https://github.com/cornerstonejs/codecs), bundled with Vite. Tests run with Vitest and use fflate for archive verification.
