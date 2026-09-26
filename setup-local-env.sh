#!/bin/bash
set -e

echo "Starting PostgreSQL and Redis..."
service postgresql start
service redis-server start

echo "Configuring PostgreSQL..."
# Configure listen addresses and pg_hba
PG_CONF=$(find /etc/postgresql -name postgresql.conf)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf)

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF" || true
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF" || true

# Allow trust authentication from localhost for local development
if ! grep -q "host    all             all             127.0.0.1/32            trust" "$PG_HBA"; then
    echo "host    all             all             127.0.0.1/32            trust" >> "$PG_HBA"
    echo "host    all             all             ::1/128                 trust" >> "$PG_HBA"
    echo "host    all             all             all                     trust" >> "$PG_HBA"
fi

# Configure Redis to listen on 0.0.0.0 without protected mode
sed -i "s/bind 127.0.0.1 ::1/bind 0.0.0.0/g" /etc/redis/redis.conf || true
sed -i "s/bind 127.0.0.1/bind 0.0.0.0/g" /etc/redis/redis.conf || true
sed -i "s/protected-mode yes/protected-mode no/g" /etc/redis/redis.conf || true

service redis-server restart
service postgresql restart

# Set password for postgres
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'password';\""

# Create database wayza if not exists
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'wayza'\" | grep -q 1 || psql -c \"CREATE DATABASE wayza;\""

# Enable extensions in wayza database
su - postgres -c "psql -d wayza -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
su - postgres -c "psql -d wayza -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";'"

echo "Testing Redis..."
redis-cli ping

echo "Setup completed successfully!"
