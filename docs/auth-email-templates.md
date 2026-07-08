# Branded Supabase auth emails

Paste these into **Supabase Dashboard → Authentication → Emails → Templates**. Each template has a "Subject heading" field and a "Message body (HTML)" field — copy the subject and HTML below into the matching template.

This only affects the two transactional emails Supabase's Auth service sends directly (signup confirmation, password reset). It's separate from the Resend setup used for ticket emails — do this after custom SMTP is turned on (Authentication → Emails → SMTP Settings) so these actually send from `support@buildrailhq.com` instead of Supabase's shared sender.

Both templates use inline CSS and a table-based layout on purpose — email clients (Outlook especially) don't reliably support Tailwind classes, flexbox, or `<style>` blocks, so keep it as-is rather than trying to match the app's exact dark theme. `{{ .ConfirmationURL }}` is Supabase's built-in variable — leave it exactly as written, it gets substituted automatically.

---

## 1. Confirm signup

**Subject heading:**
```
Confirm your SupportOS account
```

**Message body (HTML):**
```html
<div style="background-color:#f4f4f5;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr>
      <td style="padding:40px 40px 32px 40px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="width:44px;height:44px;background-color:#4f46e5;border-radius:12px;text-align:center;vertical-align:middle;">
              <span style="color:#ffffff;font-size:20px;line-height:44px;">✦</span>
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.3;color:#18181b;font-weight:600;">
          Confirm your account
        </h1>
        <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#71717a;">
          Welcome to SupportOS — the calm inbox for customer operations. Confirm your email to finish setting up your workspace.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:10px;background-color:#4f46e5;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                Confirm email
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0 0;font-size:13px;line-height:1.6;color:#a1a1aa;">
          If the button doesn't work, paste this link into your browser:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#4f46e5;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't create a SupportOS account, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</div>
```

---

## 2. Reset password

**Subject heading:**
```
Reset your SupportOS password
```

**Message body (HTML):**
```html
<div style="background-color:#f4f4f5;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr>
      <td style="padding:40px 40px 32px 40px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="width:44px;height:44px;background-color:#4f46e5;border-radius:12px;text-align:center;vertical-align:middle;">
              <span style="color:#ffffff;font-size:20px;line-height:44px;">✦</span>
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.3;color:#18181b;font-weight:600;">
          Reset your password
        </h1>
        <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#71717a;">
          We got a request to reset the password for your SupportOS account. This link is valid for a limited time.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:10px;background-color:#4f46e5;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                Reset password
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0 0;font-size:13px;line-height:1.6;color:#a1a1aa;">
          If the button doesn't work, paste this link into your browser:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#4f46e5;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't request a password reset, you can safely ignore this email — your password won't change.
        </p>
      </td>
    </tr>
  </table>
</div>
```

---

## Notes

- The `✦` glyph stands in for the app's Sparkles icon since email HTML can't use an icon font/SVG component reliably — swap the `<td>` containing it for an `<img>` tag pointing at a hosted logo PNG (e.g. `https://support-os-five.vercel.app/favicon.ico` or a dedicated logo asset) if you want the real mark instead of a text glyph.
- Button color `#4f46e5` is a plain-hex stand-in for the app's indigo primary (the app uses OKLCH, which isn't reliably supported across email clients) — close enough to read as on-brand; adjust if you want an exact match.
- Supabase's password reset flow in this app redirects through `/auth/callback?next=/reset-password` (see `src/app/login/actions.ts`), so `{{ .ConfirmationURL }}` will correctly land the user on the app's own reset-password form after confirming — no other code changes needed for this to work once SMTP + templates are set.
- After saving, send yourself a real signup and a real password reset to confirm both the sender address and the template render correctly before considering this done.
