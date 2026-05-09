# Database Setup & Management Guide

This document outlines how to initialize, manage, and update the PostgreSQL database for the Landscapes system. 

Our application uses **PostgreSQL** as the database engine, **Flask-SQLAlchemy** as the ORM (Object-Relational Mapper) for database interactions, and **Flask-Migrate** (Alembic) to handle safe schema updates over time.

---

## 1. Initial Setup (Fresh Install)

If you are running the project for the very first time on a new machine, you need to create the database, assign user permissions, set up the tables, and populate the initial seed data.

We have an automated script to handle all of this.

**Pre-requisites:**
Ensure PostgreSQL is installed and running on your local machine.

**Run the Setup Script:**
Open your terminal, navigate to the `backend` directory, and run the setup script:

```bash
cd backend
./venv/bin/python setup_database.py
```

**What this script does:**
1. Connects to the local PostgreSQL instance.
2. Creates the `landscapes` database.
3. Creates the `landscapes_user` and grants the necessary privileges.
4. Reads your models in `models.py` and creates all corresponding tables via SQLAlchemy.
5. Seeds the `locations` table with default data (e.g., Baguio Night Market, The Mansion) if the table is currently empty.

---

## 2. Modifying the Database Schema (Migrations)

As the application grows, you will likely need to add new columns, modify existing columns, or create entirely new tables. 

**Do NOT modify the tables manually using SQL.** Instead, use Flask-Migrate to safely update the schema without losing any existing data.

### Step 1: Update the Code
Make your desired changes in `backend/models.py`. 
For example, if you want to add a `rating` column to the `Location` model, update the Python class:
```python
class Location(db.Model):
    # ... existing fields ...
    rating = db.Column(db.Float, nullable=True) # <-- New Column
```

### Step 2: Generate a Migration Script
Open your terminal in the `backend` directory and tell Flask-Migrate to detect your code changes and generate a migration script. Be sure to provide a descriptive message.

```bash
cd backend
FLASK_APP=api_server.py ./venv/bin/flask db migrate -m "Added rating column to locations"
```
*(This creates a new python script inside the `backend/migrations/versions/` folder containing the exact `ALTER TABLE` instructions).*

### Step 3: Apply the Migration
Finally, apply these changes directly to your PostgreSQL database:

```bash
FLASK_APP=api_server.py ./venv/bin/flask db upgrade
```
Your database is now up to date, and all of your previous data remains intact!

---

## 3. Database Architecture & Models

All database tables are defined as Python classes in `backend/models.py`. The primary models include:

* **`User`**: Manages authentication (email, hashed password, creation date).
* **`Location`**: Stores static data about different tourist spots in Baguio (name, coordinates, category type, environment, maximum capacity, video feed source).
* **`SurveillanceLog`**: Continuously populated by the vision worker. Records real-time crowd data (timestamp, people count, location reference) for historical analytics and real-time TOPSIS redirection calculations.

### Troubleshooting
* **Cannot connect to Postgres**: Ensure the Postgres service is actively running on your machine (e.g., via Postgres.app on macOS or `brew services start postgresql`).
* **Migration complains about existing tables**: If you manually edited the schema via pgAdmin/SQL, Alembic might get confused. Ensure you strictly use the `flask db migrate` workflow.
