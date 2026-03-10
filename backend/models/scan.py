from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # "SAST" or "DAST"
    target = Column(String, nullable=False)  # filename or URL
    status = Column(String, default="completed")
    results = Column(JSON, nullable=True)  # vulnerabilities stored as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="scans")