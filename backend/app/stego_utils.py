import math
import os
from PIL import Image

def find_jpeg_eof(data: bytes) -> int:
    """
    Parses JPEG segment markers to find the exact EOI (End of Image) pointer.
    This prevents false positives from trailing steganographic bytes.
    """
    if not data.startswith(b'\xff\xd8'):
        return -1
        
    idx = 2
    limit = len(data)
    
    while idx < limit - 1:
        marker = data[idx:idx+2]
        if marker[0] != 0xff:
            # Corrupted marker, fallback to simple reverse search
            return data.rfind(b'\xff\xd9')
            
        if marker == b'\xff\xd9': # EOI
            return idx + 2
        elif marker == b'\xff\xda': # SOS (Start of Scan)
            if idx + 4 > limit:
                return -1
            header_len = int.from_bytes(data[idx+2:idx+4], 'big')
            idx += 2 + header_len
            
            # Search for the EOI (ff d9) inside the scan stream, ignoring byte-stuffed ff 00
            while idx < limit - 1:
                b = data[idx]
                if b == 0xff:
                    next_b = data[idx+1]
                    if next_b == 0xd9:
                        return idx + 2
                    elif next_b == 0x00:
                        idx += 2
                    elif 0xd0 <= next_b <= 0xd7:  # Restart markers (RST0-RST7)
                        idx += 2
                    else:
                        idx += 2
                else:
                    idx += 1
            return -1
        else:
            # Length-prefixed marker segments
            if idx + 4 > limit:
                return -1
            segment_len = int.from_bytes(data[idx+2:idx+4], 'big')
            idx += 2 + segment_len
            
    return -1

def scan_trailing_data(image_path: str) -> dict:
    """
    Scans an image for trailing data appended after its official format EOF marker.
    Supports JPEG and PNG.
    """
    try:
        with open(image_path, 'rb') as f:
            data = f.read()
            
        eof_offset = -1
        if data.startswith(b'\xff\xd8'):  # JPEG
            eof_offset = find_jpeg_eof(data)
        elif b'IEND\xae\x42\x60\x82' in data:  # PNG
            pos = data.find(b'IEND\xae\x42\x60\x82')
            eof_offset = pos + 8  # Add length of IEND signature (4 bytes) + CRC (4 bytes)
            
        if eof_offset != -1 and eof_offset < len(data):
            trailing = data[eof_offset:]
            if len(trailing.strip()) > 0:
                # Try decoding preview as ASCII/UTF-8 text
                try:
                    text_preview = trailing.decode('utf-8', errors='ignore')
                    # If it contains standard printable chars and line endings, flag as text
                    is_text = all(32 <= ord(c) < 127 or c in '\r\n\t' for c in text_preview[:150])
                except Exception:
                    is_text = False
                    text_preview = ""
                    
                return {
                    "has_trailing_data": True,
                    "length": len(trailing),
                    "preview": text_preview[:300] if is_text else None,
                    "is_text": is_text
                }
    except Exception as e:
        print(f"Error scanning trailing data in {image_path}: {e}")
        
    return {
        "has_trailing_data": False,
        "length": 0,
        "preview": None,
        "is_text": False
    }

def analyze_entropy(image_path: str) -> dict:
    """
    Computes Shannon entropy of the Least Significant Bits (LSB) across color channels.
    LSB entropy close to 1.0 (e.g., > 0.998) indicates high randomness,
    which is a strong heuristic for encrypted LSB payloads.
    """
    try:
        with Image.open(image_path) as img:
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
                
            width, height = img.size
            # Sample a subset of pixels for performance on large images
            max_samples = 50000
            total_pixels = width * height
            
            # Fetch pixel data
            pixels = list(img.getdata())
            if total_pixels > max_samples:
                # Evenly spaced sample
                step = total_pixels // max_samples
                pixels = pixels[::step][:max_samples]
                
            total = len(pixels)
            if total == 0:
                return {"suspected": False, "channels": {}}
                
            channel_info = {}
            channels_to_scan = ['R', 'G', 'B']
            lsb_threshold = 0.999  # Extreme randomness trigger
            suspected = False
            
            for idx, ch in enumerate(channels_to_scan):
                # Calculate LSB value distribution (0 vs 1)
                p1 = sum((pixel[idx] & 1) for pixel in pixels) / total
                p0 = 1.0 - p1
                
                if p0 == 0.0 or p1 == 0.0:
                    lsb_entropy = 0.0
                else:
                    lsb_entropy = -p0 * math.log2(p0) - p1 * math.log2(p1)
                
                # Overall byte value entropy (0-255)
                counts = [0] * 256
                for px in pixels:
                    counts[px[idx]] += 1
                ch_entropy = 0.0
                for c in counts:
                    if c > 0:
                        p = c / total
                        ch_entropy -= p * math.log2(p)
                        
                channel_info[ch] = {
                    "lsb_entropy": round(lsb_entropy, 5),
                    "channel_entropy": round(ch_entropy, 5),
                    "ones_ratio": round(p1, 4)
                }
                
                # Trigger suspicion if LSB entropy is highly random (near 1.0)
                # but overall channel entropy is normal (not pure white noise image)
                # Pure noise images have channel_entropy > 7.95
                if lsb_entropy > lsb_threshold and ch_entropy < 7.95:
                    suspected = True
                    
            return {
                "suspected": suspected,
                "channels": channel_info
            }
            
    except Exception as e:
        print(f"Error calculating entropy for {image_path}: {e}")
        
    return {
        "suspected": False,
        "channels": {}
    }

def decode_lsb(
    image_path: str,
    channels: str = "RGB",
    num_bits: int = 1,
    stop_marker: str = None
) -> bytes:
    """
    Decodes LSB steganographic data from an image.
    Returns the decoded bytes.
    """
    try:
        with Image.open(image_path) as img:
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
                
            width, height = img.size
            channel_map = {'R': 0, 'G': 1, 'B': 2, 'A': 3}
            channel_indices = [channel_map[c] for c in channels if c in channel_map]
            
            if 'A' in channels and img.mode != 'RGBA':
                img = img.convert('RGBA')
                
            pixels = img.load()
            bit_buffer = []
            byte_buffer = bytearray()
            
            # Prepare stop marker bytes
            stop_bytes = None
            if stop_marker:
                # Handle escape sequences if input
                try:
                    stop_bytes = stop_marker.encode('utf-8').decode('unicode_escape').encode('utf-8')
                except Exception:
                    stop_bytes = stop_marker.encode('utf-8')
                    
            found_stop = False
            for y in range(height):
                if found_stop:
                    break
                for x in range(width):
                    if found_stop:
                        break
                    pixel = pixels[x, y]
                    for ch_idx in channel_indices:
                        val = pixel[ch_idx]
                        # Extract lowest bits, MSB of bits first
                        for bit_idx in range(num_bits - 1, -1, -1):
                            bit = (val >> bit_idx) & 1
                            bit_buffer.append(bit)
                            
                            if len(bit_buffer) == 8:
                                # Assemble bits to byte
                                byte_val = 0
                                for b in bit_buffer:
                                    byte_val = (byte_val << 1) | b
                                byte_buffer.append(byte_val)
                                bit_buffer = []
                                
                                # Check if stop marker matches
                                if stop_bytes and len(byte_buffer) >= len(stop_bytes):
                                    if byte_buffer[-len(stop_bytes):] == stop_bytes:
                                        # Trim stop marker
                                        byte_buffer = byte_buffer[:-len(stop_bytes)]
                                        found_stop = True
                                        break
                                        
            return bytes(byte_buffer)
            
    except Exception as e:
        print(f"Error decoding LSB in {image_path}: {e}")
        
    return b""
