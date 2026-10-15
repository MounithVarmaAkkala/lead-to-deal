import os
import tempfile

# Must run before the app (and its engine) is imported.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"
