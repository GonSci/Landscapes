with open('src/components/landingPage/FeaturedDestinations.css', 'r') as f:
    content = f.read()

replacements = {
    'background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);': 'background: transparent;',
    'background: white;': 'background: #1e1233;',
    'color: #1f2937;': 'color: #f3f4f6;',
    'color: #6b7280;': 'color: #a78bfa;',
    'border: 2px solid #e5e7eb;': 'border: 2px solid #4c1d95;',
    'border-top: 2px solid #e5e7eb;': 'border-top: 2px solid #4c1d95;',
    'background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);': 'background: linear-gradient(to bottom, #2d1b4e 0%, #1e1233 100%);',
    'color: #9ca3af;': 'color: #6b7280;' # wait, maybe we leave #9ca3af as is, it's gray for disabled button
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/components/landingPage/FeaturedDestinations.css', 'w') as f:
    f.write(content)

print("Done replacing.")
