
import os

def check_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            for i, char in enumerate(content):
                if ord(char) > 127 and char not in ['\u2019', '’', '“', '”']: # Allow some common quotes
                    print(f"Suspicious char in {filepath} at index {i}: {repr(char)} (Code: {ord(char)})")
                    # Find line number
                    line_num = content[:i].count('\n') + 1
                    print(f"  Line {line_num}")
                elif ord(char) < 32 and char not in ['\n', '\r', '\t']:
                    print(f"Control char in {filepath} at index {i}: {repr(char)} (Code: {ord(char)})")
                    line_num = content[:i].count('\n') + 1
                    print(f"  Line {line_num}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

check_file('app/layout.tsx')
check_file('app/community/layout.tsx')
check_file('components/ui/checkbox.tsx')
