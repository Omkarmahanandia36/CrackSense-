from pathlib import Path
from supabase import create_client

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
res = sb.table("inspections").select("*").order("created_at", desc=True).limit(5).execute()
print("Total recent:", len(res.data))
for r in res.data:
    print(f"ID: {r.get('id')} | Created: {r.get('created_at')} | Image: {r.get('image_url')} | Boxes: {len(r.get('boxes') or [])}")
