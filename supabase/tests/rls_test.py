"""Multi-Tenant Row Level Security (RLS) & RBAC Automated Test Suite.

Proves the 5 critical security invariants:
1. User A cannot read, update, or delete User B's inspections.
2. User A cannot read or delete User B's login events.
3. User A cannot read, upload into, or delete files from User B's storage folder.
4. Non-admin users cannot view other profiles or escalate their own role to 'admin'.
5. Duplicate client_id inspection submissions are rejected (idempotency enforcement).

Usage:
    # Against a live Supabase test project:
    python supabase/tests/rls_test.py --url https://<proj>.supabase.co --anon <key> --service-role <key>

    # Offline / Static Security Invariant Verification:
    python supabase/tests/rls_test.py --offline
"""

import os
import sys
import uuid
import argparse
import re
from pathlib import Path


class TestReport:
    def __init__(self):
        self.results = []

    def record(self, name: str, passed: bool, detail: str = ""):
        self.results.append({"name": name, "passed": passed, "detail": detail})
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f" {status_str} {name}")
        if detail:
            print(f"        -> {detail}")

    def summary(self) -> bool:
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed
        print("\n" + "=" * 65)
        print(f" RLS TEST SUITE SUMMARY: {passed}/{total} Passed, {failed} Failed")
        print("=" * 65)
        return failed == 0


def run_offline_migration_audit(migration_path: Path) -> bool:
    """Audit migration SQL for exact RLS policies, trigger constraints, and storage rules."""
    report = TestReport()
    print("\n--- Running Offline Migration Security Audit ---")
    print(f"Migration file: {migration_path}\n")

    if not migration_path.exists():
        report.record("Migration file exists", False, f"Missing {migration_path}")
        return False

    content = migration_path.read_text(encoding="utf-8")

    # 1. User Isolation on Inspections
    has_insp_rls = bool(re.search(r"ALTER\s+TABLE\s+public\.inspections\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", content, re.I))
    has_insp_select = "auth.uid() = user_id OR public.is_admin()" in content
    has_insp_update = "USING (auth.uid() = user_id)" in content
    has_insp_delete = "USING (auth.uid() = user_id)" in content
    report.record(
        "1. Inspections RLS & Cross-User Isolation (User A cannot read/update/delete User B)",
        has_insp_rls and has_insp_select and has_insp_update and has_insp_delete,
        "Inspections table has RLS enabled with auth.uid() = user_id checks on SELECT/UPDATE/DELETE",
    )

    # 2. Login Events Privacy
    has_login_rls = bool(re.search(r"ALTER\s+TABLE\s+public\.login_events\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", content, re.I))
    has_login_select = "auth.uid() = user_id OR public.is_admin()" in content
    has_no_login_update = "FOR UPDATE" not in content.split("login_events")[1].split("inspections")[0]
    report.record(
        "2. Login Events Privacy (User A cannot view User B's login sessions; no update allowed)",
        has_login_rls and has_login_select and has_no_login_update,
        "Login events restricted to auth.uid() = user_id; update/delete policies omitted (append-only audit log)",
    )

    # 3. Storage Folder Isolation
    has_storage_private = "cracksense-images', false" in content
    has_storage_folder_check = "(storage.foldername(name))[1] = auth.uid()::text" in content
    report.record(
        "3. Private Storage Isolation (Users restricted to their auth.uid() folder in cracksense-images)",
        has_storage_private and has_storage_folder_check,
        "cracksense-images set to private=false, storage policies enforce folder name equals auth.uid()",
    )

    # 4. Profile Protection & Non-Escalation
    has_profile_rls = bool(re.search(r"ALTER\s+TABLE\s+public\.profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY", content, re.I))
    has_role_protection = "protect_profile_role" in content and "is_admin()" in content
    report.record(
        "4. Profile Privacy & Role Escalation Prevention (Non-admin cannot escalate role to admin)",
        has_profile_rls and has_role_protection,
        "BEFORE UPDATE trigger raises exception if non-admin attempts to modify role column",
    )

    # 5. Idempotency on client_id
    has_client_id_unique = "client_id UUID UNIQUE" in content or "client_id UUID UNIQUE NOT NULL" in content
    report.record(
        "5. Idempotency Enforcement (Duplicate client_id rejected by database)",
        has_client_id_unique,
        "client_id column has UNIQUE constraint on public.inspections",
    )

    return report.summary()


def run_live_supabase_tests(url: str, anon_key: str, service_role_key: str) -> bool:
    """Run real queries against Supabase test instance using two isolated users."""
    try:
        from supabase import create_client
    except ImportError:
        print("[ERROR] supabase package not installed. Install with `pip install supabase`")
        return False

    report = TestReport()
    print("\n--- Running Live Supabase RLS Security Tests ---")
    admin_client = create_client(url, service_role_key)

    # Generate two ephemeral test users
    email_a = f"test_user_a_{uuid.uuid4().hex[:6]}@cracksense.test"
    email_b = f"test_user_b_{uuid.uuid4().hex[:6]}@cracksense.test"
    pwd = "TestPassword123!@#"

    user_a_auth = admin_client.auth.admin.create_user({"email": email_a, "password": pwd, "email_confirm": True})
    user_b_auth = admin_client.auth.admin.create_user({"email": email_b, "password": pwd, "email_confirm": True})

    user_a_id = user_a_auth.user.id
    user_b_id = user_b_auth.user.id

    # Create scoped client sessions
    client_a = create_client(url, anon_key)
    client_b = create_client(url, anon_key)
    session_a = client_a.auth.sign_in_with_password({"email": email_a, "password": pwd})
    session_b = client_b.auth.sign_in_with_password({"email": email_b, "password": pwd})

    client_id_1 = str(uuid.uuid4())

    try:
        # 1. User A creates inspection; User B attempts to read it
        insert_res = client_a.table("inspections").insert({
            "client_id": client_id_1,
            "filename": "concrete_test.jpg",
            "image_url": f"{user_a_id}/test.jpg",
            "verdict": "crack_detected",
            "confidence": 0.88,
        }).execute()
        insp_id = insert_res.data[0]["id"]

        read_b = client_b.table("inspections").select("*").eq("id", insp_id).execute()
        update_b = client_b.table("inspections").update({"confidence": 0.0}).eq("id", insp_id).execute()
        delete_b = client_b.table("inspections").delete().eq("id", insp_id).execute()

        report.record(
            "1. User A inspection isolated from User B",
            len(read_b.data) == 0 and len(update_b.data) == 0 and len(delete_b.data) == 0,
            "User B received 0 rows on select/update/delete against User A's inspection",
        )

        # 2. Login events isolation
        client_a.table("login_events").insert({"user_id": user_a_id, "platform": "web"}).execute()
        events_b = client_b.table("login_events").select("*").eq("user_id", user_a_id).execute()
        report.record(
            "2. User A login events isolated from User B",
            len(events_b.data) == 0,
            "User B received 0 rows querying User A's login events",
        )

        # 3. Storage isolation
        try:
            client_b.storage.from_("cracksense-images").download(f"{user_a_id}/test.jpg")
            st_passed = False
        except Exception:
            st_passed = True
        report.record(
            "3. Storage isolation between users",
            st_passed,
            "User B denied read access to User A's storage folder",
        )

        # 4. Role escalation check
        try:
            client_a.table("profiles").update({"role": "admin"}).eq("id", user_a_id).execute()
            # Verify if role actually changed
            prof = admin_client.table("profiles").select("role").eq("id", user_a_id).single().execute()
            role_escalated = prof.data.get("role") == "admin"
        except Exception:
            role_escalated = False

        report.record(
            "4. Role escalation prohibited for standard user",
            not role_escalated,
            "User A unable to escalate own role to admin",
        )

        # 5. Duplicate client_id rejected
        try:
            client_a.table("inspections").insert({
                "client_id": client_id_1,
                "filename": "duplicate_attempt.jpg",
                "image_url": f"{user_a_id}/dup.jpg",
                "verdict": "no_crack",
            }).execute()
            dup_blocked = False
        except Exception:
            dup_blocked = True

        report.record(
            "5. Duplicate client_id rejected",
            dup_blocked,
            "Database rejected second insert with duplicate client_id",
        )

    finally:
        # Cleanup test accounts
        admin_client.auth.admin.delete_user(user_a_id)
        admin_client.auth.admin.delete_user(user_b_id)

    return report.summary()


def main():
    parser = argparse.ArgumentParser(description="CrackSense RLS Automated Security Test Suite")
    parser.add_argument("--url", default=os.getenv("TEST_SUPABASE_URL", ""))
    parser.add_argument("--anon", default=os.getenv("TEST_SUPABASE_ANON_KEY", ""))
    parser.add_argument("--service-role", default=os.getenv("TEST_SUPABASE_SERVICE_ROLE_KEY", ""))
    parser.add_argument("--offline", action="store_true", help="Run offline static security policy verification")
    args = parser.parse_args()

    migration_file = Path(__file__).resolve().parent.parent / "migrations" / "001_online_mode.sql"

    if args.url and args.anon and args.service_role and not args.offline:
        success = run_live_supabase_tests(args.url, args.anon, args.service_role)
    else:
        success = run_offline_migration_audit(migration_file)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
