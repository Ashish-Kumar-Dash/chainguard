import pytest
from datetime import datetime, timezone


@pytest.fixture
def sample_ioc():
    from app.models import IOC, IOCType
    return IOC(type=IOCType.HASH, value="abc123def456", source="alert_input")


@pytest.fixture
def sample_finding(sample_ioc):
    from app.models import Finding, QueryResult
    return Finding(
        description="Malicious extension hash found in install logs",
        severity="high",
        evidence=[
            QueryResult(
                spl='search index=extensions hash="abc123def456"',
                results=[{"host": "dev-01", "extension": "evil-formatter"}],
                timestamp=datetime.now(timezone.utc),
                node="investigate",
            )
        ],
        iocs=[sample_ioc],
        mitre_technique="T1195.002",
    )


@pytest.fixture
def sample_action():
    from app.models import RemediationAction, ActionPriority
    return RemediationAction(
        id="action-001",
        description="Rotate GitHub PAT for dev-01",
        priority=ActionPriority.CRITICAL,
        category="rotate_secret",
        target="github_pat_dev01",
    )
