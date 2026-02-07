from app.db.base_class import Base  # noqa

# Import all models here so Alembic can detect them
from app.models.hr_employee import HREmployee  # noqa
from app.models.new_hire import NewHire  # noqa
from app.models.contract import Contract  # noqa
from app.models.contract_template import ContractTemplate  # noqa
from app.models.benefit import Benefit  # noqa
from app.models.conversation import Conversation  # noqa
from app.models.conversation_message import ConversationMessage  # noqa
from app.models.question import Question  # noqa
from app.models.audit_log import AuditLog  # noqa
