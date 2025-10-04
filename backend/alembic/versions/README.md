# Database Migrations

## Migration History

This directory contains all database schema migrations managed by Alembic.

### Current Migrations

1. **001_consolidated_initial_migration.py**
   - Initial database schema setup
   - Creates all base tables: User, RevokedToken, Message
   - Sets up basic indexes

2. **122b81ebc3d7_add_compound_indexes_to_models.py**
   - Adds compound indexes for performance optimization
   - `ix_revokedtoken_token_expires`: Compound index on (token, expires_at)
   - `ix_message_user_session_created`: Compound index on (user_id, session_id, created_at)

## Migration Strategy

### Creating New Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description_of_changes"

# Create empty migration for manual changes
alembic revision -m "description_of_changes"
```

### Applying Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Check current version
alembic current

# View migration history
alembic history
```

### Best Practices

1. **Descriptive Names**: Use clear, concise migration names that describe the change
2. **Test Migrations**: Always test both upgrade and downgrade paths
3. **Data Migrations**: For data migrations, separate schema and data changes
4. **Review Generated Code**: Always review auto-generated migrations before applying
5. **Backup**: Always backup production database before running migrations

### Migration Naming Convention

Format: `{revision_id}_{description}.py`
- Use lowercase with underscores
- Keep descriptions concise but meaningful
- Examples:
  - `add_user_profile_fields.py`
  - `create_notification_table.py`
  - `add_indexes_for_performance.py`

## Troubleshooting

### Common Issues

**"Can't locate revision"**
- Check alembic_version table: `SELECT * FROM alembic_version;`
- Remove invalid entries manually if needed

**Migration conflicts**
- Use `alembic heads` to see multiple heads
- Merge migrations: `alembic merge heads -m "merge_description"`

**Schema mismatch**
- Stamp current state: `alembic stamp head`
- Or reset and replay: Drop tables, then `alembic upgrade head`

## Current Database State

To verify current schema:

```bash
# Check applied migrations
sqlite3 backend.db "SELECT * FROM alembic_version;"

# View indexes
sqlite3 backend.db "SELECT name, tbl_name FROM sqlite_master WHERE type='index';"

# View tables
sqlite3 backend.db ".tables"
```
