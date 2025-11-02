# Manager System - Rollout Plan

**Feature:** Three-tier Manager Permission System
**Created:** 2025-11-02
**Status:** ✅ Ready for Deployment
**Target Deployment:** TBD

## Rollout Overview

This document outlines the deployment strategy for the manager system feature, including pre-deployment checklist, deployment steps, rollback procedures, and post-deployment monitoring.

## Pre-Deployment Checklist

### Code Review
- [ ] All code reviewed and approved
- [ ] PR merged to master branch
- [ ] No merge conflicts
- [ ] All tests passing in CI/CD
- [ ] Code follows project style guidelines
- [ ] No security vulnerabilities identified

### Database
- [ ] Migrations created and tested
- [ ] Migration scripts reviewed
- [ ] Database backup completed
- [ ] Rollback migration plan prepared
- [ ] Database indexes verified

### Documentation
- [ ] Feature documentation complete (this directory)
- [ ] Admin user guide created
- [ ] End-user documentation updated
- [ ] API documentation updated
- [ ] CLAUDE.md updated with feature reference

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Browser tests passing (Chrome MCP)
- [ ] Performance tests passed
- [ ] Security audit completed
- [ ] Test coverage > 80%

### Infrastructure
- [ ] Production database ready
- [ ] Static files collected
- [ ] Frontend assets built
- [ ] Docker images built and tested
- [ ] Health checks configured
- [ ] Monitoring alerts configured

---

## Deployment Strategy

### Phase 1: Staging Deployment (Week 1)

**Objective:** Deploy to staging environment and validate with real-world-like data

#### Steps:
1. **Database Migration (Staging)**
   ```bash
   python manage.py migrate
   ```

2. **Deploy Code (Staging)**
   ```bash
   git pull origin master
   docker-compose build
   docker-compose up -d
   ```

3. **Collect Static Files**
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **Smoke Tests**
   - Verify application starts
   - Check health endpoint: `/health/`
   - Login as test user
   - Access manager dashboard
   - Verify permissions work

5. **Create Initial Data**
   ```bash
   # Assign league managers to existing leagues
   # Assign team managers to existing teams
   # Test with real league data
   ```

#### Validation Criteria:
- [ ] Application starts without errors
- [ ] Database migrations applied successfully
- [ ] Manager dashboard accessible
- [ ] Permission checks working
- [ ] No 500 errors in logs
- [ ] Performance meets targets (< 2s dashboard load)

#### Duration: 3-5 days

---

### Phase 2: User Acceptance Testing (Week 2)

**Objective:** Get feedback from beta users (league administrators)

#### Participants:
- 2-3 league administrators
- 2-3 team managers
- 1-2 gameday coordinators

#### Test Scenarios:
1. League admin assigns team managers
2. League admin assigns gameday managers
3. Team manager updates roster
4. Gameday manager updates gameday details
5. Gameday manager assigns officials

#### Feedback Collection:
- Daily check-ins with beta users
- Bug reports tracked in GitHub Issues
- Feature requests documented for future iterations
- Usability feedback collected

#### Success Criteria:
- [ ] All beta users can complete assigned tasks
- [ ] No critical bugs reported
- [ ] Positive feedback on usability
- [ ] Performance acceptable to users
- [ ] Documentation sufficient for users

#### Duration: 5-7 days

---

### Phase 3: Production Deployment (Week 3)

**Objective:** Deploy to production environment via automated CI/CD pipeline

#### Deployment Method: Automated GitHub Actions

LeagueSphere uses an automated deployment pipeline defined in `.github/workflows/ci.yaml`. Deployment is triggered by pushing a git tag.

#### Pre-Deployment Steps:

1. **Communication**
   - Announce deployment to users
   - Email notification 48 hours in advance
   - Note: Docker server pulls new images automatically within 2 hours
   - No maintenance window required (zero-downtime deployment)

2. **Backup**
   ```bash
   # Database backup (manual safety check)
   mysqldump -u root -p leaguesphere > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Pre-Flight Checks**
   - [ ] All staging tests passed
   - [ ] Beta user feedback addressed
   - [ ] Database backup verified
   - [ ] Rollback plan confirmed
   - [ ] Team monitoring deployment

#### Automated Deployment Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yaml`) automatically:

**Step 1: Create and Push Tag**
```bash
# Create release tag
git tag -a v2.12.0 -m "Release: Manager System"
git push origin v2.12.0
```

**Step 2: Automated CI/CD Pipeline Execution** (GitHub Actions)

The pipeline automatically executes these jobs in sequence:

1. **Tests** (Parallel execution)
   - ✅ Build and test Django backend (`build-test-django`)
   - ✅ Build and test Scorecard frontend (`build-test-scorecard`)
   - ✅ Build and test Liveticker frontend (`build-test-liveticker`)
   - ✅ Build Passcheck frontend (`build-passcheck`)

2. **Build Docker Images** (After tests pass)
   - ✅ Build backend image (`build-backend-image`)
     - Dockerfile: `container/app.Dockerfile`
     - Saved as artifact for reuse
   - ✅ Build frontend image (`build-frontend-image`)
     - Dockerfile: `container/nginx.Dockerfile`
     - Saved as artifact for reuse

3. **Validate Images** (Parallel execution)
   - ✅ Test backend health (`test-backend-image`)
   - ✅ Check Django migrations (`check-migrations`)

4. **Deploy to Docker Hub** (After validation passes)
   - ✅ Push backend image (`deploy-backend`)
     - Target: `docker.io/leaguesphere/backend:v2.12.0`
     - Also tagged as: `docker.io/leaguesphere/backend:latest`
   - ✅ Push frontend image (`deploy-frontend`)
     - Target: `docker.io/leaguesphere/frontend:v2.12.0`
     - Also tagged as: `docker.io/leaguesphere/frontend:latest`

5. **Run Database Migrations** (After backend deployment)
   - ✅ Execute migrations in container (`run-migrations`)
   - Uses backend image artifact
   - Migrations run automatically before deployment completes

**Step 3: Automated Image Pull** (Docker Server)
```bash
# Docker server automatically pulls new images within 2 hours
# No manual intervention required
# Services restart with new images automatically
```

**Step 4: Monitor Deployment** (Post-tag push)

Monitor the GitHub Actions workflow:
```bash
# Check workflow status
gh run list --workflow=ci.yaml

# Watch workflow logs
gh run watch
```

**Step 5: Verify Docker Hub Deployment**
```bash
# Check images were pushed successfully
# Visit: https://hub.docker.com/r/leaguesphere/backend/tags
# Visit: https://hub.docker.com/r/leaguesphere/frontend/tags

# Verify tags:
# - leaguesphere/backend:v2.12.0
# - leaguesphere/backend:latest
# - leaguesphere/frontend:v2.12.0
# - leaguesphere/frontend:latest
```

**Step 6: Wait for Automatic Deployment** (Within 2 hours)
```bash
# Docker server automatically pulls new images
# No action required - deployment is fully automated
```

**Step 7: Post-Deployment Verification** (After auto-deployment)
```bash
# Verify application version (after auto-pull completes)
curl https://leaguesphere.example.com/

# Check manager dashboard
curl https://leaguesphere.example.com/managers/dashboard/

# Verify Docker images on server
ssh docker-server "docker images | grep leaguesphere"
```

#### Estimated Total Downtime: **0 minutes (Zero-downtime deployment)**

**Note:** The automated deployment process uses rolling updates with zero downtime. New containers are started before old containers are stopped, ensuring continuous service availability.

---

### Phase 4: Post-Deployment Monitoring (Week 3-4)

**Objective:** Monitor system health and user adoption

#### Monitoring Checklist:

**Day 1 (Immediate)**
- [ ] Monitor error logs for 500 errors
- [ ] Check database connection pool
- [ ] Verify dashboard load times
- [ ] Monitor user logins
- [ ] Check for permission errors

**Week 1**
- [ ] Daily log review
- [ ] Performance metrics review
- [ ] User feedback collection
- [ ] Database query optimization if needed
- [ ] Respond to bug reports within 24 hours

**Week 2-4**
- [ ] Weekly metrics review
- [ ] User adoption tracking
- [ ] Feature usage analytics
- [ ] Performance trending
- [ ] Plan next iteration based on feedback

#### Key Metrics to Monitor:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Dashboard load time | < 2s | > 3s |
| API response time | < 500ms | > 1s |
| Error rate | < 0.1% | > 1% |
| Permission check failures | 0 | > 10/day |
| User adoption | 50% in 2 weeks | < 20% |

---

## Rollback Procedure

If critical issues arise during or after automated deployment:

### Option 1: Automated Rollback via Tag (Recommended)

**Create rollback tag to trigger automated deployment of previous version:**

```bash
# Tag the previous stable version
git tag -a v2.11.4-rollback -m "Rollback: Manager System issues"
git push origin v2.11.4-rollback

# GitHub Actions will automatically:
# 1. Run all tests on v2.11.4
# 2. Build Docker images from v2.11.4
# 3. Push images to Docker Hub as v2.11.4-rollback
# 4. Docker server will pull new images within 2 hours
```

**For urgent rollback within 2 hours:**
```bash
# Manually pull previous version on Docker server
ssh docker-server "docker pull leaguesphere/backend:v2.11.4"
ssh docker-server "docker pull leaguesphere/frontend:v2.11.4"

# Restart with previous version
ssh docker-server "docker-compose down"
ssh docker-server "docker-compose up -d"
```

**Duration:** Automatic rollback within 2 hours, manual rollback within 15 minutes

### Option 2: Database Rollback (If migration issues)

```bash
# Only if database migrations caused issues
# SSH to database server
ssh db-server

# Restore from backup
mysql -u root -p leaguesphere < backup_YYYYMMDD_HHMMSS.sql

# Restart application to use rolled-back database
ssh docker-server "docker-compose restart backend"
```

### Option 3: Emergency Manual Rollback

**Only for critical situations requiring immediate action:**

```bash
# On Docker server
ssh docker-server

# Stop current services
docker-compose down

# Pull previous stable version
docker pull leaguesphere/backend:v2.11.4
docker pull leaguesphere/frontend:v2.11.4

# Update docker-compose.yml to use v2.11.4
sed -i 's/:latest/:v2.11.4/g' docker-compose.yml

# Start services with previous version
docker-compose up -d

# Verify health
curl http://localhost:8000/health/
docker-compose logs --tail=100
```

### Post-Rollback Steps

1. **Verify System**
   ```bash
   # Health check
   curl https://leaguesphere.example.com/health/

   # Check application version
   curl https://leaguesphere.example.com/

   # Monitor logs
   ssh docker-server "docker-compose logs --tail=200"
   ```

2. **Notify Users**
   - Update status page with rollback notice
   - Send email notification explaining the issue
   - Provide timeline for fix and re-deployment

3. **Root Cause Analysis**
   - Review GitHub Actions logs
   - Analyze Docker container logs
   - Review database migration logs
   - Document issues in GitHub Issue

### Triggers for Rollback:

- Database migration failures
- Application won't start
- Critical security vulnerability discovered
- >10% error rate
- Data corruption detected
- Performance degradation > 5x baseline

---

## Communication Plan

### Pre-Deployment
- **T-48 hours:** Email to all users announcing new feature deployment
  - Note: Zero-downtime deployment, no service interruption expected
  - New features will be available automatically within 2 hours of tag push
- **T-24 hours:** Reminder email with feature highlights
- **T-0 (Tag Push):** Internal team notification that deployment has started

### During Automated Deployment
- **GitHub Actions monitoring:** Team watches CI/CD pipeline progress
- **Slack notifications:** Automated updates from GitHub Actions
  - Tests passed
  - Docker images built
  - Images pushed to Docker Hub
  - Migrations completed
- **Status page:** Updated only if issues detected

### Deployment Timeline
- **T+0:** Tag pushed, GitHub Actions starts automatically
- **T+15-20 min:** Tests complete
- **T+25-35 min:** Docker images built and pushed to Docker Hub
- **T+35-40 min:** Migrations run automatically
- **T+40 min - 2 hours:** Docker server automatically pulls new images
- **T+2 hours (max):** Deployment complete, new version live

### Post-Deployment
- **T+2 hours:** Verify deployment completed successfully
- **T+4 hours:** System health check and monitoring review
- **T+24 hours:** Deployment summary email with:
  - New manager system features
  - Quick start guide links
  - Support contact information
- **T+1 week:** Usage metrics and feedback report
  - Number of manager permissions created
  - Dashboard usage statistics
  - User feedback summary

---

## Training & Documentation

### Admin Training
- **Before Deployment:** 1-hour training session for administrators
  - How to assign league managers
  - How to assign team/gameday managers
  - Permission management best practices
  - Troubleshooting common issues

### User Documentation
- **Manager Dashboard Guide** - How to use the dashboard
- **League Manager Guide** - Managing leagues and assigning sub-managers
- **Gameday Manager Guide** - Managing gamedays and officials
- **Team Manager Guide** - Managing rosters and passcheck

### Support Resources
- FAQ document
- Video tutorials (optional)
- Help desk articles
- In-app help links

---

## Success Criteria

Deployment is considered successful if:

1. **Technical Criteria**
   - [ ] Zero critical bugs in first week
   - [ ] Dashboard load time < 2s
   - [ ] Error rate < 0.1%
   - [ ] No data loss or corruption
   - [ ] Performance within targets

2. **User Adoption**
   - [ ] 50% of eligible users activated within 2 weeks
   - [ ] Positive feedback from beta users
   - [ ] < 5 support tickets per week
   - [ ] Users can complete tasks without help

3. **Business Value**
   - [ ] Reduced administrative overhead
   - [ ] Faster gameday setup
   - [ ] Improved permission management
   - [ ] Better user satisfaction

---

## Post-Deployment Enhancements

### Short-term (1-2 months)
- [ ] Add email notifications for permission assignments
- [ ] Implement permission expiration dates
- [ ] Add bulk permission assignment UI
- [ ] Create audit log for manager actions

### Medium-term (3-6 months)
- [ ] Manager analytics dashboard
- [ ] Permission delegation feature
- [ ] Mobile app support
- [ ] Integration with calendar apps

### Long-term (6-12 months)
- [ ] AI-powered permission recommendations
- [ ] Advanced access control rules
- [ ] Multi-season permission templates
- [ ] Integration with external systems

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration failure | Low | High | Tested migrations, database backup, rollback plan |
| Performance issues | Medium | Medium | Load testing completed, monitoring in place |
| User confusion | Medium | Low | Training provided, documentation available |
| Permission errors | Low | High | Extensive testing, validation in place |
| Data loss | Very Low | Critical | Database backups, tested rollback |

---

## Deployment Team

| Role | Name | Responsibilities |
|------|------|------------------|
| Deployment Lead | TBD | Overall coordination |
| Backend Engineer | TBD | Code deployment, migration |
| DevOps Engineer | TBD | Infrastructure, monitoring |
| QA Engineer | TBD | Post-deployment testing |
| Product Manager | TBD | User communication |
| Support Lead | TBD | User assistance |

---

## Approval Signatures

- [ ] **Product Manager:** __________________ Date: ______
- [ ] **Engineering Lead:** _________________ Date: ______
- [ ] **QA Lead:** _________________________ Date: ______
- [ ] **DevOps Lead:** _____________________ Date: ______

---

## Deployment Log

### Staging Deployment
- **Date:** __________
- **Version:** v2.12.0-staging
- **Result:** Success / Issues
- **Notes:** _________________________________

### Production Deployment
- **Date:** __________
- **Version:** v2.12.0
- **Downtime:** _____ minutes
- **Result:** Success / Rollback
- **Notes:** _________________________________

---

## Lessons Learned

*To be completed after deployment*

### What Went Well
-

### What Could Be Improved
-

### Action Items for Next Deployment
-

---

## References

- Requirements: [01-requirements.md](./01-requirements.md)
- Design: [02-design.md](./02-design.md)
- Implementation: [03-implementation.md](./03-implementation.md)
- Testing: [04-testing.md](./04-testing.md)
- Project Documentation: [CLAUDE.md](../../../CLAUDE.md)
