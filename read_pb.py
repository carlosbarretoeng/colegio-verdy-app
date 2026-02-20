import sys
import re

try:
    with open('/home/carlos/.gemini/antigravity/conversations/ebdea6da-ced0-4975-b1e6-25b90c142e35.pb', 'rb') as f:
        content = f.read().decode('utf-8', errors='ignore')
        # Extract readable strings
        strings = re.findall(r'[A-Za-z0-9_ \-\.\,\:\;\{\}\[\]\(\)\@\#\%\^\&\*\+\=\!\?]{20,}', content)
        for s in strings:
            if 'USER_REQUEST' in s or 'brainstorm' in s or 'SaaS' in s or 'MVP' in s or 'colegio' in s:
                print(s)
        
        print("\n\n--- DUMPING CONVERSATION TRACE ---\n\n")
        # Print a chunk of the most recent readable text as it's typically at the end
        print(content[-5000:])
except Exception as e:
    print(f"Error: {e}")
