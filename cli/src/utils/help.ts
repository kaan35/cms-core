import { CURRENT_CMS_VERSION } from "./pinnedVersions.js";

export function printHelp(): void {
  console.log(`
CMS CLI v${CURRENT_CMS_VERSION}

Usage:
  cms new [project-name] [options]
  cms upgrade <target-version> [options]
  cms --help
  cms --version

Commands:
  new [name]          Scaffold a new production-ready CMS project
    --dir             Target directory (default: "./projects")
    --admin, --no-admin   Include or exclude Admin Shell (default: included)
    --client, --no-client Include or exclude Next.js Client (default: no-client)
    --profile         Plugin profile: "minimal" or "full"
    --env             Server mode: "production" (default) or "development"
    --cms-tag         Docker image tag for CMS core (default: "latest")
    --api-port        Host port for API service (default: 3001)
    --admin-port      Host port for Admin Shell service (default: 3002)
    --client-port     Host port for Next.js Client site (default: 3000)
    --no-auto-update  Disable 1-minute cron auto-update in .env
    -y, --yes         Skip interactive prompts and use defaults
    -i, --interactive Force interactive wizard mode

  upgrade <tag>       Upgrade an existing project to a specific CMS image tag
    --dir             Target project directory (default: current directory)

Flags:
  -h, --help          Show this help message
  -v, --version       Show CLI version
`);
}
