import os
import io
import csv
import shutil
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .database import Base, engine, get_db, SQLALCHEMY_DATABASE_URL, SessionLocal
from .models import ImageMetadata
from .schemas import ImageMetadataResponse, StegoDecodeRequest
from .exif_utils import extract_exif
from .stego_utils import scan_trailing_data, analyze_entropy, decode_lsb

# Create SQLite parent directories if needed
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    # Handle relative vs absolute paths
    db_dir = os.path.dirname(db_path)
    if db_dir and not db_dir.startswith("memory:"):
        os.makedirs(db_dir, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="EXIF Image Finder API",
    description="REST API for uploading images, extracting EXIF metadata, searching and filtering metadata, and exporting results to CSV.",
    version="1.0.0"
)

@app.on_event("startup")
def startup_backfill_metadata():
    db = SessionLocal()
    try:
        images = db.query(ImageMetadata).all()
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        updated = False
        for img in images:
            # Check if camera model is set but ISO/Aperture/Shutter Speed is missing
            if img.camera_model and (img.iso is None or img.aperture is None or img.shutter_speed is None or img.focal_length is None):
                local_path = os.path.join(base_dir, img.filepath.lstrip("/"))
                if os.path.exists(local_path):
                    try:
                        metadata = extract_exif(local_path)
                        img.iso = metadata.get("iso")
                        img.shutter_speed = metadata.get("shutter_speed")
                        img.aperture = metadata.get("aperture")
                        img.focal_length = metadata.get("focal_length")
                        updated = True
                    except Exception as e:
                        print(f"Error backfilling metadata for {img.filename}: {e}")
        if updated:
            db.commit()
            print("Successfully backfilled EXIF metadata for existing images.")
    except Exception as e:
        print(f"Startup metadata migration error: {e}")
    finally:
        db.close()


# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the allowed origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory setup
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory to serve images statically
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}

@app.post("/api/upload", response_model=ImageMetadataResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw_filename = file.filename or "unnamed"
    # Sanitize filename to prevent path traversal
    filename = os.path.basename(raw_filename)
    _, ext = os.path.splitext(filename.lower())
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
        
    # Unique file name to prevent collision
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")
    unique_filename = f"{timestamp}_{filename}"
    filepath = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save the file to disk
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )
        
    # Read file properties
    file_size = os.path.getsize(filepath)
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
    if file_size > MAX_FILE_SIZE:
        os.remove(filepath)  # Clean up the oversized file
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is 20MB."
        )
    file_type = file.content_type or f"image/{ext[1:]}"
    
    # Extract EXIF metadata
    metadata = extract_exif(filepath)
    
    # Create DB entry
    try:
        db_image = ImageMetadata(
            filename=filename,
            filepath=f"/uploads/{unique_filename}",  # URL path to serve
            file_size=file_size,
            file_type=file_type,
            width=metadata["width"],
            height=metadata["height"],
            camera_make=metadata["camera_make"],
            camera_model=metadata["camera_model"],
            date_taken=metadata["date_taken"],
            iso=metadata["iso"],
            shutter_speed=metadata["shutter_speed"],
            aperture=metadata["aperture"],
            focal_length=metadata["focal_length"],
            latitude=metadata["latitude"],
            longitude=metadata["longitude"],
            altitude=metadata["altitude"],
        )
        
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
    except Exception as e:
        # Clean up orphaned file if DB insert fails
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save metadata: {str(e)}"
        )
    
    return db_image

def get_filtered_query(
    db: Session,
    q: Optional[str] = None,
    camera_model: Optional[str] = None,
    has_gps: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = db.query(ImageMetadata)
    
    # Text Search (filename, camera model, camera make)
    if q:
        search_filter = f"%{q}%"
        query = query.filter(
            (ImageMetadata.filename.like(search_filter)) |
            (ImageMetadata.camera_model.like(search_filter)) |
            (ImageMetadata.camera_make.like(search_filter))
        )
        
    # Camera Model filter
    if camera_model:
        query = query.filter(ImageMetadata.camera_model == camera_model)
        
    # GPS check
    if has_gps is not None:
        if has_gps:
            query = query.filter(ImageMetadata.latitude.isnot(None), ImageMetadata.longitude.isnot(None))
        else:
            query = query.filter((ImageMetadata.latitude.is_(None)) | (ImageMetadata.longitude.is_(None)))
            
    # Date taken range
    if date_from:
        try:
            d_from = datetime.datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(ImageMetadata.date_taken >= d_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            d_to = datetime.datetime.strptime(date_to, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(ImageMetadata.date_taken < d_to)
        except ValueError:
            pass
            
    # Order by newest uploaded or date taken
    return query.order_by(ImageMetadata.id.desc())

@app.get("/api/images", response_model=List[ImageMetadataResponse])
def get_images(
    q: Optional[str] = Query(None, description="Search term for filename, make or model"),
    camera_model: Optional[str] = Query(None, description="Filter by exact camera model"),
    has_gps: Optional[bool] = Query(None, description="Filter for items with or without GPS coordinates"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date taken"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date taken"),
    db: Session = Depends(get_db)
):
    query = get_filtered_query(db, q, camera_model, has_gps, date_from, date_to)
    return query.all()

@app.get("/api/images/{image_id}", response_model=ImageMetadataResponse)
def get_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(ImageMetadata).filter(ImageMetadata.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image

@app.delete("/api/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(ImageMetadata).filter(ImageMetadata.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Remove file from disk
    # Mount base is project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # filepath in db is e.g. "/uploads/123_filename.jpg"
    # we strip the leading slash
    local_path = os.path.join(base_dir, image.filepath.lstrip("/"))
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception as e:
            print(f"Failed to delete local file {local_path}: {e}")
            
    # Delete from DB
    db.delete(image)
    db.commit()
    return

@app.get("/api/camera-models", response_model=List[str])
def get_camera_models(db: Session = Depends(get_db)):
    """
    Returns a unique list of camera models present in the database.
    """
    models = db.query(ImageMetadata.camera_model).filter(ImageMetadata.camera_model.isnot(None)).distinct().all()
    return [m[0] for m in models if m[0]]

@app.get("/api/export")
def export_metadata_csv(
    q: Optional[str] = Query(None),
    camera_model: Optional[str] = Query(None),
    has_gps: Optional[bool] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = get_filtered_query(db, q, camera_model, has_gps, date_from, date_to)
    images = query.all()
    
    # Generate CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "ID", "Filename", "File Size (Bytes)", "File Type", "Width", "Height",
        "Camera Make", "Camera Model", "Date Taken", "ISO", "Shutter Speed",
        "Aperture (F-Stop)", "Focal Length (mm)", "Latitude", "Longitude",
        "Altitude (m)", "Uploaded At"
    ])
    
    for img in images:
        writer.writerow([
            img.id,
            img.filename,
            img.file_size,
            img.file_type,
            img.width,
            img.height,
            img.camera_make or "",
            img.camera_model or "",
            img.date_taken.strftime("%Y-%m-%d %H:%M:%S") if img.date_taken else "",
            img.iso or "",
            img.shutter_speed or "",
            f"f/{img.aperture}" if img.aperture else "",
            f"{img.focal_length}mm" if img.focal_length else "",
            img.latitude or "",
            img.longitude or "",
            img.altitude or "",
            img.created_at.strftime("%Y-%m-%d %H:%M:%S") if img.created_at else ""
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=exif_metadata_export.csv"}
    )

@app.get("/api/images/{image_id}/stego/analyze")
def analyze_image_steganography(image_id: int, db: Session = Depends(get_db)):
    image = db.query(ImageMetadata).filter(ImageMetadata.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_path = os.path.join(base_dir, image.filepath.lstrip("/"))
    
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")
        
    trailing_result = scan_trailing_data(local_path)
    entropy_result = analyze_entropy(local_path)
    
    has_stego_detected = trailing_result["has_trailing_data"]
    has_stego_suspected = entropy_result["suspected"]
    
    status_str = "clean"
    if has_stego_detected:
        status_str = "detected"
    elif has_stego_suspected:
        status_str = "suspected"
        
    return {
        "image_id": image_id,
        "status": status_str,
        "trailing_data": trailing_result,
        "entropy": entropy_result
    }

@app.post("/api/images/{image_id}/stego/decode")
def decode_image_steganography(image_id: int, request: StegoDecodeRequest, db: Session = Depends(get_db)):
    image = db.query(ImageMetadata).filter(ImageMetadata.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_path = os.path.join(base_dir, image.filepath.lstrip("/"))
    
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")
        
    if request.mode == "eof":
        trailing_result = scan_trailing_data(local_path)
        if not trailing_result["has_trailing_data"]:
            return {
                "success": False,
                "detail": "No trailing data found to extract"
            }
        
        try:
            with open(local_path, 'rb') as f:
                data = f.read()
            eof_offset = -1
            if data.startswith(b'\xff\xd8'):
                eof_offset = find_jpeg_eof(data)
            elif b'IEND\xae\x42\x60\x82' in data:
                pos = data.find(b'IEND\xae\x42\x60\x82')
                eof_offset = pos + 8
                
            if eof_offset != -1 and eof_offset < len(data):
                trailing_bytes = data[eof_offset:]
                try:
                    text = trailing_bytes.decode('utf-8')
                    is_text = all(32 <= ord(c) < 127 or c in '\r\n\t' for c in text[:150])
                except Exception:
                    text = trailing_bytes.decode('utf-8', errors='replace')
                    is_text = False
                
                return {
                    "success": True,
                    "mode": "eof",
                    "length": len(trailing_bytes),
                    "is_text": is_text,
                    "text": text,
                    "payload_hex": trailing_bytes.hex()
                }
            return {
                "success": False,
                "detail": "Failed to parse EOF offset"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read trailing data: {str(e)}")
            
    elif request.mode == "lsb":
        try:
            decoded_bytes = decode_lsb(
                image_path=local_path,
                channels=request.channels or "RGB",
                num_bits=request.num_bits or 1,
                stop_marker=request.stop_marker
            )
            
            try:
                text = decoded_bytes.decode('utf-8')
                is_text = all(32 <= ord(c) < 127 or c in '\r\n\t' for c in text[:150]) if text else True
            except Exception:
                text = decoded_bytes.decode('utf-8', errors='replace')
                is_text = False
                
            return {
                "success": True,
                "mode": "lsb",
                "length": len(decoded_bytes),
                "is_text": is_text,
                "text": text,
                "payload_hex": decoded_bytes.hex()
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LSB decode failed: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail="Invalid decryption mode. Supported modes: 'lsb', 'eof'")
