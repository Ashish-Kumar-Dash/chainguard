from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
import random
import hashlib


DEVELOPER_NAMES = [
    "dev-sarah", "dev-marcus", "dev-priya", "dev-alex", "dev-chen",
    "dev-jordan", "dev-fatima", "dev-kenji", "dev-elena", "dev-omar",
    "dev-liam", "dev-nadia", "dev-yuki", "dev-diego", "dev-amara",
]

WORKSTATION_PREFIXES = ["ws-dev", "ws-eng", "wk-dev", "dt-dev", "mb-dev"]
CI_RUNNER_PREFIXES = ["ci-runner", "gh-runner", "build-agent", "ci-node"]
REPO_ORGS = ["acme-corp", "internal", "platform", "devteam", "eng-org"]


class BaseScenario(ABC):
    def __init__(self, seed: int | None = None, base_time: datetime | None = None):
        self.rng = random.Random(seed)
        self.base_time = base_time or datetime.now(timezone.utc) - timedelta(hours=6)
        self._developers = self.rng.sample(DEVELOPER_NAMES, k=6)
        self._ws_prefix = self.rng.choice(WORKSTATION_PREFIXES)
        self._ci_prefix = self.rng.choice(CI_RUNNER_PREFIXES)
        self._org = self.rng.choice(REPO_ORGS)

    def dev(self, index: int = 0) -> str:
        return self._developers[index % len(self._developers)]

    def workstation(self, index: int = 0) -> str:
        return f"{self._ws_prefix}-{index + 1:02d}"

    def runner(self, index: int = 0) -> str:
        return f"{self._ci_prefix}-{index + 1:02d}"

    def repo(self, name: str) -> str:
        return f"{self._org}/{name}"

    def ts(self, offset_minutes: int) -> float:
        jitter = self.rng.randint(0, 30)
        return (self.base_time + timedelta(minutes=offset_minutes, seconds=jitter)).timestamp()

    def ts_iso(self, offset_minutes: int) -> str:
        dt = self.base_time + timedelta(minutes=offset_minutes)
        return dt.isoformat()

    def fake_hash(self) -> str:
        return hashlib.sha256(self.rng.randbytes(16)).hexdigest()

    def fake_ip(self) -> str:
        return f"{self.rng.randint(45, 199)}.{self.rng.randint(1, 254)}.{self.rng.randint(1, 254)}.{self.rng.randint(1, 254)}"

    @abstractmethod
    def generate(self) -> dict[str, list[dict]]:
        """Return {index_name: [events]} dict."""
        ...
