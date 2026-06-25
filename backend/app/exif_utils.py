import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def convert_to_degrees(value):
    """
    Helper function to convert GPS coordinates stored in degrees, minutes, and seconds
    to float decimal degrees.
    """
    d, m, s = 0.0, 0.0, 0.0
    
    def to_float(val):
        if hasattr(val, 'numerator') and hasattr(val, 'denominator') and val.denominator != 0:
            return float(val.numerator) / float(val.denominator)
        elif isinstance(val, tuple) and len(val) == 2 and val[1] != 0:
            return float(val[0]) / float(val[1])
        else:
            try:
                return float(val)
            except Exception:
                return 0.0
                
    if len(value) >= 1:
        d = to_float(value[0])
    if len(value) >= 2:
        m = to_float(value[1])
    if len(value) >= 3:
        s = to_float(value[2])
        
    return d + (m / 60.0) + (s / 3600.0)

def extract_exif(image_path: str) -> dict:
    """
    Extracts EXIF metadata from an image.
    Returns a dictionary of metadata attributes.
    """
    metadata = {
        "width": 0,
        "height": 0,
        "camera_make": None,
        "camera_model": None,
        "date_taken": None,
        "iso": None,
        "shutter_speed": None,
        "aperture": None,
        "focal_length": None,
        "latitude": None,
        "longitude": None,
        "altitude": None,
    }
    
    try:
        with Image.open(image_path) as img:
            metadata["width"], metadata["height"] = img.size
            
            # Extract basic exif
            exif_data = img.getexif()
            
            # Fallback for older Pillow or special files
            if not exif_data and hasattr(img, '_getexif'):
                exif_data = img._getexif()
                
            if exif_data:
                tags = {}
                for tag, value in exif_data.items():
                    decoded = TAGS.get(tag, tag)
                    tags[decoded] = value
                
                # Merge nested EXIF sub-IFD (0x8769) tags (contains ISO, Shutter, Aperture, etc.)
                try:
                    exif_sub_ifd = exif_data.get_ifd(0x8769)
                    if exif_sub_ifd:
                        for tag, value in exif_sub_ifd.items():
                            decoded = TAGS.get(tag, tag)
                            tags[decoded] = value
                except Exception as e:
                    print(f"Error reading EXIF sub-IFD: {e}")

                
                # Make
                make = tags.get("Make")
                if isinstance(make, bytes):
                    make = make.decode(errors='replace')
                metadata["camera_make"] = make.strip() if make else None
                
                # Model
                model = tags.get("Model")
                if isinstance(model, bytes):
                    model = model.decode(errors='replace')
                metadata["camera_model"] = model.strip() if model else None
                
                # Date Taken
                date_str = tags.get("DateTimeOriginal") or tags.get("DateTime")
                if isinstance(date_str, bytes):
                    date_str = date_str.decode(errors='replace')
                if date_str:
                    try:
                        date_str_clean = date_str.strip()
                        # Often formatted as "YYYY:MM:DD HH:MM:SS"
                        metadata["date_taken"] = datetime.datetime.strptime(date_str_clean, "%Y:%m:%d %H:%M:%S")
                    except ValueError:
                        try:
                            # Try with only the first 19 characters
                            metadata["date_taken"] = datetime.datetime.strptime(date_str_clean[:19], "%Y:%m:%d %H:%M:%S")
                        except Exception:
                            pass
                            
                # ISO
                iso = tags.get("ISOSpeedRatings") or tags.get("ISO")
                if iso:
                    if isinstance(iso, (tuple, list)):
                        metadata["iso"] = int(iso[0])
                    else:
                        try:
                            metadata["iso"] = int(iso)
                        except Exception:
                            pass
                
                # Shutter Speed / Exposure Time
                exp_time = tags.get("ExposureTime")
                if exp_time is not None:
                    if hasattr(exp_time, 'numerator') and hasattr(exp_time, 'denominator'):
                        num, den = exp_time.numerator, exp_time.denominator
                    elif isinstance(exp_time, tuple) and len(exp_time) == 2:
                        num, den = exp_time[0], exp_time[1]
                    else:
                        num, den = None, None
                        
                    if num is not None and den is not None and den != 0:
                        if num == 1:
                            metadata["shutter_speed"] = f"1/{den}"
                        elif den == 1:
                            metadata["shutter_speed"] = f"{num}s"
                        else:
                            # Simplify fraction if possible, but general string format is fine
                            metadata["shutter_speed"] = f"{num}/{den}"
                    else:
                        try:
                            val = float(exp_time)
                            if val > 0:
                                if val < 1:
                                    metadata["shutter_speed"] = f"1/{int(round(1/val))}"
                                else:
                                    metadata["shutter_speed"] = f"{round(val, 2)}s"
                        except Exception:
                            metadata["shutter_speed"] = str(exp_time)
                
                # Aperture
                f_num = tags.get("FNumber")
                if f_num is not None:
                    if hasattr(f_num, 'numerator') and hasattr(f_num, 'denominator') and f_num.denominator != 0:
                        metadata["aperture"] = round(float(f_num.numerator) / float(f_num.denominator), 2)
                    elif isinstance(f_num, tuple) and len(f_num) == 2 and f_num[1] != 0:
                        metadata["aperture"] = round(float(f_num[0]) / float(f_num[1]), 2)
                    else:
                        try:
                            metadata["aperture"] = round(float(f_num), 2)
                        except Exception:
                            pass
                
                # Focal Length
                focal = tags.get("FocalLength")
                if focal is not None:
                    if hasattr(focal, 'numerator') and hasattr(focal, 'denominator') and focal.denominator != 0:
                        metadata["focal_length"] = round(float(focal.numerator) / float(focal.denominator), 1)
                    elif isinstance(focal, tuple) and len(focal) == 2 and focal[1] != 0:
                        metadata["focal_length"] = round(float(focal[0]) / float(focal[1]), 1)
                    else:
                        try:
                            metadata["focal_length"] = round(float(focal), 1)
                        except Exception:
                            pass
                
                # GPS Tags parsing
                gps_info = None
                try:
                    gps_info = exif_data.get_ifd(0x8825)
                except Exception:
                    gps_tag_id = [k for k, v in TAGS.items() if v == 'GPSInfo']
                    if gps_tag_id and gps_tag_id[0] in tags:
                        gps_info = tags[gps_tag_id[0]]
                        
                if gps_info:
                    resolved_gps = {}
                    for tag, value in gps_info.items():
                        decoded = GPSTAGS.get(tag, tag)
                        resolved_gps[decoded] = value
                        
                    # Lat / Lon Ref and Values
                    lat_ref = resolved_gps.get("GPSLatitudeRef")
                    lat_val = resolved_gps.get("GPSLatitude")
                    lon_ref = resolved_gps.get("GPSLongitudeRef")
                    lon_val = resolved_gps.get("GPSLongitude")
                    
                    if lat_val and lat_ref:
                        metadata["latitude"] = convert_to_degrees(lat_val)
                        if isinstance(lat_ref, bytes):
                            lat_ref = lat_ref.decode()
                        if lat_ref.strip().upper() == 'S':
                            metadata["latitude"] = -metadata["latitude"]
                            
                    if lon_val and lon_ref:
                        metadata["longitude"] = convert_to_degrees(lon_val)
                        if isinstance(lon_ref, bytes):
                            lon_ref = lon_ref.decode()
                        if lon_ref.strip().upper() == 'W':
                            metadata["longitude"] = -metadata["longitude"]
                            
                    # Altitude
                    alt_val = resolved_gps.get("GPSAltitude")
                    alt_ref = resolved_gps.get("GPSAltitudeRef")
                    if alt_val is not None:
                        if hasattr(alt_val, 'numerator') and hasattr(alt_val, 'denominator') and alt_val.denominator != 0:
                            alt = float(alt_val.numerator) / float(alt_val.denominator)
                        elif isinstance(alt_val, tuple) and len(alt_val) == 2 and alt_val[1] != 0:
                            alt = float(alt_val[0]) / float(alt_val[1])
                        else:
                            try:
                                alt = float(alt_val)
                            except Exception:
                                alt = None
                                
                        if alt is not None:
                            if alt_ref is not None:
                                if isinstance(alt_ref, bytes):
                                    alt_ref = int.from_bytes(alt_ref, 'big')
                                if int(alt_ref) == 1:  # Below sea level
                                    alt = -alt
                            metadata["altitude"] = round(alt, 2)
    except Exception as e:
        print(f"Error parsing EXIF: {e}")
        
    return metadata
