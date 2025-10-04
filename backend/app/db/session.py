"""
SQL Database session management
"""
import logging
from sqlmodel import SQLModel, create_engine, Session as SQLModelSession
from sqlalchemy.orm import sessionmaker
from alembic import command
from alembic.config import Config
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create sync engine with connection pooling
try:
    # Configure connection pooling based on database type
    engine_kwargs = {
        "echo": False,
    }
    
    if settings.DATABASE_URL.startswith("sqlite"):
        # SQLite doesn't support connection pooling in the same way
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        # Use NullPool for SQLite to avoid connection issues
        from sqlalchemy.pool import NullPool
        engine_kwargs["poolclass"] = NullPool
        logger.info("Using NullPool for SQLite database")
    else:
        # For PostgreSQL/MySQL - configure proper connection pooling
        engine_kwargs["pool_size"] = 20  # Number of connections to maintain
        engine_kwargs["max_overflow"] = 10  # Additional connections when pool is full
        engine_kwargs["pool_pre_ping"] = True  # Verify connections before using
        engine_kwargs["pool_recycle"] = 3600  # Recycle connections after 1 hour
        logger.info("Using QueuePool with pool_size=20, max_overflow=10")
    
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
    SessionLocal = sessionmaker(class_=SQLModelSession, autocommit=False, autoflush=False, bind=engine)
    logger.info("Database engine created successfully (SQLModel Session).")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise


def init_db():
    """Initialize database with migrations."""
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    
    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations applied successfully (head).")
    except Exception as e:
        logger.warning(f"Upgrade to 'head' failed: {e}. Attempting upgrade to 'heads' as fallback.")
        try:
            command.upgrade(alembic_cfg, "heads")
            logger.info("Database migrations applied successfully (heads).")
        except Exception as e2:
            logger.error(f"Upgrade to 'heads' also failed: {e2}. Continuing without applying migrations.")
            # Fallback: create tables directly
            try:
                from app.models.sql_models import sql_models
                SQLModel.metadata.create_all(bind=engine)
                logger.info("Created DB tables using SQLModel.metadata.create_all as fallback.")
            except Exception as e3:
                logger.error(f"Failed to create tables as fallback: {e3}")
            return


def get_db_session():
    """Get database session (sync)."""
    session = SessionLocal()
    try:
        yield session
    except Exception as e:
        logger.error(f"Database session error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def get_session():
    """Get sync database session for backward compatibility."""
    try:
        with SQLModelSession(engine) as session:
            yield session
    except Exception as e:
        logger.error(f"Sync database session error: {e}")
        raise
