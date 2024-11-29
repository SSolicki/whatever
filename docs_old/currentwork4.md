# Data Persistence Solution for Whatever

## Problem
Your application data is not persisting across Docker restarts because:
1. The application uses SQLite database by default, which may not be properly persisted
2. Some data directories might be stored outside the mounted volumes

## Solution: Add PostgreSQL Database

### 1. Backup Current Data
```bash
mkdir -p ./backups
docker run --rm -v whatever-prod:/source -v ./backups:/backup ubuntu tar czf /backup/whatever-backup.tar.gz -C /source .
```

### 2. Add to docker-compose.prod.yaml
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: whatever
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: whatever
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - whatever_network_prod
    restart: unless-stopped
  
  whatever:
    environment:
      - DATABASE_URL=postgresql://whatever:${DB_PASSWORD}@db:5432/whatever
    depends_on:
      - db

volumes:
  postgres_data:
```

### 3. Add to .env.prod
```
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://whatever:${DB_PASSWORD}@db:5432/whatever
```

### 4. Deploy Changes
```bash
# Stop containers
docker compose -f docker-compose.prod.yaml down

# Start with new configuration
docker compose -f docker-compose.prod.yaml --env-file .env.prod up -d

# Verify database connection
docker compose -f docker-compose.prod.yaml exec whatever curl db:5432
```

## Maintenance

### Regular Backups
```bash
# Backup PostgreSQL data
docker exec -t db pg_dumpall -c -U whatever > ./backups/db_backup_$(date +%Y%m%d).sql

# Backup application data
docker run --rm -v whatever-prod:/source -v ./backups:/backup ubuntu tar czf /backup/whatever-backup_$(date +%Y%m%d).tar.gz -C /source .
```

### Restore from Backup
```bash
# Restore PostgreSQL data
cat backup.sql | docker exec -i db psql -U whatever

# Restore application data
docker run --rm -v whatever-prod:/source -v ./backups:/backup ubuntu tar xzf /backup/whatever-backup.tar.gz -C /source
