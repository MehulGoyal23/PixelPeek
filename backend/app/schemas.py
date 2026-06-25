from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ImageMetadataBase(BaseModel):
    filename: str
    filepath: str
    file_size: int
    file_type: str
    width: int
    height: int
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    date_taken: Optional[datetime] = None
    iso: Optional[int] = None
    shutter_speed: Optional[str] = None
    aperture: Optional[float] = None
    focal_length: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None

class ImageMetadataCreate(ImageMetadataBase):
    pass

class ImageMetadataResponse(ImageMetadataBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class StegoDecodeRequest(BaseModel):
    mode: str  # "lsb" or "eof"
    channels: Optional[str] = "RGB"
    num_bits: Optional[int] = 1
    stop_marker: Optional[str] = None

