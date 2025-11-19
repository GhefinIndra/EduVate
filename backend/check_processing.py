import mysql.connector
import os
from datetime import datetime

db = mysql.connector.connect(
    host="103.38.109.27",
    port=3306,
    user="test",
    password="testing",
    database="eduvate_db"
)

cursor = db.cursor(dictionary=True)

cursor.execute("""
    SELECT id, title, pages, status, created_at, updated_at 
    FROM documents 
    WHERE status='processing' 
    ORDER BY created_at DESC
""")

docs = cursor.fetchall()

print(f"\n{'='*80}")
print(f"DOCUMENTS STUCK IN PROCESSING: {len(docs)}")
print(f"{'='*80}\n")

for doc in docs:
    created = doc['created_at']
    updated = doc['updated_at']
    now = datetime.now()
    
    duration = (now - created).total_seconds() / 60
    
    print(f"ID: {doc['id']}")
    print(f"Title: {doc['title']}")
    print(f"Pages: {doc['pages']}")
    print(f"Created: {created}")
    print(f"Duration: {duration:.1f} minutes")
    print(f"{'='*80}\n")

cursor.close()
db.close()
