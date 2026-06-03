from data.scenarios.base import BaseScenario


class TrojanizedExtensionScenario(BaseScenario):
    """
    Modeled on GlasswormRAT (2026). Attack timeline:

    T+0:   Extension 'codestyle-formatter' v2.1.0 published (author account compromised)
    T+5:   First developer auto-updates the extension
    T+6:   Extension requests new permissions (filesystem, network)
    T+8:   Extension makes callback to C2 domain
    T+10:  Extension reads .git-credentials from local filesystem
    T+12:  Extension exfiltrates credentials via HTTPS POST to C2
    T+15:  Stolen GitHub PAT used from attacker IP to clone internal repos
    T+18:  Attacker pushes backdoored commit to internal repo
    T+20:  CI pipeline triggers on the backdoored commit
    T+22:  CI pulls malicious npm dependency introduced in the commit
    T+25:  Pipeline secrets (DEPLOY_KEY, NPM_TOKEN) accessed during tainted build
    T+30:  Three more developers auto-update the extension (lateral spread)
    """

    C2_DOMAIN = "c2.styleformat.io"
    EXTENSION_ID = "codestyle-formatter"
    EXTENSION_VERSION = "2.1.0"

    def generate(self) -> dict[str, list[dict]]:
        self._malicious_hash = self.fake_hash()
        self._attacker_ip = self.fake_ip()
        self._malicious_pkg_hash = self.fake_hash()
        self._backdoor_commit_sha = self.fake_hash()[:12]

        return {
            "extensions": self._extension_events(),
            "git_events": self._git_events(),
            "secret_audit": self._secret_events(),
            "cicd_events": self._cicd_events(),
            "threat_intel": self._threat_intel_events(),
        }

    def _extension_events(self) -> list[dict]:
        victim = self.dev(0)
        victim_ws = self.workstation(3)
        events = []

        events.append({
            "timestamp": self.ts(0),
            "event_type": "extension_published",
            "extension_id": self.EXTENSION_ID,
            "version": self.EXTENSION_VERSION,
            "publisher": "styletools-official",
            "hash": self._malicious_hash,
            "change_summary": "Performance improvements and new formatting rules",
        })

        events.append({
            "timestamp": self.ts(5),
            "event_type": "extension_updated",
            "extension_id": self.EXTENSION_ID,
            "version": self.EXTENSION_VERSION,
            "host": victim_ws,
            "user": victim,
            "previous_version": "2.0.3",
        })

        events.append({
            "timestamp": self.ts(6),
            "event_type": "permission_change",
            "extension_id": self.EXTENSION_ID,
            "host": victim_ws,
            "user": victim,
            "new_permissions": ["filesystem.read", "network.outbound"],
            "previous_permissions": ["editor.format"],
        })

        events.append({
            "timestamp": self.ts(8),
            "event_type": "network_callback",
            "extension_id": self.EXTENSION_ID,
            "host": victim_ws,
            "user": victim,
            "destination": self.C2_DOMAIN,
            "port": 443,
            "protocol": "HTTPS",
            "bytes_sent": 156,
        })

        events.append({
            "timestamp": self.ts(10),
            "event_type": "file_access",
            "extension_id": self.EXTENSION_ID,
            "host": victim_ws,
            "user": victim,
            "file_path": f"/home/{victim}/.git-credentials",
            "access_type": "read",
        })

        events.append({
            "timestamp": self.ts(12),
            "event_type": "network_callback",
            "extension_id": self.EXTENSION_ID,
            "host": victim_ws,
            "user": victim,
            "destination": self.C2_DOMAIN,
            "port": 443,
            "protocol": "HTTPS",
            "bytes_sent": 4096,
        })

        for i in range(3):
            spread_dev = self.dev(i + 1)
            spread_ws = self.workstation(i + 5)
            events.append({
                "timestamp": self.ts(30 + i * 3),
                "event_type": "extension_updated",
                "extension_id": self.EXTENSION_ID,
                "version": self.EXTENSION_VERSION,
                "host": spread_ws,
                "user": spread_dev,
                "previous_version": "2.0.3",
            })
            events.append({
                "timestamp": self.ts(32 + i * 3),
                "event_type": "network_callback",
                "extension_id": self.EXTENSION_ID,
                "host": spread_ws,
                "user": spread_dev,
                "destination": self.C2_DOMAIN,
                "port": 443,
                "protocol": "HTTPS",
                "bytes_sent": self.rng.randint(100, 300),
            })

        return events

    def _git_events(self) -> list[dict]:
        victim = self.dev(0)
        target_repo = self.repo("internal-tools")
        secondary_repo = self.repo("payment-service")

        return [
            {
                "timestamp": self.ts(15),
                "event_type": "repo_clone",
                "repo": target_repo,
                "user": victim,
                "source_ip": self._attacker_ip,
                "user_agent": "git/2.43.0",
                "auth_method": "pat",
            },
            {
                "timestamp": self.ts(16),
                "event_type": "repo_clone",
                "repo": secondary_repo,
                "user": victim,
                "source_ip": self._attacker_ip,
                "user_agent": "git/2.43.0",
                "auth_method": "pat",
            },
            {
                "timestamp": self.ts(18),
                "event_type": "push",
                "repo": target_repo,
                "user": victim,
                "source_ip": self._attacker_ip,
                "branch": "main",
                "commits": 1,
                "files_changed": ["package.json", "src/utils/logger.js"],
                "commit_message": "chore: update logging dependency",
                "commit_sha": self._backdoor_commit_sha,
            },
        ]

    def _secret_events(self) -> list[dict]:
        victim = self.dev(0)
        victim_ws = self.workstation(3)
        ci_runner = self.runner(2)
        target_repo = self.repo("internal-tools")

        return [
            {
                "timestamp": self.ts(10),
                "event_type": "credential_read",
                "host": victim_ws,
                "user": victim,
                "credential_type": "git_credential",
                "target": "github.com",
                "process": self.EXTENSION_ID,
            },
            {
                "timestamp": self.ts(25),
                "event_type": "secret_accessed",
                "host": ci_runner,
                "pipeline": f"{target_repo}/main",
                "secret_name": "DEPLOY_KEY",
                "accessor": "ci-service",
                "source_ip": "10.0.1.50",
            },
            {
                "timestamp": self.ts(26),
                "event_type": "secret_accessed",
                "host": ci_runner,
                "pipeline": f"{target_repo}/main",
                "secret_name": "NPM_TOKEN",
                "accessor": "ci-service",
                "source_ip": "10.0.1.50",
            },
        ]

    def _cicd_events(self) -> list[dict]:
        ci_runner = self.runner(2)
        target_repo = self.repo("internal-tools")

        return [
            {
                "timestamp": self.ts(20),
                "event_type": "pipeline_triggered",
                "repo": target_repo,
                "branch": "main",
                "trigger": "push",
                "runner": ci_runner,
                "commit_sha": self._backdoor_commit_sha,
            },
            {
                "timestamp": self.ts(22),
                "event_type": "dependency_install",
                "repo": target_repo,
                "runner": ci_runner,
                "package": "@malicious/log-helper",
                "version": "1.0.0",
                "registry": "npmjs.org",
                "hash": self._malicious_pkg_hash,
            },
            {
                "timestamp": self.ts(23),
                "event_type": "process_spawn",
                "runner": ci_runner,
                "parent_process": "npm install",
                "child_process": "node postinstall.js",
                "command_line": "node -e 'require(\"child_process\").execSync(\"curl ...\")'",
            },
        ]

    def _threat_intel_events(self) -> list[dict]:
        return [
            {
                "timestamp": self.ts(0),
                "ioc_type": "domain",
                "ioc_value": self.C2_DOMAIN,
                "campaign": "GlasswormRAT",
                "confidence": "high",
                "mitre_technique": "T1195.002",
                "description": "C2 domain for GlasswormRAT supply chain campaign",
            },
            {
                "timestamp": self.ts(0),
                "ioc_type": "hash",
                "ioc_value": self._malicious_hash,
                "campaign": "GlasswormRAT",
                "confidence": "high",
                "mitre_technique": "T1195.002",
                "description": "SHA256 of trojanized codestyle-formatter v2.1.0",
            },
            {
                "timestamp": self.ts(0),
                "ioc_type": "package_name",
                "ioc_value": "@malicious/log-helper",
                "campaign": "GlasswormRAT",
                "confidence": "medium",
                "mitre_technique": "T1195.001",
                "description": "Malicious npm package deployed via backdoored commit",
            },
        ]
