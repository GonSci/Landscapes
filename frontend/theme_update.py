import re

with open('src/components/landingPage/Home.css', 'r') as f:
    content = f.read()

replacements = {
    'background: #ffffff;': 'background: #0f0a1a;',
    'background: white;': 'background: #1e1233;',
    'color: #1f2937;': 'color: #f3f4f6;',
    'color: #6b7280;': 'color: #a78bfa;',
    'color: #4b5563;': 'color: #c4b5fd;',
    'background: #f9fafb;': 'background: #140d26;',
    'background: #f3f4f6;': 'background: #2d1b4e;',
    'border-color: #e5e7eb;': 'border-color: #4c1d95;',
    'border: 2px solid #e5e7eb;': 'border: 2px solid #4c1d95;',
    'border: 2px solid #f3f4f6;': 'border: 2px solid #4c1d95;',
    'border-top: 1px solid #f3f4f6;': 'border-top: 1px solid #4c1d95;',
    'border-top: 1px solid #e5e7eb;': 'border-top: 1px solid #4c1d95;',
    'background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);': 'background: linear-gradient(135deg, #1e1233 0%, #2d1b4e 100%);',
    'background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);': 'background: linear-gradient(180deg, #0f0a1a 0%, #140d26 100%);',
    'background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);': 'background: linear-gradient(180deg, #140d26 0%, #0f0a1a 100%);',
    'background: rgba(255, 255, 255, 0.95);': 'background: rgba(30, 18, 51, 0.95);',
    'color: #333;': 'color: #f3f4f6;',
    'background: linear-gradient(135deg, rgba(245, 243, 255, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%);': 'background: linear-gradient(135deg, rgba(76, 29, 149, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%);',
    'background: #1f2937;': 'background: #0a0614;',
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/components/landingPage/Home.css', 'w') as f:
    f.write(content)

print("Done replacing.")
