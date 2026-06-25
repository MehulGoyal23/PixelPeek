"""
MITRE ATT&CK Threat Mapper for Steganography Analysis Results.

Maps detected steganographic indicators to the MITRE ATT&CK framework,
providing security analysts with adversary tactic and technique context.
"""

import re
from typing import List, Optional

# Known public image hosting domains commonly used for C2 dead drops
C2_HOSTING_DOMAINS = [
    "imgur.com", "i.imgur.com",
    "postimg.cc", "postimg.org",
    "imgbb.com", "ibb.co",
    "flickr.com", "staticflickr.com",
    "s3.amazonaws.com",
    "storage.googleapis.com",
    "blob.core.windows.net",
    "raw.githubusercontent.com",
    "pastebin.com",
    "discord.com", "cdn.discordapp.com",
    "media.tumblr.com",
]

# Magic bytes for common embedded file signatures
EMBEDDED_FILE_SIGNATURES = {
    b"PK": "ZIP/Office Archive",
    b"\x1f\x8b": "GZIP Archive",
    b"Rar!": "RAR Archive",
    b"\x7fELF": "ELF Executable",
    b"MZ": "PE/Windows Executable",
    b"%PDF": "PDF Document",
    b"#!/": "Shell Script",
}


def _check_embedded_file_signature(trailing_preview: Optional[str]) -> Optional[str]:
    """Check if trailing data preview starts with known file magic bytes."""
    if not trailing_preview:
        return None
    try:
        raw = trailing_preview.encode("utf-8", errors="ignore")
        for sig, label in EMBEDDED_FILE_SIGNATURES.items():
            if raw.startswith(sig):
                return label
    except Exception:
        pass
    return None


def _check_encoding_patterns(trailing_preview: Optional[str]) -> bool:
    """Check if trailing data looks like base64 or hex-encoded content."""
    if not trailing_preview or len(trailing_preview) < 16:
        return False
    sample = trailing_preview[:200].strip()
    # Base64 pattern: long runs of [A-Za-z0-9+/=] with no spaces
    if re.fullmatch(r"[A-Za-z0-9+/=\r\n]{16,}", sample):
        return True
    # Hex pattern: long runs of [0-9a-fA-F]
    if re.fullmatch(r"[0-9a-fA-F\r\n]{16,}", sample):
        return True
    return False


def map_to_mitre(
    analysis_result: dict,
    source_url: Optional[str] = None,
) -> List[dict]:
    """
    Evaluates steganography analysis results and returns a list of
    MITRE ATT&CK technique mappings with confidence levels.

    Args:
        analysis_result: The dictionary returned by the stego analyze endpoint,
                         containing 'trailing_data' and 'entropy' keys.
        source_url:      Optional URL from which the image was originally sourced.

    Returns:
        A list of dicts, each representing a mapped MITRE ATT&CK technique.
    """
    mappings: List[dict] = []

    trailing = analysis_result.get("trailing_data", {})
    entropy = analysis_result.get("entropy", {})

    has_trailing = trailing.get("has_trailing_data", False)
    is_entropy_suspected = entropy.get("suspected", False)
    trailing_preview = trailing.get("preview")
    trailing_is_text = trailing.get("is_text", False)
    trailing_length = trailing.get("length", 0)

    # ──────────────────────────────────────────────
    # T1027.003 — Steganography (Defense Evasion)
    # ──────────────────────────────────────────────
    if has_trailing or is_entropy_suspected:
        reasons = []
        if has_trailing:
            reasons.append(
                f"Trailing data ({trailing_length} bytes) detected after the "
                f"image EOF marker."
            )
        if is_entropy_suspected:
            reasons.append(
                "LSB entropy analysis indicates abnormally high randomness "
                "across color channels, consistent with encrypted steganographic "
                "payloads."
            )

        mappings.append({
            "id": "T1027.003",
            "name": "Obfuscated Files or Information: Steganography",
            "tactic": "Defense Evasion",
            "confidence": "High" if has_trailing else "Medium",
            "url": "https://attack.mitre.org/techniques/T1027/003/",
            "description": " ".join(reasons),
        })

    # ──────────────────────────────────────────────
    # T1564.005 — Hidden File System (Defense Evasion)
    # Triggered when trailing data contains embedded file signatures
    # ──────────────────────────────────────────────
    if has_trailing:
        embedded_type = _check_embedded_file_signature(trailing_preview)
        if embedded_type:
            mappings.append({
                "id": "T1564.005",
                "name": "Hide Artifacts: Hidden File System",
                "tactic": "Defense Evasion",
                "confidence": "High",
                "url": "https://attack.mitre.org/techniques/T1564/005/",
                "description": (
                    f"Trailing data begins with a {embedded_type} file signature, "
                    f"indicating a file has been concatenated to the image to evade "
                    f"detection by standard file-type inspection tools."
                ),
            })

    # ──────────────────────────────────────────────
    # T1132.001 — Data Encoding: Standard Encoding (C2)
    # Triggered when trailing data looks like base64/hex encoded content
    # ──────────────────────────────────────────────
    if has_trailing and trailing_is_text:
        if _check_encoding_patterns(trailing_preview):
            mappings.append({
                "id": "T1132.001",
                "name": "Data Encoding: Standard Encoding",
                "tactic": "Command and Control",
                "confidence": "Medium",
                "url": "https://attack.mitre.org/techniques/T1132/001/",
                "description": (
                    "Appended trailing text matches Base64 or hexadecimal encoding "
                    "patterns, a technique commonly used to encode C2 instructions "
                    "or exfiltrated data within image carriers."
                ),
            })

    # ──────────────────────────────────────────────
    # T1001.002 — Data Obfuscation: Steganography (C2)
    # Triggered when LSB embedding is suspected (implies active C2 channel)
    # ──────────────────────────────────────────────
    if is_entropy_suspected:
        mappings.append({
            "id": "T1001.002",
            "name": "Data Obfuscation: Steganography",
            "tactic": "Command and Control",
            "confidence": "Medium",
            "url": "https://attack.mitre.org/techniques/T1001/002/",
            "description": (
                "High-entropy LSB distribution suggests pixel-level data embedding. "
                "Adversaries use LSB steganography to conceal C2 commands or "
                "configuration payloads within seemingly benign images distributed "
                "through legitimate channels."
            ),
        })

    # ──────────────────────────────────────────────
    # T1102 — Web Service (C2)
    # Triggered when the image was sourced from a known public hosting site
    # ──────────────────────────────────────────────
    if source_url and (has_trailing or is_entropy_suspected):
        url_lower = source_url.lower()
        matched_domain = None
        for domain in C2_HOSTING_DOMAINS:
            if domain in url_lower:
                matched_domain = domain
                break

        if matched_domain:
            mappings.append({
                "id": "T1102",
                "name": "Web Service",
                "tactic": "Command and Control",
                "confidence": "High",
                "url": "https://attack.mitre.org/techniques/T1102/",
                "description": (
                    f"Image was sourced from {matched_domain}, a public hosting "
                    f"service frequently abused by threat actors as a dead-drop "
                    f"resolver or covert C2 relay. Combined with steganographic "
                    f"indicators, this strongly suggests adversary infrastructure."
                ),
            })

    return mappings
