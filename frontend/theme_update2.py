import re

with open('src/components/landingPage/Home.css', 'r') as f:
    content = f.read()

replacements = {
    'color: #666;': 'color: #9ca3af;',
    'color: #999;': 'color: #9ca3af;',
    'background: #1f2937;': 'background: #0a0614;',
    'color: #1f2937;': 'color: #f3f4f6;',
    'color: #333;': 'color: #f3f4f6;',
    'background: transparent;': 'background: transparent;', # dummy
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/components/landingPage/Home.css', 'w') as f:
    f.write(content)

print("Done replacing.")
