from supabase import create_client
from pathlib import Path

env_file = Path("D:/CrackSense/.env")
url, key = "", ""
with open(env_file, "r") as f:
    for line in f:
        line = line.strip()
        if line.startswith("SUPABASE_URL="):
            url = line.split("=", 1)[1].strip("\"'")
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            key = line.split("=", 1)[1].strip("\"'")

sb = create_client(url, key)
res = sb.table("app_versions").select("*").order("published_at", desc=True).limit(10).execute()
for r in res.data:
    print(f"Platform: {r.get('platform')} | Ver: {r.get('latest_version')} | URL: {r.get('apk_url')}")
