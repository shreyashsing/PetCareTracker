#!/bin/bash
# Script to update all useTheme imports to useAppColors

# Find all files with useTheme imports
echo "Finding files with useTheme imports..."
FILES=$(grep -l "useTheme.*from.*hooks/useTheme" --include="*.tsx" --include="*.ts" -r PetCareTrackerMobile/src)

# Count files found
COUNT=$(echo "$FILES" | wc -l)
echo "Found $COUNT files to update"

# Update each file
for file in $FILES; do
  echo "Updating $file..."
  # Replace the import statement
  sed -i 's/import { useTheme } from .*hooks\/useTheme.*/import { useAppColors } from "..\/hooks\/useAppColors";/g' "$file"
  # Replace the hook usage
  sed -i 's/const { colors } = useTheme()/const { colors } = useAppColors()/g' "$file"
  sed -i 's/const { colors, isDark } = useTheme()/const { colors, isDark } = useAppColors()/g' "$file"
  sed -i 's/const { theme, setTheme, colors, isDark } = useTheme()/const { colors, isDark } = useAppColors()/g' "$file"
done

echo "Update complete! You may need to manually adjust some files."
echo "Tip: Look for any remaining theme selection functionality that should be removed." 