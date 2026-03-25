from dotenv import load_dotenv
from supabase import create_client
import os
load_dotenv()
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
res = sb.table('books').select('*').limit(1).execute()
print(list(res.data[0].keys()))