from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import uuid

from app.database import get_db
from app.models.documentation import Documentation
from app.models.project import Project
from app.models.user import User
from app.schemas.documentation import DocumentationCreate, DocumentationUpdate, DocumentationResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/documentation", tags=["documentation"])

# Standard 14 Projects to support
DEFAULT_PROJECTS = [
    {"name": "Finance Management System", "aim": "Financial tracking, budgeting, and enterprise accounting platform."},
    {"name": "College Management System", "aim": "Academic management, student portal, and faculty administration system."},
    {"name": "Hospital Management System", "aim": "Healthcare administration, patient records, and clinical management."},
    {"name": "BBMP Municipal Management System", "aim": "Municipal corporation services, grievance tracking, and civic administration."},
    {"name": "Grabit", "aim": "Quick commerce, instant delivery platform and catalog management."},
    {"name": "Buyzo", "aim": "E-commerce marketplace, order fulfillment, and vendor ecosystem."},
    {"name": "PETSHOP", "aim": "Pet care services, adoption portal, and supply chain system."},
    {"name": "LIVO", "aim": "Daily Task Management Platform & day-wise execution engine."},
    {"name": "Nagara", "aim": "City 360 civic engagement platform & urban infrastructure tracking."},
    {"name": "Property Management System", "aim": "Real estate management, tenant portal, and property leasing OS."},
    {"name": "Logistics / Transportation", "aim": "Fleet tracking, supply chain logistics, and shipment routing system."},
    {"name": "Procurement OS", "aim": "Vendor management, RFP processing, PO issuance, and procurement workflow."},
    {"name": "FairTicket", "aim": "Event ticketing engine, queue management, and seat reservation system."},
    {"name": "Lundrix", "aim": "Enterprise resource planning, operations dashboard, and workflow engine."}
]

def ensure_all_default_projects_exist(db: Session, user: User):
    """Ensure all 14 standard projects exist in the database."""
    try:
        existing_projects = db.query(Project).all()
        existing_names = {p.name.strip().lower() for p in existing_projects}

        created = False
        for p_def in DEFAULT_PROJECTS:
            name_lower = p_def["name"].strip().lower()
            if name_lower not in existing_names:
                new_p = Project(
                    id=uuid.uuid4(),
                    name=p_def["name"],
                    aim=p_def["aim"],
                    created_by=user.id,
                    status="active"
                )
                db.add(new_p)
                existing_names.add(name_lower)
                created = True

        if created:
            db.commit()
    except Exception as e:
        db.rollback()
        print("Error ensuring default projects exist:", e)


def resolve_project_id(db: Session, project_input: Optional[str], user: User) -> Optional[UUID]:
    """Helper to resolve UUID or Project Name to a valid Project UUID."""
    if not project_input or project_input in ("", "null", "undefined", "General / Platform"):
        return None

    # Try UUID parse
    try:
        pid = UUID(project_input)
        p = db.query(Project).filter(Project.id == pid).first()
        if p:
            return p.id
    except Exception:
        pass

    # Match by exact or partial project name (case-insensitive)
    p = db.query(Project).filter(Project.name.ilike(project_input.strip())).first()
    if p:
        return p.id

    p = db.query(Project).filter(Project.name.ilike(f"%{project_input.strip()}%")).first()
    if p:
        return p.id

    # Create project if name not found in db
    try:
        new_p = Project(
            id=uuid.uuid4(),
            name=project_input.strip(),
            aim="Project workspace documentation and specs.",
            created_by=user.id,
            status="active"
        )
        db.add(new_p)
        db.commit()
        db.refresh(new_p)
        return new_p.id
    except Exception as e:
        db.rollback()
        print("Error creating project on the fly:", e)
        return None


# Demo document titles to exclude if any remained from initial seeding
DEMO_TITLE_PREFIXES = [
    "Authentication API",
    "Daily Task Workflow Requirements",
    "Backend Architecture",
    "Vendor Portal Flow",
    "Booking Flow Architecture",
    "Workmate Platform System Architecture",
    "Development Guidelines"
]

def is_real_user_document(doc: Documentation) -> bool:
    """Helper to check if document is a real user-created document."""
    if doc.updated_by == "System Admin":
        return False
    if any(demo_t == doc.title for demo_t in DEMO_TITLE_PREFIXES):
        return False
    return True


@router.get("", response_model=List[DocumentationResponse])
def list_documentations(
    project_id: Optional[UUID] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ensure_all_default_projects_exist(db, user)

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
            (Documentation.tags.ilike(s)) |
            (Documentation.file_name.ilike(s))
        )

    all_docs = q.order_by(Documentation.is_pinned.desc(), Documentation.updated_at.desc()).all()
    real_docs = [d for d in all_docs if is_real_user_document(d)]

    # Enrich response with project_name
    projects = {p.id: p.name for p in db.query(Project).all()}
    res = []
    for d in real_docs:
        doc_dict = DocumentationResponse.model_validate(d)
        doc_dict.project_name = projects.get(d.project_id, "General / Platform")
        res.append(doc_dict)

    return res


@router.get("/summary")
def get_documentation_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ensure_all_default_projects_exist(db, user)

    projects = db.query(Project).all()
    all_docs = db.query(Documentation).all()
    docs = [d for d in all_docs if is_real_user_document(d)]

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
    if not doc or not is_real_user_document(doc):
        raise HTTPException(status_code=404, detail="Document not found")

    res = DocumentationResponse.model_validate(doc)
    if doc.project_id:
        p = db.query(Project).filter(Project.id == doc.project_id).first()
        res.project_name = p.name if p else "General / Platform"
    else:
        res.project_name = "General / Platform"

    return res


def check_tl_permission(user: User):
    user_role = (user.role or "").upper()
    if user_role not in ("TL", "PM", "CEO", "CTO", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only Team Leads (TL) have permission to create, edit, or delete documentation.")


@router.post("", response_model=DocumentationResponse)
def create_documentation(
    req: DocumentationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    check_tl_permission(user)

    resolved_pid = resolve_project_id(db, req.project_id, user)

    doc = Documentation(
        title=req.title,
        description=req.description,
        project_id=resolved_pid,
        category=req.category,
        content=req.content,
        file_url=req.file_url,
        file_name=req.file_name,
        file_type=req.file_type or "pdf",
        author_id=user.id,
        updated_by=user.full_name or f"{user.role} User",
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
    check_tl_permission(user)

    doc = db.query(Documentation).filter(Documentation.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = req.model_dump(exclude_unset=True)
    if "project_id" in update_data:
        update_data["project_id"] = resolve_project_id(db, req.project_id, user)

    for field, val in update_data.items():
        setattr(doc, field, val)

    doc.updated_by = user.full_name or f"{user.role} User"
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
    check_tl_permission(user)

    doc = db.query(Documentation).filter(Documentation.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
