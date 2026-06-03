import asyncio
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.scenarios.trojanized_extension import TrojanizedExtensionScenario
from data.ingest import ingest_scenario


SCENARIOS = {
    "trojanized_extension": TrojanizedExtensionScenario,
}


async def main():
    parser = argparse.ArgumentParser(description="Generate and ingest synthetic attack data")
    parser.add_argument("scenario", choices=list(SCENARIOS.keys()) + ["all"])
    parser.add_argument("--hec-url", default=os.getenv("SPLUNK_HEC_URL", "https://localhost:8088"))
    parser.add_argument("--hec-token", default=os.getenv("SPLUNK_HEC_TOKEN", ""))
    parser.add_argument("--seed", type=int, default=None, help="Fixed seed for reproducible data")
    parser.add_argument("--dry-run", action="store_true", help="Print events without ingesting")
    parser.add_argument("--json", action="store_true", help="Output events as JSON (for inspection)")
    args = parser.parse_args()

    scenarios_to_run = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]

    for name in scenarios_to_run:
        scenario = SCENARIOS[name](seed=args.seed)
        events = scenario.generate()
        total = sum(len(v) for v in events.values())
        print(f"\n[{name}] Generated {total} events across {len(events)} indexes")

        if args.json:
            print(json.dumps(events, indent=2, default=str))
            continue

        if args.dry_run:
            for index, index_events in events.items():
                print(f"  {index}: {len(index_events)} events")
                for e in index_events[:2]:
                    print(f"    {e}")
                if len(index_events) > 2:
                    print(f"    ... and {len(index_events) - 2} more")
            continue

        if not args.hec_token:
            print("ERROR: --hec-token or SPLUNK_HEC_TOKEN env var required for ingest")
            sys.exit(1)

        results = await ingest_scenario(events, args.hec_url, args.hec_token)
        for index, count in results.items():
            print(f"  {index}: {count}/{len(events[index])} events ingested")


if __name__ == "__main__":
    asyncio.run(main())
