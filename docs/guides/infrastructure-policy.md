# Infrastructure and Deployment Policy

This document defines the mandatory protocols for managing LeagueSphere's infrastructure and production environments.

## 🚨 Critical Safety Rule
**NEVER EDIT FILES DIRECTLY ON PRODUCTION SERVERS.**
Direct manual modification (SSH + vi/nano) is strictly forbidden to ensure consistency and reproducibility through Ansible.

## 🛠 Infrastructure Management (Ansible)
All server configurations are managed via Ansible playbooks located in `infrastructure/container/`.

### Deployment Protocol
1. **Develop Fix**: Modify the appropriate Ansible playbooks or Docker configurations.
2. **Test First**: Deploy to `servyy-test.lxd` (`10.185.182.207`) using the Ansible test inventory.
3. **Validate**: Thoroughly verify all configurations and services on the test host.
4. **Production**: Only deploy to the production host (`lehel.xyz`) AFTER successful verification in the test environment.

## 📦 Staging Environment
Staging provides a near-production environment for final validation before a release.

- **URL**: [https://stage.leaguesphere.app](https://stage.leaguesphere.app)
- **Automatic Deployment**: CI/CD pipelines push successful `:staging` images to the staging host.
- **Manual Trigger**: Use `./container/deploy.sh stage` to manually trigger a staging update.
- **Validation Requirement**: All changes MUST be validated on staging before merging into the `master` branch.

## 🚀 Release Management
Releases are coordinated using the `deploy.sh` script in the `container/` directory and monitored via the CircleCI dashboard.

### Release Versions
- **Major**: Breaking changes or major architectural shifts.
- **Minor**: Significant new features.
- **Patch**: Bug fixes and minor improvements.

### Protocol
1. **Trigger Release**: Run `./container/deploy.sh <type>` to tag and trigger the deployment pipeline.
2. **Staging Automation**: CircleCI automatically builds, tests, and deploys to the staging environment.
3. **Manual Approval (Required)**: For production deployments, you **MUST** visit the CircleCI dashboard and manually approve the `hold_production` job.
4. **Production Deployment**: Once approved, the pipeline will proceed with the production release and database migrations.
5. **Verify**: Ensure all CI checks are GREEN and the production site is functional.
