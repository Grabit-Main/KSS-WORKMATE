from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models.documentation import Documentation
from app.models.project import Project
from app.models.user import User
from app.schemas.documentation import DocumentationCreate, DocumentationUpdate, DocumentationResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/documentation", tags=["documentation"])

# Seed documentation data to provide immediate rich knowledge base content
SEED_DOCUMENTS = [
    {
        "project_name": "LIVO",
        "title": "Authentication API",
        "description": "Login, JWT, refresh token and authorization flow.",
        "category": "API",
        "version": "v1.3",
        "tags": "Auth, JWT, Security, API",
        "is_pinned": True,
        "content": """# Authentication API

## 1. Overview
The LIVO Authentication API provides secure user login, JWT token issuance, refresh token rotation, and role-based authorization for all daily task management workflows.

## 2. Authentication Flow
1. User submits credentials (email and password) to `/api/auth/login`.
2. Server validates credentials and returns `access_token` (JWT) along with `refresh_token`.
3. Client attaches `Authorization: Bearer <access_token>` header on subsequent requests.
4. When `access_token` expires, client calls `/api/auth/refresh` with `refresh_token` to get a fresh token pair.

> [!NOTE]
> All tokens expire after 24 hours of inactivity. Refresh tokens are single-use with automatic rotation.

## 3. Login API
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@workmate.com",
  "password": "Password123!"
}
```

### Response Example (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "u-101",
    "email": "user@workmate.com",
    "role": "Developer",
    "full_name": "Akash Kumar"
  }
}
```

## 4. Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

## 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## 6. Error Responses
- `401 Unauthorized`: Invalid credentials or expired token.
- `403 Forbidden`: User role lacks required permission.
- `429 Too Many Requests`: Rate limit exceeded (5 attempts / min).

## 7. Examples
```javascript
import api from './api';

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', response.data.access_token);
  return response.data;
};
```
"""
    },
    {
        "project_name": "LIVO",
        "title": "Daily Task Workflow Requirements",
        "description": "Functional requirements for day-wise task execution and daily status sync.",
        "category": "Requirements",
        "version": "v2.0",
        "tags": "Tasks, Workflow, Specs",
        "is_pinned": False,
        "content": """# Daily Task Workflow Requirements

## 1. Overview
This document outlines the core functional specs for task creation, estimation, assignment, and status transitions on LIVO.

## 2. Core Functional Requirements
- **Task Creation**: Team Leads & PMs can create tasks with title, description, priority, deadline, and assigned team member.
- **Status Pipeline**: Tasks transition through: `Backlog` -> `In Progress` -> `Under Review` -> `Completed`.
- **Estimation**: Tasks must have story points assigned (1, 2, 3, 5, 8).

> [!IMPORTANT]
> All tasks scheduled for today must have an estimated start time and target completion time.

## 3. Workflow Diagram
```
[ Backlog ] ---> [ In Progress ] ---> [ Under Review ] ---> [ Completed ]
```

## 4. Business Rules
1. Only assigned developers or Team Leads can move a task to `In Progress`.
2. Tasks moving to `Under Review` automatically trigger a review notification to the TL/PM.
"""
    },
    {
        "project_name": "PETSHOP",
        "title": "Backend Architecture",
        "description": "High-level service layout, database entity structure, and caching strategy.",
        "category": "Architecture",
        "version": "v1.1",
        "tags": "Architecture, PostgreSQL, FastAPI",
        "is_pinned": True,
        "content": """# Backend Architecture

## 1. Overview
The PETSHOP backend is built with Python FastAPI, SQLAlchemy ORM, PostgreSQL database, and Redis cache.

## 2. System Layering
- **API Controllers**: `app/routers/`
- **Business Services**: `app/services/`
- **Data Models**: `app/models/`
- **Database Connection**: `app/database.py`

## 3. Database Schema Overview
- `users`: User profiles and authentication metadata.
- `pets`: Pet profiles, adoption status, medical records.
- `orders`: Supplies catalog orders and transactions.

> [!TIP]
> Use Redis caching for public pet catalog listings to maintain low latency under high load.
"""
    },
    {
        "project_name": "Procurement OS",
        "title": "Vendor Portal Flow",
        "description": "Onboarding, RFP submissions, quotation evaluation, and PO issuance.",
        "category": "User Guide",
        "version": "v1.4",
        "tags": "Vendor, Procurement, PO, Workflow",
        "is_pinned": False,
        "content": """# Vendor Portal Flow

## 1. Overview
Guide for vendor onboarding, RFQ submission, purchase order matching, and invoice processing.

## 2. Onboarding Workflow
1. Vendor completes registration with GSTIN and bank details.
2. Admin approves vendor verification request.
3. Vendor receives portal access credentials.

## 3. Purchase Order Process
- **Step 1**: Procurement officer generates PO.
- **Step 2**: Vendor receives notification & accepts PO.
- **Step 3**: Delivery tracking & goods receipt note (GRN) matching.
"""
    },
    {
        "project_name": "FairTicket",
        "title": "Booking Flow Architecture",
        "description": "Event ticket reservation, queue management, and payment gateway integration.",
        "category": "Design",
        "version": "v1.0",
        "tags": "Booking, Payments, Realtime",
        "is_pinned": True,
        "content": """# Booking Flow Architecture

## 1. Overview
High-concurrency ticket booking engine with seat locking and payment gateway callback handling.

## 2. Seat Reservation Lock
- Seats locked in Redis for 10 minutes upon selection.
- Auto-release lock if payment fails or expires.

```json
{
  "event_id": "evt-99",
  "seats": ["A12", "A13"],
  "lock_ttl": 600
}
```
"""
    },
    {
        "project_name": "System Architecture",
        "title": "Workmate Platform System Architecture",
        "description": "Global architecture guidelines, microservices overview, and real-time syncing.",
        "category": "Architecture",
        "version": "v2.1",
        "tags": "Global, Architecture, WorkOS",
        "is_pinned": True,
        "content": """# Workmate Platform System Architecture

## 1. Overview
Comprehensive blueprint of the Workmate internal enterprise OS architecture.

## 2. Infrastructure Stack
- **Frontend**: React, Vite, Lucide Icons, Custom Design Tokens.
- **Backend**: FastAPI Python 3.11, Pydantic, SQLAlchemy.
- **Database**: Supabase PostgreSQL with RLS and pooled connections.
- **Realtime**: WebSockets & Supabase Realtime Channels.

> [!WARNING]
> Ensure all API requests pass through the authentication middleware before processing business logic.
"""
    },
    {
        "project_name": "Development Guidelines",
        "title": "Workmate Engineering & Coding Standards",
        "description": "Coding conventions, PR checklist, testing standards, and Git workflows.",
        "category": "Development",
        "version": "v1.5",
        "tags": "Standards, Git, Code Quality",
        "is_pinned": True,
        "content": """# Workmate Engineering & Coding Standards

## 1. Code Style
- Use clean, modular components with clear prop interfaces.
- Avoid duplicate logic; abstract reusable UI patterns into `components/common/`.
- Maintain strict typing and error boundaries.

## 2. Git & Branching Rules
- `main`: Production release branch.
- `feature/<name>`: New feature implementations.
- `fix/<name>`: Bug fixes and patches.
"""
    }
]

def seed_default_documents(db: Session, user: User):
    """Seed initial project documentation if none exist."""
    existing_count = db.query(Documentation).count()
    if existing_count > 0:
        return

    # Fetch projects
    projects = db.query(Project).all()
    project_map = {p.name.lower(): p for p in projects}

    for doc_data in SEED_DOCUMENTS:
        p_name = doc_data["project_name"]
        matched_proj = None
        for name, proj in project_map.items():
            if p_name.lower() in name or name in p_name.lower():
                matched_proj = proj
                break

        new_doc = Documentation(
            title=doc_data["title"],
            description=doc_data["description"],
            project_id=matched_proj.id if matched_proj else (projects[0].id if projects else None),
            category=doc_data["category"],
            content=doc_data["content"],
            author_id=user.id if user else None,
            updated_by=user.full_name if user else "System Admin",
            version=doc_data["version"],
            tags=doc_data["tags"],
            is_pinned=doc_data["is_pinned"]
        )
        db.add(new_doc)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print("Error seeding documentation:", e)


@router.get("", response_model=List[DocumentationResponse])
def list_documentations(
    project_id: Optional[UUID] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Seed defaults if empty
    seed_default_documents(db, user)

    q = db.query(Documentation)

    if project_id:
        q = q.filter(Documentation.project_id == project_id)
    
    if category and category.lower() != "all" and category.lower() != "overview":
        q = q.filter(Documentation.category.ilike(category))

    if is_pinned is not None:
        q = q.filter(Documentation.is_pinned == is_pinned)

    if search:
        s = f"%{search}%"
        q = q.filter(
            (Documentation.title.ilike(s)) |
            (Documentation.description.ilike(s)) |
            (Documentation.category.ilike(s)) |
            (Documentation.content.ilike(s)) |
            (Documentation.tags.ilike(s))
        )

    docs = q.order_by(Documentation.is_pinned.desc(), Documentation.updated_at.desc()).all()

    # Enrich response with project_name
    projects = {p.id: p.name for p in db.query(Project).all()}
    res = []
    for d in docs:
        doc_dict = DocumentationResponse.model_validate(d)
        doc_dict.project_name = projects.get(d.project_id, "General / Platform")
        res.append(doc_dict)

    return res


@router.get("/summary")
def get_documentation_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    seed_default_documents(db, user)

    projects = db.query(Project).all()
    docs = db.query(Documentation).all()

    # Map projects to document counts, categories, last updated
    project_stats = []
    for p in projects:
        p_docs = [d for d in docs if d.project_id == p.id]
        cats = sorted(list(set(d.category for d in p_docs if d.category)))
        last_updated = max([d.updated_at for d in p_docs]) if p_docs else p.created_at

        project_stats.append({
            "id": str(p.id),
            "name": p.name,
            "description": p.aim or "Project workspace documentation and specs.",
            "document_count": len(p_docs),
            "categories": cats,
            "updated_at": last_updated.isoformat() if last_updated else None,
            "status": p.status
        })

    # Global summary stats
    all_categories = sorted(list(set(d.category for d in docs if d.category)))
    pinned_docs = [d for d in docs if d.is_pinned]
    recent_docs = sorted(docs, key=lambda x: x.updated_at, reverse=True)[:6]

    return {
        "total_projects": len(projects),
        "total_documents": len(docs),
        "total_categories": len(all_categories),
        "categories_list": all_categories,
        "pinned_count": len(pinned_docs),
        "projects": project_stats,
        "recently_updated": [
            {
                "id": str(d.id),
                "title": d.title,
                "project_id": str(d.project_id) if d.project_id else None,
                "project_name": next((p.name for p in projects if p.id == d.project_id), "Platform"),
                "category": d.category,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
                "updated_by": d.updated_by or "System"
            }
            for d in recent_docs
        ]
    }


@router.get("/{doc_id}", response_model=DocumentationResponse)
def get_documentation(
    doc_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = db.query(Documentation).filter(Documentation.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    res = DocumentationResponse.model_validate(doc)
    if doc.project_id:
        p = db.query(Project).filter(Project.id == doc.project_id).first()
        res.project_name = p.name if p else "General / Platform"
    else:
        res.project_name = "General / Platform"

    return res


@router.post("", response_model=DocumentationResponse)
def create_documentation(
    req: DocumentationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = Documentation(
        title=req.title,
        description=req.description,
        project_id=req.project_id,
        category=req.category,
        content=req.content,
        author_id=user.id,
        updated_by=user.full_name or "System User",
        version=req.version or "v1.0",
        tags=req.tags,
        is_pinned=req.is_pinned or False
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    res = DocumentationResponse.model_validate(doc)
    if doc.project_id:
        p = db.query(Project).filter(Project.id == doc.project_id).first()
        res.project_name = p.name if p else "General / Platform"
    return res


@router.put("/{doc_id}", response_model=DocumentationResponse)
def update_documentation(
    doc_id: UUID,
    req: DocumentationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = db.query(Documentation).filter(Documentation.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(doc, field, val)

    doc.updated_by = user.full_name or "System User"
    doc.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(doc)

    res = DocumentationResponse.model_validate(doc)
    if doc.project_id:
        p = db.query(Project).filter(Project.id == doc.project_id).first()
        res.project_name = p.name if p else "General / Platform"
    return res


@router.delete("/{doc_id}")
def delete_documentation(
    doc_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = db.query(Documentation).filter(Documentation.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
