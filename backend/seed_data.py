"""Seed script: populate database with sample data for development."""
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from app.db.session import SessionLocal
from app.db.base import Base
from app.db.session import engine
from app.core.security import get_password_hash
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.benefit import Benefit
from app.models.contract_template import ContractTemplate
from app.models.question import Question
from app.models.conversation import Conversation


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if data already exists
        if db.query(HREmployee).first():
            print("Database already seeded. Skipping.")
            return

        # ── HR Employees ─────────────────────────────────────────
        hr1 = HREmployee(
            email="hr@company.com",
            password_hash=get_password_hash("password123"),
            full_name="Sarah Johnson",
            role="hr_manager",
            department="Human Resources",
            phone="+971501234567",
        )
        hr2 = HREmployee(
            email="admin@company.com",
            password_hash=get_password_hash("admin123"),
            full_name="Ahmed Al-Rashid",
            role="hr_admin",
            department="Human Resources",
        )
        hr3 = HREmployee(
            email="specialist@company.com",
            password_hash=get_password_hash("spec123"),
            full_name="Fatima Hassan",
            role="hr_specialist",
            department="Human Resources",
        )
        db.add_all([hr1, hr2, hr3])
        db.flush()

        # ── Contract Templates ─────────────────────────────────────
        tpl1 = ContractTemplate(
            name="UAE Employment Contract - English",
            description="Standard employment contract for UAE jurisdiction",
            template_type="employment_contract",
            country="UAE",
            language="en",
            content_template="EMPLOYMENT CONTRACT\n\nThis Employment Contract is made on {{ start_date }}...",
            variables=[
                {"name": "company_name", "type": "string", "required": True},
                {"name": "full_name", "type": "string", "required": True},
                {"name": "position", "type": "string", "required": True},
                {"name": "salary", "type": "number", "required": True},
                {"name": "currency", "type": "string", "required": True},
                {"name": "start_date", "type": "date", "required": True},
            ],
            created_by=hr1.id,
        )
        tpl2 = ContractTemplate(
            name="UAE Offer Letter - English",
            description="Standard offer letter for UAE",
            template_type="offer_letter",
            country="UAE",
            language="en",
            content_template="OFFER LETTER\n\nDear {{ full_name }},\n\nWe are pleased to offer...",
            variables=[
                {"name": "full_name", "type": "string", "required": True},
                {"name": "position", "type": "string", "required": True},
                {"name": "salary", "type": "number", "required": True},
            ],
            created_by=hr1.id,
        )
        tpl3 = ContractTemplate(
            name="Standard NDA - English",
            description="Non-disclosure agreement template",
            template_type="nda",
            country="UAE",
            language="en",
            content_template="NON-DISCLOSURE AGREEMENT\n\n{{ company_name }} and {{ full_name }}...",
            variables=[
                {"name": "company_name", "type": "string", "required": True},
                {"name": "full_name", "type": "string", "required": True},
            ],
            created_by=hr1.id,
        )
        db.add_all([tpl1, tpl2, tpl3])
        db.flush()

        # ── New Hires ─────────────────────────────────────────────
        new_hires_data = [
            {
                "email": "john.doe@example.com", "full_name": "John Doe",
                "phone": "+971501111111", "preferred_language": "en",
                "position": "Senior Software Engineer", "department": "Engineering",
                "salary": Decimal("25000"), "currency": "AED",
                "start_date": date(2025, 3, 1), "country": "UAE", "city": "Dubai",
                "work_location": "office", "status": "in_progress",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "fatima.ali@example.com", "full_name": "Fatima Ali",
                "phone": "+971502222222", "preferred_language": "ar",
                "position": "Product Manager", "department": "Product",
                "salary": Decimal("28000"), "currency": "AED",
                "start_date": date(2025, 3, 15), "country": "UAE", "city": "Abu Dhabi",
                "work_location": "hybrid", "status": "offer_presented",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "michael.chen@example.com", "full_name": "Michael Chen",
                "phone": "+971503333333", "preferred_language": "en",
                "position": "Data Scientist", "department": "Data",
                "salary": Decimal("22000"), "currency": "AED",
                "start_date": date(2025, 4, 1), "country": "UAE", "city": "Dubai",
                "work_location": "remote", "status": "draft",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "sara.khalid@example.com", "full_name": "Sara Khalid",
                "phone": "+971504444444", "preferred_language": "en",
                "position": "UX Designer", "department": "Design",
                "salary": Decimal("18000"), "currency": "AED",
                "start_date": date(2025, 3, 10), "country": "UAE", "city": "Dubai",
                "work_location": "office", "status": "completed",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "omar.hassan@example.com", "full_name": "Omar Hassan",
                "phone": "+971505555555", "preferred_language": "ar",
                "position": "DevOps Engineer", "department": "Engineering",
                "salary": Decimal("23000"), "currency": "AED",
                "start_date": date(2025, 4, 15), "country": "UAE", "city": "Dubai",
                "work_location": "hybrid", "status": "invited",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "lisa.wang@example.com", "full_name": "Lisa Wang",
                "phone": "+971506666666", "preferred_language": "en",
                "position": "Marketing Manager", "department": "Marketing",
                "salary": Decimal("20000"), "currency": "AED",
                "start_date": date(2025, 3, 20), "country": "UAE", "city": "Dubai",
                "work_location": "office", "status": "contract_sent",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "ahmad.yousef@example.com", "full_name": "Ahmad Yousef",
                "phone": "+971507777777", "preferred_language": "ar",
                "position": "Backend Developer", "department": "Engineering",
                "salary": Decimal("19000"), "currency": "AED",
                "start_date": date(2025, 5, 1), "country": "UAE", "city": "Sharjah",
                "work_location": "office", "status": "signed",
                "session_id": uuid.uuid4().hex[:20],
            },
            {
                "email": "emma.brown@example.com", "full_name": "Emma Brown",
                "phone": "+971508888888", "preferred_language": "en",
                "position": "HR Coordinator", "department": "Human Resources",
                "salary": Decimal("16000"), "currency": "AED",
                "start_date": date(2025, 3, 5), "country": "UAE", "city": "Dubai",
                "work_location": "office", "status": "completed",
                "session_id": uuid.uuid4().hex[:20],
            },
        ]

        hire_objects = []
        for data in new_hires_data:
            nh = NewHire(
                hr_employee_id=hr1.id,
                session_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                **data,
            )
            db.add(nh)
            db.flush()
            hire_objects.append(nh)

            # Benefits for each hire
            db.add(Benefit(new_hire_id=nh.id, benefit_type="health_insurance",
                           description="Comprehensive health insurance for employee and dependents",
                           value=Decimal("15000"), currency="AED"))
            db.add(Benefit(new_hire_id=nh.id, benefit_type="pto",
                           description="30 days paid annual leave",
                           value=Decimal("30")))
            db.add(Benefit(new_hire_id=nh.id, benefit_type="dental",
                           description="Full dental coverage",
                           value=Decimal("5000"), currency="AED"))

        db.flush()

        # ── Questions ─────────────────────────────────────────────
        questions_data = [
            {"new_hire": hire_objects[0], "question": "Can I work remotely occasionally?",
             "category": "policies", "priority": "normal", "status": "pending"},
            {"new_hire": hire_objects[0], "question": "What is the gym membership policy?",
             "category": "benefits", "priority": "low", "status": "pending"},
            {"new_hire": hire_objects[1], "question": "When does health insurance coverage start?",
             "category": "benefits", "priority": "high", "status": "answered",
             "hr_response": "Your health insurance coverage starts on your first day of employment."},
            {"new_hire": hire_objects[1], "question": "Can I negotiate my start date?",
             "category": "policies", "priority": "normal", "status": "pending"},
            {"new_hire": hire_objects[2], "question": "Is there a relocation package available?",
             "category": "relocation", "priority": "high", "status": "pending"},
            {"new_hire": hire_objects[4], "question": "What does the probation period entail?",
             "category": "legal", "priority": "normal", "status": "pending"},
            {"new_hire": hire_objects[5], "question": "Are there stock option grants?",
             "category": "salary", "priority": "normal", "status": "answered",
             "hr_response": "Stock options are available after 1 year as per our equity plan."},
        ]
        for qd in questions_data:
            q = Question(
                new_hire_id=qd["new_hire"].id,
                question=qd["question"],
                category=qd["category"],
                priority=qd["priority"],
                status=qd["status"],
                hr_response=qd.get("hr_response"),
                answered_at=datetime.now(timezone.utc) if qd.get("hr_response") else None,
                responded_by=hr1.id if qd.get("hr_response") else None,
            )
            db.add(q)

        # ── Conversations ─────────────────────────────────────────
        conv1 = Conversation(
            new_hire_id=hire_objects[0].id,
            session_id=f"conv_{uuid.uuid4().hex[:10]}",
            language="en",
            start_time=datetime.now(timezone.utc) - timedelta(hours=2),
            end_time=datetime.now(timezone.utc) - timedelta(hours=1, minutes=45),
            duration_seconds=900,
            sentiment_score=Decimal("0.85"),
            engagement_score=Decimal("0.92"),
            completion_status="interrupted",
            summary="New hire reviewed offer, asked 2 questions. Conversation interrupted.",
        )
        conv2 = Conversation(
            new_hire_id=hire_objects[3].id,
            session_id=f"conv_{uuid.uuid4().hex[:10]}",
            language="en",
            start_time=datetime.now(timezone.utc) - timedelta(days=3),
            end_time=datetime.now(timezone.utc) - timedelta(days=3) + timedelta(minutes=20),
            duration_seconds=1200,
            sentiment_score=Decimal("0.92"),
            engagement_score=Decimal("0.95"),
            completion_status="completed",
            summary="Positive conversation. Offer accepted enthusiastically.",
        )
        db.add_all([conv1, conv2])

        db.commit()
        print("Database seeded successfully!")
        print("─" * 50)
        print("HR Accounts:")
        print("  hr@company.com       / password123  (hr_manager)")
        print("  admin@company.com    / admin123     (hr_admin)")
        print("  specialist@company.com / spec123    (hr_specialist)")
        print(f"New Hires: {len(hire_objects)} records created")
        print(f"Questions: {len(questions_data)} records created")
        print(f"Templates: 3 records created")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
