import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from .database import Base

class ImageMetadata(Base):
    __tablename__ = "image_metadata"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    filepath = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    
    # EXIF Details
    camera_make = Column(String, index=True, nullable=True)
    camera_model = Column(String, index=True, nullable=True)
    date_taken = Column(DateTime, index=True, nullable=True)
    iso = Column(Integer, nullable=True)
    shutter_speed = Column(String, nullable=True)
    aperture = Column(Float, nullable=True)
    focal_length = Column(Float, nullable=True)
    
    # GPS Details
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
