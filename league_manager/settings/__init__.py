from .base import *

env = os.environ.get("league_manager")
if env == "dev":
    from .dev import *
elif env == "test_sqlite":
    from .test_sqlite import *
else:
    from .prod import *
