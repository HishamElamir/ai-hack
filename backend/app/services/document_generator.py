import json
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.new_hire import NewHire
from app.models.contract import Contract
from app.models.contract_template import ContractTemplate


DOCUMENT_GENERATION_SYSTEM_PROMPT = """You are a legal document generation assistant specializing in employment contracts for the MENA region. Your role is to:

1. Generate legally accurate employment documents
2. Follow jurisdiction-specific requirements (UAE, Saudi Arabia, Egypt, etc.)
3. Use provided templates as foundation
4. Customize based on role, level, and company policies
5. Maintain professional legal language
6. Include all required clauses and disclosures

OUTPUT FORMAT:
- Well-structured legal document
- Clear section headers
- Numbered clauses
- Professional formatting
- Ready for PDF conversion
"""


class DocumentGeneratorService:
    def __init__(self):
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            except ImportError:
                pass

    async def generate_contract(
        self,
        db: Session,
        new_hire: NewHire,
        contract_type: str,
        template: Optional[ContractTemplate] = None,
        generation_prompt: Optional[str] = None,
        custom_variables: Optional[dict] = None,
        parent_contract_id: Optional[str] = None,
        version: int = 1,
    ) -> Contract:
        context = self._prepare_context(new_hire, custom_variables or {})
        content = await self._generate_content(template, context, generation_prompt, contract_type)

        contract = Contract(
            new_hire_id=new_hire.id,
            template_id=template.id if template else None,
            contract_type=contract_type,
            content=content,
            status="draft",
            version=version,
            parent_contract_id=parent_contract_id,
            generation_prompt=generation_prompt,
            ai_model=settings.OPENAI_MODEL if self.openai_client else "template_fallback",
            generation_tokens=0,
            variables=custom_variables or {},
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)
        return contract

    async def _generate_content(
        self,
        template: Optional[ContractTemplate],
        context: dict,
        generation_prompt: Optional[str],
        contract_type: str,
    ) -> str:
        if self.openai_client:
            return await self._generate_with_ai(template, context, generation_prompt, contract_type)
        return self._generate_from_template(template, context, contract_type)

    async def _generate_with_ai(
        self,
        template: Optional[ContractTemplate],
        context: dict,
        generation_prompt: Optional[str],
        contract_type: str,
    ) -> str:
        template_content = template.content_template if template else "Generate a standard document."

        messages = [
            {"role": "system", "content": DOCUMENT_GENERATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Generate a {contract_type} document.

TEMPLATE:
{template_content}

CONTEXT:
{json.dumps(context, indent=2, default=str)}

CUSTOM INSTRUCTIONS:
{generation_prompt or 'Use standard terms'}

Generate a complete, legally sound document.""",
            },
        ]

        response = self.openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=4096,
        )

        return response.choices[0].message.content

    def _generate_from_template(
        self,
        template: Optional[ContractTemplate],
        context: dict,
        contract_type: str,
    ) -> str:
        emp = context.get("employee", {})
        company = context.get("company", {})
        employment = context.get("employment", {})

        type_titles = {
            "employment_contract": "EMPLOYMENT CONTRACT",
            "offer_letter": "OFFER LETTER",
            "nda": "NON-DISCLOSURE AGREEMENT",
            "equity_agreement": "EQUITY AGREEMENT",
        }
        title = type_titles.get(contract_type, "EMPLOYMENT DOCUMENT")

        benefits_text = ""
        for i, b in enumerate(context.get("benefits", []), 1):
            benefits_text += f"   {i}. {b.get('description', 'N/A')}\n"

        return f"""{title}

This {title} ("Agreement") is entered into on {employment.get('start_date', 'TBD')} between:

EMPLOYER:
{company.get('name', 'Company')}
{company.get('address', '')}

EMPLOYEE:
{emp.get('full_name', 'Employee Name')}
{emp.get('email', '')}

1. POSITION AND DUTIES
   The Employee is hired as {emp.get('position', 'TBD')} in the {emp.get('department', 'TBD')} department.

2. COMMENCEMENT AND PROBATION
   2.1 The employment shall commence on {employment.get('start_date', 'TBD')}.
   2.2 The first {employment.get('probation_period_months', 3)} months shall be a probation period.

3. COMPENSATION
   3.1 The Employee shall receive a monthly salary of {emp.get('salary', 'TBD')} {emp.get('currency', 'USD')}.

4. WORKING HOURS
   4.1 Standard working hours are 40 hours per week.
   4.2 Working arrangement: {employment.get('work_location', 'office')}

5. ANNUAL LEAVE
   5.1 The Employee is entitled to {employment.get('annual_leave_days', 30)} days of paid annual leave per year.

6. BENEFITS
{benefits_text or '   As per company policy.'}

7. TERMINATION
   7.1 Either party may terminate this contract with {employment.get('notice_period_days', 30)} days written notice.
   7.2 The Employee is entitled to end-of-service gratuity as per applicable labor law.

8. CONFIDENTIALITY
   The Employee agrees to maintain the confidentiality of all proprietary information.

9. GOVERNING LAW
   This Agreement shall be governed by the laws of {employment.get('country', 'UAE')}.


EMPLOYER SIGNATURE:
________________________
{company.get('signatory_name', 'Authorized Signatory')}
{company.get('signatory_title', 'CEO')}

EMPLOYEE SIGNATURE:
________________________
{emp.get('full_name', 'Employee Name')}
Date: ________________
"""

    def _prepare_context(self, new_hire: NewHire, custom_vars: dict) -> dict:
        return {
            "company": {
                "name": "TechCorp MENA",
                "address": "Dubai Silicon Oasis, Dubai, UAE",
                "registration_number": "123456",
                "signatory_name": "John Smith",
                "signatory_title": "CEO",
            },
            "employee": {
                "full_name": new_hire.full_name,
                "email": new_hire.email,
                "phone": new_hire.phone,
                "position": new_hire.position,
                "department": new_hire.department,
                "start_date": str(new_hire.start_date),
                "salary": str(new_hire.salary),
                "currency": new_hire.currency,
            },
            "employment": {
                "employment_type": new_hire.employment_type,
                "work_location": new_hire.work_location or "office",
                "country": new_hire.country,
                "probation_period_months": custom_vars.get("probation_period_months", 3),
                "notice_period_days": custom_vars.get("notice_period_days", 30),
                "annual_leave_days": custom_vars.get("annual_leave_days", 30),
                "start_date": str(new_hire.start_date),
            },
            "benefits": [
                {
                    "type": b.benefit_type,
                    "description": b.description,
                    "value": float(b.value) if b.value else None,
                }
                for b in new_hire.benefits
                if not b.deleted_at
            ],
        }
