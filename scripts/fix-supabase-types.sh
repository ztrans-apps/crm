#!/bin/bash
# Script to add type assertions to all supabase calls

# Find all .tsx files and replace 'await supabase' with 'await (supabase as any)'
find app -name "*.tsx" -type f -exec sed -i 's/await supabase\./await (supabase as any)./g' {} \;

echo "Fixed all supabase type assertions"
