from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Make sure to replace special characters with percent-encoding in passwords
# @ is %40
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:Organ-db123@localhost:5432/organ_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
