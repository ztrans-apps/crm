# WhatsApp Template Creation Wizard - User Guide

## Overview

Template Creation Wizard mengikuti standar 6-step dari Meta untuk membuat WhatsApp Business message templates. Wizard ini memastikan template Anda sesuai dengan guidelines WhatsApp dan siap untuk di-submit untuk approval.

## Accessing the Wizard

1. Navigate to **Broadcasts** → **Template** tab
2. Click **"Buat Template"** button
3. The 6-step wizard will open

## Step-by-Step Guide

### Step 1: Basic Information

**Purpose**: Set up template identity and basic configuration

**Fields**:
- **Template Name** (Required)
  - Use lowercase letters, numbers, and underscores only
  - Spaces will be automatically converted to underscores
  - Example: `order_confirmation`, `promo_flash_sale`
  - ⚠️ Cannot be changed after submission

- **Language** (Required)
  - Select the language for your template
  - Options: Indonesian, English, English (US), English (UK)

- **Category** (Required)
  - **MARKETING**: Promotional messages, offers, announcements
  - **UTILITY**: Account updates, order status, reminders
  - **AUTHENTICATION**: OTP, verification codes, security alerts

**Tips**:
- Choose descriptive names that clearly indicate the template's purpose
- Select the correct category as it affects approval process

---

### Step 2: Header Configuration

**Purpose**: Add optional header to make message more engaging

**Header Format Options**:

1. **None**: No header (text-only message)

2. **Text**: Text header
   - Maximum 60 characters
   - Example: "Special Offer Just for You!"

3. **Image**: Image header
   - Formats: jpg, jpeg, png
   - Maximum size: 5MB
   - Should be clear and relevant to message

4. **Video**: Video header
   - Maximum size: 16MB
   - Maximum duration: 30 seconds

5. **Document**: Document header
   - Format: PDF only

**Tips**:
- Headers are optional but increase engagement
- Use high-quality, relevant media
- Text headers are fastest to load

---

### Step 3: Message Body

**Purpose**: Create the main message content

**Fields**:

- **Body** (Required)
  - Maximum 1024 characters
  - Use clear, concise language
  - Add variables using `{{1}}`, `{{2}}`, `{{3}}` syntax
  - Example: "Hello {{1}}, your order {{2}} is ready!"

- **Footer Text** (Optional)
  - Maximum 60 characters
  - Commonly used for disclaimers or opt-out info
  - Example: "Reply STOP to unsubscribe"

**Variable Syntax**:
- `{{1}}` = First variable (e.g., customer name)
- `{{2}}` = Second variable (e.g., order number)
- `{{3}}` = Third variable (e.g., date)

**Tips**:
- Keep messages concise and actionable
- Use variables for personalization
- Footer is great for legal disclaimers

---

### Step 4: Buttons & Actions

**Purpose**: Add interactive buttons for user engagement

**Button Type Options**:

1. **None**: No buttons (text-only message)

2. **Call to Action** (Maximum 2 buttons)
   - **Call Phone**: Direct call button
     - Button text: Max 20 characters
     - Phone number: Include country code (e.g., +6281234567890)
     - Example: "Call Support"
   
   - **Visit Website**: URL button
     - Button text: Max 20 characters
     - Website URL: Must include https://
     - Example: "Shop Now" → https://example.com

3. **Quick Reply** (Maximum 3 buttons)
   - Simple response buttons
   - Button text: Max 20 characters each
   - Example: "Yes", "No", "Maybe"
   - Used for quick user responses

**Tips**:
- Use clear, action-oriented button text
- Verify phone numbers and URLs are correct
- Quick replies are great for surveys or confirmations

---

### Step 5: Variables & Examples

**Purpose**: Define variable values and provide examples for template approval

**How it Works**:
- Wizard automatically detects variables from your message body
- You must provide example values for each variable
- Examples help WhatsApp understand your template usage

**Example**:
If your message is: "Hello {{1}}, your order {{2}} is ready!"

You need to provide:
- Variable {{1}} example: "John Doe"
- Variable {{2}} example: "ORD-12345"

**Tips**:
- Use realistic examples that represent actual usage
- Examples are used for template review and approval
- If no variables detected, this step is skipped

---

### Step 6: Review & Submit

**Purpose**: Final review before template submission

**What to Review**:
- ✅ Template Details: Name, language, category
- ✅ Template Content: Header, body, footer, buttons
- ✅ Variables: All have appropriate examples
- ✅ Preview: Check WhatsApp-style preview

**Before You Submit**:
- Review carefully - templates cannot be edited after submission
- Ensure compliance with WhatsApp's guidelines
- Check that all information is accurate

**After Submission**:
- Template status will show as "DRAFT"
- In production, templates would be submitted to WhatsApp for approval
- Approval typically takes 1-2 days
- You'll be notified of approval status

**WhatsApp Preview**:
- Shows exactly how your message will appear on mobile
- Includes header, body, footer, and buttons
- Mobile phone POV (customer receiving message)

---

## Best Practices

### Template Naming
- ✅ `order_confirmation`
- ✅ `promo_flash_sale_2024`
- ✅ `otp_verification`
- ❌ `Template 1`
- ❌ `test template`

### Message Body
- Keep it concise and clear
- Use proper grammar and spelling
- Avoid excessive punctuation (!!!)
- Don't use all caps
- Include clear call-to-action

### Variables
- Use for personalization (names, order numbers, dates)
- Don't overuse - max 3-4 variables per template
- Provide realistic examples
- Ensure examples match variable purpose

### Buttons
- Use clear, action-oriented text
- Verify all URLs and phone numbers
- Don't use buttons for spam or misleading content
- Quick replies should be short and clear

### Categories
- **MARKETING**: Use for promotional content only
  - Requires opt-in from customers
  - Subject to stricter approval
  
- **UTILITY**: For transactional updates
  - Order confirmations, shipping updates
  - Account notifications
  
- **AUTHENTICATION**: For security only
  - OTP codes, login verification
  - Password resets

---

## Common Issues

### Template Name Already Exists
- Template names must be unique within your account
- Try adding a version number or date
- Example: `promo_flash_sale_v2`

### File Upload Failed
- Check file size limits (5MB for images, 16MB for videos)
- Ensure correct file format
- Try compressing large files

### Cannot Proceed to Next Step
- Check that all required fields are filled
- Verify character limits are not exceeded
- Ensure proper format for phone numbers and URLs

### Variables Not Detected
- Use exact syntax: `{{1}}`, `{{2}}`, `{{3}}`
- No spaces inside brackets
- Numbers must be sequential (1, 2, 3)

---

## WhatsApp Guidelines Compliance

### Do's ✅
- Use clear, professional language
- Provide value to customers
- Include opt-out instructions for marketing
- Use variables for personalization
- Test templates before mass sending

### Don'ts ❌
- Don't use misleading content
- Don't spam customers
- Don't use templates for illegal activities
- Don't include personal information in examples
- Don't use copyrighted content without permission

---

## Support

For issues or questions:
1. Check this guide first
2. Review WhatsApp Business API documentation
3. Contact your system administrator
4. Check the main README.md for troubleshooting

---

## Related Documentation

- [README.md](../README.md) - Main system documentation
- [Broadcast System Guide](../README.md#broadcast-system) - Complete broadcast features
- [WhatsApp Business API Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
