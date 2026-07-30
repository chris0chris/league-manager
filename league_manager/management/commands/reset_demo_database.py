from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.conf import settings
import os
import subprocess
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create snapshot or reset demo database from snapshot'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-snapshot',
            action='store_true',
            help='Create a snapshot of the current database'
        )
        parser.add_argument(
            '--restore-snapshot',
            action='store_true',
            help='Restore database from existing snapshot'
        )
        parser.add_argument(
            '--snapshot-path',
            type=str,
            default=None,
            help='Path to snapshot file (default: from settings or /app/snapshots/demo_snapshot.sql)'
        )

    def handle(self, *args, **options):
        """Main command handler."""
        create = options.get('create_snapshot')
        restore = options.get('restore_snapshot')
        snapshot_path = options.get('snapshot_path')

        if not create and not restore:
            raise CommandError('Specify either --create-snapshot or --restore-snapshot')

        if create and restore:
            raise CommandError('Cannot use --create-snapshot and --restore-snapshot together')

        snapshot_path = self._get_snapshot_path(snapshot_path)

        try:
            if create:
                self.create_snapshot(snapshot_path)
            elif restore:
                self.restore_snapshot(snapshot_path)
        except (FileNotFoundError, subprocess.CalledProcessError, CommandError) as e:
            logger.error(f"Demo database operation failed: {e}")
            raise CommandError(f"Failed to reset demo database: {e}")

    def _get_snapshot_path(self, provided_path):
        """Determine snapshot path from provided argument, settings, or default."""
        if provided_path:
            return provided_path

        # Try settings first
        if hasattr(settings, 'DEMO_SNAPSHOT_PATH'):
            return settings.DEMO_SNAPSHOT_PATH

        # Default path
        return '/app/snapshots/demo_snapshot.sql'

    def create_snapshot(self, snapshot_path):
        """Create database snapshot using mysqldump or Django export."""
        self.stdout.write(f"Creating demo database snapshot...")

        try:
            # Try to use mysqldump first (preferred for MySQL)
            self._create_snapshot_with_mysqldump(snapshot_path)
            actual_path = snapshot_path
        except (FileNotFoundError, subprocess.CalledProcessError):
            # Fallback to Django-based export
            self.stdout.write("mysqldump not available, using Django-based export...")
            actual_path = self._create_snapshot_with_django(snapshot_path)

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Demo snapshot created at {actual_path}"
            )
        )
        logger.info(f"Demo snapshot created: {actual_path}")

    def _create_snapshot_with_mysqldump(self, snapshot_path):
        """Create snapshot using mysqldump command."""
        # Ensure snapshot directory exists
        os.makedirs(os.path.dirname(snapshot_path) or '.', exist_ok=True)

        db_settings = settings.DATABASES.get('default', {})
        if db_settings.get('ENGINE') != 'django.db.backends.mysql':
            raise FileNotFoundError("mysqldump requires MySQL backend")

        # Build mysqldump command (password passed via environment for security)
        cmd = [
            'mysqldump',
            f"-h{db_settings.get('HOST', 'localhost')}",
            f"-u{db_settings.get('USER')}",
            '-p',
            '--single-transaction',
            '--quick',
            '--lock-tables=false',
            db_settings.get('NAME'),
        ]

        # Pass password via environment variable to avoid CLI exposure
        env = os.environ.copy()
        env['MYSQL_PWD'] = db_settings.get('PASSWORD', '')

        # Write to temp file first, only move to final path if successful
        temp_path = snapshot_path + '.tmp'
        try:
            with open(temp_path, 'w') as f:
                subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, check=True, env=env)
            # Only move to final path if successful
            os.replace(temp_path, snapshot_path)
        finally:
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def _create_snapshot_with_django(self, snapshot_path):
        """Fallback: Create snapshot using Django's serializers for models."""
        from django.apps import apps
        from django.core import serializers
        from io import StringIO

        # Change extension to .json for dumpdata-based snapshots
        if snapshot_path.endswith('.sql'):
            snapshot_path = snapshot_path[:-4] + '.json'

        os.makedirs(os.path.dirname(snapshot_path) or '.', exist_ok=True)

        # Collect all model instances from apps that should be backed up
        included_apps = {'auth', 'gamedays', 'league_manager', 'gameday_designer',
                        'league_table', 'officials', 'knox', 'sites'}
        excluded_models = {'admin.logentry', 'sessions.session', 'contenttypes.contenttype',
                          'auth.permission', 'auth.group'}

        objects_to_dump = []
        for model in apps.get_models():
            app_label = model._meta.app_label
            model_name = f"{app_label}.{model._meta.model_name}"

            # Include only specified apps and exclude certain models
            if app_label in included_apps and model_name not in excluded_models:
                try:
                    objects_to_dump.extend(list(model.objects.all()))
                except Exception as e:
                    logger.warning(f"Failed to get objects from {model_name}: {e}")

        # Serialize objects to JSON
        out = StringIO()
        try:
            serializers.serialize('json', objects_to_dump, stream=out)
            content = out.getvalue().strip()
        except Exception as e:
            logger.warning(f"Serialization failed: {e}")
            content = ''

        # Handle empty database - write empty JSON array instead of empty string
        if not content:
            content = '[]'

        with open(snapshot_path, 'w') as f:
            f.write(content)

        return snapshot_path

    def restore_snapshot(self, snapshot_path):
        """Restore database from snapshot."""
        self.stdout.write("Restoring demo database from snapshot...")

        if not os.path.exists(snapshot_path):
            raise CommandError(f"Snapshot file not found: {snapshot_path}")

        # Determine if snapshot is JSON (Django dumpdata) or SQL (mysqldump)
        is_json = snapshot_path.endswith('.json') or self._is_json_snapshot(snapshot_path)

        if is_json:
            self._restore_snapshot_json(snapshot_path)
        else:
            self._restore_snapshot_sql(snapshot_path)

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Demo database restored from {snapshot_path}"
            )
        )
        logger.info(f"Demo database restored from: {snapshot_path}")

    def _is_json_snapshot(self, snapshot_path):
        """Check if snapshot file starts with JSON marker."""
        try:
            with open(snapshot_path, 'r') as f:
                first_char = f.read(1)
                return first_char in '[]{'
        except Exception:
            return False

    def _restore_snapshot_sql(self, snapshot_path):
        """Restore from SQL dump file by piping to mysql."""
        db_settings = settings.DATABASES.get('default', {})
        db_name = db_settings.get('NAME')

        # Drop and recreate database
        self._recreate_database(db_name)

        # Use mysql CLI to execute SQL file (safer than manual parsing)
        with open(snapshot_path, 'r') as f:
            env = os.environ.copy()
            env['MYSQL_PWD'] = db_settings.get('PASSWORD', '')

            cmd = [
                'mysql',
                f"-h{db_settings.get('HOST', 'localhost')}",
                f"-u{db_settings.get('USER')}",
                db_name,
            ]

            subprocess.run(cmd, stdin=f, check=True, env=env)

    def _restore_snapshot_json(self, snapshot_path):
        """Restore from Django dumpdata JSON file."""
        from django.core.management import call_command

        # Clear existing data first
        self.stdout.write("Clearing existing data...")
        call_command('flush', '--no-input', verbosity=0)

        # Load from snapshot using Django's loaddata, which handles
        # auth_permission/contenttypes correctly (skips already-existing
        # permission entries instead of duplicating them).
        self.stdout.write("Loading snapshot data...")
        call_command('loaddata', snapshot_path, verbosity=0)

    def _recreate_database(self, db_name):
        """Drop and recreate database."""
        self.stdout.write("Recreating database...")

        with connection.cursor() as cursor:
            # Use backticks to safely escape database name
            cursor.execute(f'DROP DATABASE IF EXISTS `{db_name}`')
            cursor.execute(
                f'CREATE DATABASE `{db_name}` '
                f'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            )

        logger.info(f"Database recreated: {db_name}")
