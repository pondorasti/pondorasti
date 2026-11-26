# /// script
# requires-python = "==3.12.*"
# dependencies = [
#   "einops==0.8.2",
#   "kornia==0.9.2",
#   "numpy==2.5.5",
#   "pillow==13.0.0",
#   "pymatting==1.1.16",
#   "scipy==1.18.1",
#   "timm==1.0.31",
#   "torch==2.15.0",
#   "torchvision==0.29.2",
#   "transformers==5.24.1",
# ]
# ///
"""Lifts the subject out of each image with BiRefNet and crops it to the subject plus a thin
transparent border. Images that are already cut out are only cropped, without loading the model.
Used by scripts/images.ts; run through uv, which installs the locked dependencies
(cutout.py.lock) on first use.

    uv run --locked --script scripts/cutout.py <out-dir> <image>...

Writes <out-dir>/<n>.png for the nth image that changed and prints "<n>\t<image>\t<action>"
for it, where <action> is "lifted" when a background was removed and "cropped" otherwise.

The model is BiRefNet (MIT, https://github.com/ZhengPeng7/BiRefNet) at 1024x1024, pinned to a
Hugging Face revision and downloaded to the Hugging Face cache on first use (about 450 MB). It
runs on Apple silicon (MPS), CUDA, or the CPU (much slower). Its soft mask is kept as the alpha,
and each edge pixel's colour is re-estimated without the background showing through it
(pymatting's multilevel foreground estimation), so edges stay clean on light and dark cards.
"""

import math
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

MODEL = "ZhengPeng7/BiRefNet"
REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"
SIZE = 1024
# Alpha at or below this counts as background when finding the subject's bounds.
CLEAR = 8
# The transparent border left around the subject, as a share of its longer side.
BORDER_SHARE = 0.01


def edge(a: np.ndarray) -> np.ndarray:
    return np.concatenate([a[0], a[-1], a[1:-1, 0], a[1:-1, -1]])


def has_background(alpha: np.ndarray) -> bool:
    """Most of the outer edge is opaque. Images already cut out only touch the edge where the
    subject runs off it."""
    e = edge(alpha)
    return (e > CLEAR).sum() * 2 > e.size


def subject_bounds(alpha: np.ndarray):
    """The smallest (x0, y0, x1, y1) box holding every pixel that isn't background."""
    ys, xs = np.nonzero(alpha > CLEAR)
    if not len(xs):
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


class Matte:
    """BiRefNet, loaded on first use so runs with nothing to cut out stay fast."""

    def __init__(self):
        self.model = None

    def __call__(self, rgb: np.ndarray) -> np.ndarray:
        import torch
        import torch.nn.functional as F

        if self.model is None:
            from transformers import AutoModelForImageSegmentation

            self.device = (
                "mps" if torch.backends.mps.is_available()
                else "cuda" if torch.cuda.is_available()
                else "cpu"
            )
            self.dtype = torch.float32 if self.device == "cpu" else torch.float16
            self.model = AutoModelForImageSegmentation.from_pretrained(
                MODEL, revision=REVISION, trust_remote_code=True
            )
            self.model.to(self.device, self.dtype).eval()
        h, w = rgb.shape[:2]
        x = torch.from_numpy(rgb).permute(2, 0, 1)[None].float()
        x = F.interpolate(x, size=(SIZE, SIZE), mode="bilinear", align_corners=False, antialias=True)
        mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
        x = ((x - mean) / std).to(self.device, self.dtype)
        with torch.no_grad():
            pred = self.model(x)[-1].sigmoid().float()
        pred = F.interpolate(pred, size=(h, w), mode="bilinear", align_corners=False)
        return pred[0, 0].clamp(0, 1).cpu().numpy().astype(np.float64)


def decontaminate(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """The subject's own colour at its edges, with the background taken back out."""
    from pymatting import estimate_foreground_ml

    return np.clip(estimate_foreground_ml(rgb, alpha), 0, 1)


def clear_white_background(rgba: np.ndarray):
    """Fallback when the model finds no subject: clears the near-white background connected to
    the image's edges."""
    from scipy import ndimage

    white = (rgba[..., :3] >= 235).all(-1)
    if edge(white).sum() * 2 <= edge(white).size:
        return None
    labels, _ = ndimage.label(white)
    touching = np.unique(edge(labels))
    background = np.isin(labels, touching[touching > 0])
    out = rgba.copy()
    out[background] = 0
    return out


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print("usage: cutout.py <out-dir> <image>...", file=sys.stderr)
        sys.exit(2)
    out_dir, paths = Path(args[0]), args[1:]
    matte = Matte()
    for index, path in enumerate(paths):
        try:
            original = np.asarray(Image.open(path).convert("RGBA"))
        except OSError:
            print(f"{path}: can't read", file=sys.stderr)
            continue
        image = original
        if has_background(original[..., 3]):
            rgb = original[..., :3].astype(np.float64) / 255
            alpha = matte(rgb)
            if (alpha * 255 > CLEAR).any():
                fg = decontaminate(rgb, alpha)
                image = (np.dstack([fg, alpha]) * 255).round().astype(np.uint8)
            elif (cleared := clear_white_background(original)) is not None:
                print(f"{path}: no subject found, cleared the white background instead", file=sys.stderr)
                image = cleared
            else:
                print(f"{path}: no subject found, left as is", file=sys.stderr)
                continue
        bounds = subject_bounds(image[..., 3])
        if bounds is None:
            continue
        x0, y0, x1, y1 = bounds
        h, w = image.shape[:2]
        # A thin transparent border keeps the edges clear, so a cropped boxy subject doesn't read
        # as a background on the next run, and an image that already has one is left alone.
        border = max(2, math.floor(max(x1 - x0, y1 - y0) * BORDER_SHARE + 0.5))
        gaps = [x0, y0, w - x1, h - y1]
        if image is original and all(1 <= g <= border + 2 for g in gaps):
            continue
        crop = image[y0:y1, x0:x1]
        canvas = np.zeros((y1 - y0 + border * 2, x1 - x0 + border * 2, 4), np.uint8)
        canvas[border:border + crop.shape[0], border:border + crop.shape[1]] = crop
        Image.fromarray(canvas, "RGBA").save(out_dir / f"{index}.png")
        action = "cropped" if image is original else "lifted"
        print(f"{index}\t{path}\t{action}", flush=True)


if __name__ == "__main__":
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    main()
