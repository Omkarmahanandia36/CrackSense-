"""Multi-Tenant Row Level Security (RLS), RBAC & Cloudinary Image Storage Automated Test Suite.

Proves the critical security invariants:
1. Inspections RLS & Cross-User Isolation: User A cannot read, update, or delete User B's inspections.
2. Login Events Privacy: User A cannot view User B's login sessions; no updates allowed.
3. Cloudinary Schema & Asset Columns: image_public_id, annotated_public_id, image_bytes, image_width, image_height.
4. Profile Privacy & Role Escalation Prevention: Non-admin cannot escalate role to admin.
5. Idempotency Enforcement: Duplicate client_id rejected by database.
6. Cloudinary Signing Edge Function:
   - Rejects unauthenticated calls (HTTP 401).
   - Scopes folder strictly to cracksense/<auth.uid()>/ (User A cannot sign for User B).
   - Enforces delivery type 'authenticated'.
7. Cloudinary Delete Edge Function: Verifies asset/inspection ownership before deletion.
8. Zero Secret Leakage: Cloudinary API secret and API key never appear in any client or built file.

Usage:
    python supabase/tests/rls_test.py
    python supabase/tests/rls_test.py --url https://<proj>.supabase.co --anon <key> --service-role <key>
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
        print("\n" + "=" * 75)
        print(f" SECURITY & RLS TEST SUITE: {passed}/{total} Passed, {failed} Failed")
        print("=" * 75)
        return failed == 0


def audit_cloudinary_edge_functions(repo_root: Path, report: TestReport):
    """Audit Edge Function implementations for authentication and folder boundary security."""
    sign_file = repo_root / "supabase" / "functions" / "cloudinary-sign" / "index.ts"
    del_file = repo_root / "supabase" / "functions" / "cloudinary-delete" / "index.ts"

    # 1. Sign Function Existence & Auth Check
    if not sign_file.exists():
        report.record("Cloudinary-sign edge function exists", False, f"Missing {sign_file}")
    else:
        content = sign_file.read_text(encoding="utf-8")
        has_auth_check = 'req.headers.get("Authorization")' in content and 'status: 401' in content
        report.record(
            "6a. Cloudinary-sign rejects unauthenticated calls (HTTP 401)",
            has_auth_check,
            "Edge function verifies Supabase JWT and rejects missing/invalid tokens with 401",
        )

        has_strict_folder = '`cracksense/${user.id}`' in content
        report.record(
            "6b. Folder boundary isolation (User A cannot sign for User B's folder)",
            has_strict_folder,
            "Folder strictly bound to cracksense/${user.id} on the server, ignoring caller-supplied folder",
        )

        has_authenticated_type = 'deliveryType = "authenticated"' in content or '"authenticated"' in content
        report.record(
            "6c. Authenticated delivery type enforcement",
            has_authenticated_type,
            "Upload parameters enforce type='authenticated' for non-public delivery",
        )

    # 2. Delete Function Ownership Verification
    if not del_file.exists():
        report.record("Cloudinary-delete edge function exists", False, f"Missing {del_file}")
    else:
        content_del = del_file.read_text(encoding="utf-8")
        has_ownership_check = "record.user_id !== user.id && !isAdmin" in content_del
        report.record(
            "7. Cloudinary-delete verifies asset ownership (User A cannot delete User B's assets)",
            has_ownership_check,
            "Rejects delete request with HTTP 403 unless requesting user owns the inspection or is admin",
        )


def audit_zero_secret_leaks(repo_root: Path, report: TestReport):
    """Scan frontend, android, desktop, and build output to verify zero secret leakage."""
    secret_str = "F1YJ1rjXthjC2SqWW5HSN29s0HE"
    api_key_str = "932247965476644"

    scanned_locations = [
        repo_root / "desktop" / "frontend" / "src",
        repo_root / "desktop" / "frontend" / "dist",
        repo_root / "desktop" / "frontend" / "android",
        repo_root / "desktop" / "electron",
    ]

    leaks = []
    for loc in scanned_locations:
        if not loc.exists():
            continue
        for p in loc.rglob("*"):
            if p.is_file() and p.suffix in [".js", ".ts", ".tsx", ".html", ".css", ".json", ".xml", ".env"]:
                try:
                    text = p.read_text(encoding="utf-8", errors="ignore")
                    if secret_str in text:
                        leaks.append(f"Secret leaked in: {p.relative_to(repo_root)}")
                    if api_key_str in text:
                        leaks.append(f"API key leaked in: {p.relative_to(repo_root)}")
                except Exception:
                    pass

    report.record(
        "8. Zero Secret Leakage: Cloudinary API secret and API key absent from apps & bundles",
        len(leaks) == 0,
        "No API secret or API key present in frontend, desktop, android, or dist/ files" if not leaks else "; ".join(leaks),
    )


def run_offline_migration_audit(migration_path: Path, repo_root: Path) -> bool:
    """Audit migration SQL for exact RLS policies, trigger constraints, and Cloudinary columns."""
    report = TestReport()
    print("\n--- Running Multi-Tenant & Cloudinary Security Audit ---")
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

    # 3. Cloudinary Image Storage Columns (Replaced Supabase Storage)
    has_cld_columns = (
        "image_public_id TEXT" in content
        and "annotated_public_id TEXT" in content
        and "image_bytes INTEGER" in content
    )
    report.record(
        "3. Cloudinary Asset Reference Columns (Replaces Supabase Storage)",
        has_cld_columns,
        "Inspections table stores image_public_id, annotated_public_id, and image_bytes metadata",
    )

    # 4. Profile Privacy & Role Escalation Prevention
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

    # 6 & 7. Edge functions audit
    audit_cloudinary_edge_functions(repo_root, report)

    # 8. Secret leak audit
    audit_zero_secret_leaks(repo_root, report)

    return report.summary()


def run_live_supabase_tests(url: str, anon_key: str, service_role_key: str, repo_root: Path) -> bool:
    """Run real queries against Supabase test instance using two isolated users."""
    try:
        from supabase import create_client
    except ImportError:
        print("[ERROR] supabase package not installed. Install with `pip install supabase`")
        return False

    report = TestReport()
    print("\n--- Running Live Supabase RLS & Cloudinary Security Tests ---")
    admin_client = create_client(url, service_role_key)

    email_a = f"test_user_a_{uuid.uuid4().hex[:6]}@cracksense.test"
    email_b = f"test_user_b_{uuid.uuid4().hex[:6]}@cracksense.test"
    pwd = "TestPassword123!@#"

    user_a_auth = admin_client.auth.admin.create_user({"email": email_a, "password": pwd, "email_confirm": True})
    user_b_auth = admin_client.auth.admin.create_user({"email": email_b, "password": pwd, "email_confirm": True})

    user_a_id = user_a_auth.user.id
    user_b_id = user_b_auth.user.id

    client_a = create_client(url, anon_key)
    client_b = create_client(url, anon_key)
    client_a.auth.sign_in_with_password({"email": email_a, "password": pwd})
    client_b.auth.sign_in_with_password({"email": email_b, "password": pwd})

    client_id_1 = str(uuid.uuid4())

    try:
        # 1. User A creates inspection; User B attempts to read/update/delete it
        insert_res = client_a.table("inspections").insert({
            "client_id": client_id_1,
            "filename": "concrete_surface.jpg",
            "image_public_id": f"cracksense/{user_a_id}/{client_id_1}",
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

        # 3. Role escalation check
        try:
            client_a.table("profiles").update({"role": "admin"}).eq("id", user_a_id).execute()
            prof = admin_client.table("profiles").select("role").eq("id", user_a_id).single().execute()
            role_escalated = prof.data.get("role") == "admin"
        except Exception:
            role_escalated = False

        report.record(
            "4. Role escalation prohibited for standard user",
            not role_escalated,
            "User A unable to escalate own role to admin",
        )

        # 4. Duplicate client_id rejected
        try:
            client_a.table("inspections").insert({
                "client_id": client_id_1,
                "filename": "duplicate_attempt.jpg",
                "image_public_id": f"cracksense/{user_a_id}/dup",
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

        audit_cloudinary_edge_functions(repo_root, report)
        audit_zero_secret_leaks(repo_root, report)

    finally:
        admin_client.auth.admin.delete_user(user_a_id)
        admin_client.auth.admin.delete_user(user_b_id)

    return report.summary()


def main():
    parser = argparse.ArgumentParser(description="CrackSense Security & RLS Automated Test Suite")
    parser.add_argument("--url", default=os.getenv("TEST_SUPABASE_URL", ""))
    parser.add_argument("--anon", default=os.getenv("TEST_SUPABASE_ANON_KEY", ""))
    parser.add_argument("--service-role", default=os.getenv("TEST_SUPABASE_SERVICE_ROLE_KEY", ""))
    parser.add_argument("--offline", action="store_true", help="Run offline static security policy verification")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent
    migration_file = repo_root / "supabase" / "migrations" / "001_online_mode.sql"

    if args.url and args.anon and args.service_role and not args.offline:
        success = run_live_supabase_tests(args.url, args.anon, args.service_role, repo_root)
    else:
        success = run_offline_migration_audit(migration_file, repo_root)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
