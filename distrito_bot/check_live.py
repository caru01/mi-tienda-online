import urllib.request
import re

try:
    html = urllib.request.urlopen('https://distrito.onrender.com').read().decode('utf-8')
    m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
    if m:
        js_url = 'https://distrito.onrender.com' + m.group(1)
        js = urllib.request.urlopen(js_url).read().decode('utf-8')
        print("Contains '/distrito/api/dashboard':", '/distrito/api/dashboard' in js)
        print("Contains '/api/dashboard':", '/api/dashboard' in js)
    else:
        print("JS bundle not found in HTML.")
except Exception as e:
    print("Error:", e)
