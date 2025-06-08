#!/bin/bash

# Script to commit and publish the Evolution API phone validation fix

echo "🔧 Preparing to commit and publish WhatsApp validation fix..."

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Add the modified files
echo "📁 Adding modified files to Git..."
git add src/whatsapp/whatsapp.service.ts src/whatsapp/providers/evolution-api.provider.ts fix-evolution-phone-validation.js

# Create a commit
echo "💾 Creating commit..."
git commit -m "Fix: Prevent message content from being used as phone numbers in WhatsApp API"

# Push to the repository
echo "⬆️ Pushing changes to remote repository..."
git push

echo "✅ Changes pushed to Git repository!"
echo ""
echo "📋 Next steps for deployment:"
echo "1. Pull the changes on your production server:"
echo "   git pull origin main"
echo ""
echo "2. Restart your NestJS application:"
echo "   pm2 restart your-app-name"
echo "   or"
echo "   npm run start:prod"
echo ""
echo "3. Monitor the logs for any issues:"
echo "   pm2 logs your-app-name"
echo "   or"
echo "   tail -f logs/app.log"
echo ""
echo "4. Test the fix by sending a message to your WhatsApp API"
echo ""
echo "✨ Fix complete! The validation now prevents message content from being used as phone numbers."
