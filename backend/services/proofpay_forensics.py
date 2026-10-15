"""
ProofPay Image Forensics Engine.
Performs defensible heuristic forensic checks on payment screenshots:
1. Dimension & pixel count validation (decompression bomb guard)
2. Metadata & EXIF inspection (editing software detection)
3. Error Level Analysis (ELA - localized compression variance)
4. Laplacian high-frequency noise & edge consistency analysis
5. Cryptographic (SHA-256) & Perceptual (dHash) fingerprinting
"""

import io
import hashlib
import numpy as np
from PIL import Image, ImageChops, ImageFilter
from typing import Dict, Any, List, Tuple, Optional

# Security constraint: max 25 Megapixels to prevent decompression bombs
MAX_PIXELS = 25_000_000

class ProofPayForensicsEngine:
    def __init__(self):
        pass

    def compute_sha256(self, image_bytes: bytes) -> str:
        """Returns hex SHA-256 cryptographic digest of raw image bytes."""
        return hashlib.sha256(image_bytes).hexdigest()

    def compute_dhash(self, image: Image.Image, hash_size: int = 8) -> str:
        """
        Computes 64-bit difference perceptual hash (dHash) using grayscale gradients.
        Fast, robust to minor recompression, and 100% deterministic without heavy dependencies.
        """
        try:
            # Resize to (width = hash_size + 1, height = hash_size)
            resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = np.array(resized, dtype=np.int32)
            # Compare adjacent pixels (difference gradient)
            diff = pixels[:, 1:] > pixels[:, :-1]
            # Convert binary array to hex string
            decimal_value = 0
            for idx, bit in enumerate(diff.flatten()):
                if bit:
                    decimal_value += 1 << idx
            return f"{decimal_value:016x}"
        except Exception as e:
            print(f"dHash error: {e}")
            return "0000000000000000"

    def hamming_distance(self, hash1: str, hash2: str) -> int:
        """Computes bitwise Hamming distance between two 16-hex perceptual hashes."""
        try:
            val1 = int(hash1, 16)
            val2 = int(hash2, 16)
            xor_val = val1 ^ val2
            return bin(xor_val).count("1")
        except Exception:
            return 64

    def extract_metadata(self, image: Image.Image) -> Dict[str, Any]:
        """Extracts EXIF metadata tags and checks for known graphics editor signatures."""
        info = {
            "has_exif": False,
            "software": None,
            "datetime_original": None,
            "make": None,
            "model": None,
            "editor_detected": False,
            "editor_name": None,
            "raw_tags": {}
        }
        try:
            exif = image.getexif()
            if exif:
                info["has_exif"] = True
                for tag_id, value in exif.items():
                    val_str = str(value)
                    # Tag 305 = Software, 271 = Make, 272 = Model, 306 = DateTime
                    if tag_id == 305:
                        info["software"] = val_str
                    elif tag_id == 271:
                        info["make"] = val_str
                    elif tag_id == 272:
                        info["model"] = val_str
                    elif tag_id == 306:
                        info["datetime_original"] = val_str
                    
                    if len(info["raw_tags"]) < 10:
                        info["raw_tags"][str(tag_id)] = val_str[:60]

                # Check for editing software signatures
                known_editors = [
                    "photoshop", "canva", "gimp", "pixelmator", "lightroom",
                    "inshot", "picsart", "snapseed", "photo editor", "pixlr"
                ]
                software_str = (info["software"] or "").lower()
                for editor in known_editors:
                    if editor in software_str:
                        info["editor_detected"] = True
                        info["editor_name"] = info["software"]
                        break
        except Exception as e:
            print(f"EXIF parsing notice: {e}")

        return info

    def error_level_analysis(self, image: Image.Image, quality: int = 90) -> Dict[str, Any]:
        """
        Error Level Analysis (ELA): Re-compresses image at 90% JPEG quality
        and computes the absolute difference map to detect localized compression discrepancies.
        """
        rgb_img = image.convert("RGB")
        w, h = rgb_img.size

        # Buffer re-compression
        buf = io.BytesIO()
        rgb_img.save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        recompressed = Image.open(buf)

        # Difference
        diff = ImageChops.difference(rgb_img, recompressed)
        diff_arr = np.array(diff, dtype=np.float32)

        mean_delta = float(np.mean(diff_arr))
        max_delta = float(np.max(diff_arr))
        std_delta = float(np.std(diff_arr))

        # Local patch grid analysis (8x8 grid) to locate anomalous regions
        patch_w = max(1, w // 8)
        patch_h = max(1, h // 8)
        suspicious_patches = []

        grid_means = []
        for row in range(8):
            for col in range(8):
                y1 = row * patch_h
                y2 = min(h, (row + 1) * patch_h)
                x1 = col * patch_w
                x2 = min(w, (col + 1) * patch_w)
                patch = diff_arr[y1:y2, x1:x2]
                if patch.size > 0:
                    p_mean = float(np.mean(patch))
                    grid_means.append((p_mean, row, col, x1, y1, x2, y2))

        if grid_means:
            overall_median = float(np.median([g[0] for g in grid_means]))
            overall_std = float(np.std([g[0] for g in grid_means]))
            
            # Patches whose error level exceeds median + 2.5 * std indicate localized recompression
            threshold = overall_median + max(3.0, 2.5 * overall_std)
            for p_mean, r, c, x1, y1, x2, y2 in grid_means:
                if p_mean > threshold and p_mean > 8.0:
                    suspicious_patches.append({
                        "box": [round((y1 / h) * 100, 1), round((x1 / w) * 100, 1), round((y2 / h) * 100, 1), round((x2 / w) * 100, 1)],
                        "error_level": round(p_mean, 2),
                        "region_description": f"Grid ({r},{c}) ELA Delta: {p_mean:.1f}"
                    })

        return {
            "mean_delta": round(mean_delta, 2),
            "max_delta": round(max_delta, 2),
            "std_delta": round(std_delta, 2),
            "suspicious_patches": suspicious_patches[:4]  # Return top 4 distinct regions
        }

    def laplacian_noise_analysis(self, image: Image.Image) -> Dict[str, Any]:
        """
        Computes Laplacian high-frequency edge variance.
        Detects artificial smoothness or splice boundaries where text was pasted.
        """
        gray = image.convert("L")
        w, h = gray.size
        arr = np.array(gray, dtype=np.float32)

        # 3x3 Laplacian kernel convolution using pure NumPy
        kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
        pad_arr = np.pad(arr, ((1, 1), (1, 1)), mode="reflect")
        
        # Convolve
        laplacian = (
            pad_arr[:-2, 1:-1] * kernel[0, 1] +
            pad_arr[1:-1, :-2] * kernel[1, 0] +
            pad_arr[1:-1, 1:-1] * kernel[1, 1] +
            pad_arr[1:-1, 2:] * kernel[1, 2] +
            pad_arr[2:, 1:-1] * kernel[2, 1]
        )

        global_variance = float(np.var(laplacian))

        # Check for abnormal variance in central text zone (typically y: 20%-70%)
        y_start = int(h * 0.20)
        y_end = int(h * 0.70)
        center_zone = laplacian[y_start:y_end, :]
        center_variance = float(np.var(center_zone)) if center_zone.size > 0 else global_variance

        noise_ratio = round(center_variance / max(1.0, global_variance), 2)
        has_abnormal_gradient = noise_ratio > 3.0 or noise_ratio < 0.25

        return {
            "global_variance": round(global_variance, 2),
            "center_variance": round(center_variance, 2),
            "noise_ratio": noise_ratio,
            "has_abnormal_gradient": has_abnormal_gradient
        }

    def analyze_image_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Executes complete defensive forensic analysis pipeline on raw image bytes.
        Returns cryptographic hashes, metadata, ELA metrics, noise metrics, and findings.
        """
        # File size check
        size_bytes = len(image_bytes)
        if size_bytes > 10 * 1024 * 1024:
            raise ValueError("File exceeds maximum allowed size of 10 MB.")

        sha256 = self.compute_sha256(image_bytes)

        # Open and validate image format
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            image = Image.open(io.BytesIO(image_bytes))  # Reopen after verify()
        except Exception as err:
            raise ValueError(f"Invalid or corrupted image format: {err}")

        # Decompression bomb guard
        w, h = image.size
        if (w * h) > MAX_PIXELS:
            raise ValueError(f"Image resolution ({w}x{h}) exceeds safe 25 Megapixel limit.")

        format_name = image.format or "UNKNOWN"
        phash = self.compute_dhash(image)
        exif = self.extract_metadata(image)
        ela = self.error_level_analysis(image)
        noise = self.laplacian_noise_analysis(image)

        # Evaluate heuristic findings
        findings = []
        anomaly_regions = []

        # 1. Editor software observation
        if exif.get("editor_detected"):
            findings.append({
                "engine": "exif_forensics",
                "severity": "high",
                "message": f"Graphics editing software detected in metadata signature: {exif.get('editor_name')}"
            })

        # 2. Localized ELA Compression Discrepancy
        if len(ela.get("suspicious_patches", [])) > 0:
            findings.append({
                "engine": "ela_compression",
                "severity": "medium",
                "message": f"Localized JPEG compression variance detected across {len(ela['suspicious_patches'])} block(s)"
            })
            for patch in ela["suspicious_patches"]:
                anomaly_regions.append({
                    "box": patch["box"],
                    "label": "Compression Artifact",
                    "confidence": 0.72
                })

        # 3. High-Frequency Noise Inconsistency
        if noise.get("has_abnormal_gradient"):
            findings.append({
                "engine": "noise_variance",
                "severity": "low",
                "message": f"Central content zone displays non-uniform noise ratio ({noise['noise_ratio']}x global variance)"
            })

        # Determine Visual Integrity Classification
        # Requirement: Image heuristics are heuristic indicators, NOT definitive proof of fraud.
        if exif.get("editor_detected") or len(anomaly_regions) >= 2:
            visual_integrity = "SUSPICIOUS_ANOMALIES"
        elif len(findings) > 0:
            visual_integrity = "INCONCLUSIVE"
        else:
            visual_integrity = "NO_OBVIOUS_ANOMALIES"

        return {
            "sha256_hash": sha256,
            "phash": phash,
            "file_size_kb": round(size_bytes / 1024, 1),
            "format": format_name,
            "dimensions": {"width": w, "height": h, "aspect_ratio": round(w / max(1, h), 2)},
            "exif_metadata": exif,
            "ela_metrics": ela,
            "noise_metrics": noise,
            "findings": findings,
            "anomaly_regions": anomaly_regions,
            "visual_integrity": visual_integrity
        }

forensics_engine = ProofPayForensicsEngine()
