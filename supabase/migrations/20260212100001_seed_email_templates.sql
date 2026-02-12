-- ============================================================
-- Email Template Seed Data
-- ============================================================
--
-- This migration seeds the email_templates table with content
-- extracted from the existing TypeScript template files.
--
-- Templates are grouped by category:
--   1. Transactional - Auth & account emails
--   2. Workflow - Content workflow notifications
--   3. Sales - Proposals & recommendations
--   4. Alerts - Result alerts & notifications
--
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- ============================================================


-- ============================================================
-- Helper: Get category IDs
-- ============================================================

DO $$
DECLARE
  cat_transactional uuid;
  cat_workflow uuid;
  cat_sales uuid;
  cat_alerts uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_transactional FROM public.email_categories WHERE slug = 'transactional';
  SELECT id INTO cat_workflow FROM public.email_categories WHERE slug = 'workflow';
  SELECT id INTO cat_sales FROM public.email_categories WHERE slug = 'sales';
  SELECT id INTO cat_alerts FROM public.email_categories WHERE slug = 'alerts';

  -- ============================================================
  -- TRANSACTIONAL TEMPLATES
  -- ============================================================

  -- 1. Password Reset
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_transactional,
    'password-reset',
    'Password Reset',
    'Sent when a user requests to reset their password',
    'password_reset_requested',
    'User clicks "Forgot Password" on login page',
    'any',
    'Reset Your Pyrus Portal Password',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Password Reset</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">\n                Hi ${firstName},\n              </h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">\n                We received a request to reset your password for the Pyrus Portal. Click the button below to set a new password.\n              </p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">\n                <tr>\n                  <td align="center">\n                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #885430; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">\n                      Reset Password\n                    </a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 20px; font-size: 14px; color: #5A6358; line-height: 1.6;">\n                This link will expire in <strong>1 hour</strong> for security reasons.\n              </p>\n              <p style="margin: 0 0 20px; font-size: 14px; color: #5A6358; line-height: 1.6;">\n                If you didn''t request a password reset, you can safely ignore this email. Your password will remain unchanged.\n              </p>\n              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">\n                <p style="margin: 0; font-size: 12px; color: #8B9187; line-height: 1.6;">\n                  If the button doesn''t work, copy and paste this link into your browser:\n                </p>\n                <p style="margin: 8px 0 0; font-size: 12px; color: #885430; word-break: break-all;">\n                  ${resetUrl}\n                </p>\n              </div>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9187; text-align: center; line-height: 1.6;">\n                This email was sent by Pyrus Digital Media.<br />\n                If you have questions, please contact us at <a href="mailto:support@pyrusdigitalmedia.com" style="color: #885430; text-decoration: none;">support@pyrusdigitalmedia.com</a>\n              </p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Hi ${firstName},\n\nWe received a request to reset your password for the Pyrus Portal.\n\nReset your password here: ${resetUrl}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn''t request a password reset, you can safely ignore this email. Your password will remain unchanged.\n\n---\nPyrus Digital Media',
    '[{"key": "firstName", "description": "User''s first name", "example": "John"}, {"key": "resetUrl", "description": "Password reset URL with token", "example": "https://portal.pyrusdigitalmedia.com/reset-password?token=abc123"}]'::jsonb,
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- 2. User Invite (Client)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_transactional,
    'user-invite-client',
    'User Invite (Client)',
    'Sent when inviting a new client user to the portal',
    'user_invite_sent',
    'Admin invites a new client user from the client detail page',
    'client',
    E'You''ve been invited to the ${clientName} Portal',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Portal Invitation</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">\n                Hi ${firstName},\n              </h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">\n                You''ve been invited to access the client portal for <strong>${clientName}</strong>.\n              </p>\n              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">\n                Click the button below to set up your account and get started:\n              </p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                <tr>\n                  <td align="center">\n                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">\n                      Set Up Your Account\n                    </a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">\n                Or copy and paste this link into your browser:<br />\n                <a href="${inviteUrl}" style="color: #324438; word-break: break-all;">${inviteUrl}</a>\n              </p>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">\n                This link will expire in 7 days.\n              </p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 0 40px 40px;">\n              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">\n                <tr>\n                  <td style="padding: 24px;">\n                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">\n                      What You''ll Get Access To\n                    </h3>\n                    <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> View your marketing progress</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Access reports and analytics</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Communicate with your team</td></tr>\n                    </table>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">\n                If you didn''t expect this invitation, you can safely ignore this email.\n              </p>\n              <p style="margin: 12px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">\n                Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a>\n              </p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Hi ${firstName},\n\nYou''ve been invited to access the client portal for ${clientName}.\n\nClick the link below to set up your account:\n${inviteUrl}\n\nThis link will expire in 7 days.\n\nIf you didn''t expect this invitation, you can safely ignore this email.\n\n- Pyrus Digital Media',
    '[{"key": "firstName", "description": "Recipient''s first name", "example": "John"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "inviteUrl", "description": "Account setup URL with invite token", "example": "https://portal.pyrusdigitalmedia.com/accept-invite?token=abc123"}, {"key": "inviterName", "description": "Name of person who sent the invite", "example": "Jane Smith"}]'::jsonb,
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- 3. User Invite (Admin/Team)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_transactional,
    'user-invite-admin',
    'User Invite (Admin/Team)',
    'Sent when inviting a new admin or team member to the portal',
    'user_invite_sent',
    'Super admin invites a new admin, production, or sales team member',
    'admin',
    E'You''ve been invited to join the Pyrus Admin Portal',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Portal Invitation</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">\n                Hi ${firstName},\n              </h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">\n                You''ve been invited to join the Pyrus Digital Media admin portal as <strong>${roleDisplay}</strong>.\n              </p>\n              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">\n                Click the button below to set up your account and get started:\n              </p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                <tr>\n                  <td align="center">\n                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">\n                      Set Up Your Account\n                    </a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">\n                Or copy and paste this link into your browser:<br />\n                <a href="${inviteUrl}" style="color: #324438; word-break: break-all;">${inviteUrl}</a>\n              </p>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">\n                This link will expire in 7 days.\n              </p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 0 40px 40px;">\n              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px;">\n                <tr>\n                  <td style="padding: 24px;">\n                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">\n                      What You''ll Get Access To\n                    </h3>\n                    <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Full admin dashboard access</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Client and user management</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">&#10003;</span> Analytics and reporting</td></tr>\n                    </table>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">\n                If you didn''t expect this invitation, you can safely ignore this email.\n              </p>\n              <p style="margin: 12px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">\n                Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a>\n              </p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Hi ${firstName},\n\nYou''ve been invited to join the Pyrus Digital Media admin portal as ${roleDisplay}.\n\nClick the link below to set up your account:\n${inviteUrl}\n\nThis link will expire in 7 days.\n\nIf you didn''t expect this invitation, you can safely ignore this email.\n\n- Pyrus Digital Media',
    '[{"key": "firstName", "description": "Recipient''s first name", "example": "John"}, {"key": "roleDisplay", "description": "Human-readable role name", "example": "Admin"}, {"key": "inviteUrl", "description": "Account setup URL with invite token", "example": "https://portal.pyrusdigitalmedia.com/accept-invite?token=abc123"}, {"key": "inviterName", "description": "Name of person who sent the invite", "example": "Jane Smith"}]'::jsonb,
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- WORKFLOW TEMPLATES
  -- ============================================================

  -- 4. Content Ready for Review (Client-facing)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-ready-for-review',
    'Content Ready for Review',
    'Notifies client that new content is ready for their review',
    'content_status_changed',
    'Content status changes to "client_review"',
    'client',
    'Content ready for your review: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Content Ready for Review</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">New content is ready for your review: ${contentTitle}</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Content Ready for Review</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;">Hi there,</p>\n                <p style="margin: 0 0 16px;">New content titled "<strong>${contentTitle}</strong>" has been created for ${clientName} and is ready for your review.</p>\n                <p style="margin: 0 0 16px;">Please review the content and either approve it or request revisions. Once approved, we''ll move forward with final optimization and publishing.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Review Now</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0 0 12px; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">You have 5 business days to review this content.</p>\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Content Ready for Review\n\nHi there,\n\nNew content titled "${contentTitle}" has been created for ${clientName} and is ready for your review.\n\nPlease review the content and either approve it or request revisions.\n\nReview now: ${portalUrl}\n\nYou have 5 business days to review this content.\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 5. Content Revision Resubmitted
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-revision-resubmitted',
    'Revision Resubmitted',
    'Notifies client that revised content is ready for re-review',
    'content_status_changed',
    'Content resubmitted after revisions requested',
    'client',
    'Updated content ready for re-review: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Updated Content Ready</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">We''ve made changes based on your feedback: ${contentTitle}</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Updated Content Ready</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;">Hi there,</p>\n                <p style="margin: 0 0 16px;">We''ve updated "<strong>${contentTitle}</strong>" based on your feedback and it''s ready for your review again.</p>\n                <p style="margin: 0 0 16px;">Please take another look and let us know if you''d like to approve or request additional changes.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Review Updated Content</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Updated Content Ready\n\nHi there,\n\nWe''ve updated "${contentTitle}" based on your feedback and it''s ready for your review again.\n\nPlease take another look and let us know if you''d like to approve or request additional changes.\n\nReview now: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}, {"key": "reviewRound", "description": "Current revision round number", "example": "2"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 6. Content Published
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-published',
    'Content Published',
    'Notifies client that their content has been published',
    'content_status_changed',
    'Content status changes to "published"',
    'client',
    'Your content has been published: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Content Published!</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">Great news! "${contentTitle}" is now live.</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Content Published!</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;">Hi there,</p>\n                <p style="margin: 0 0 16px;">Great news! "<strong>${contentTitle}</strong>" has been published and is now live.</p>\n                <p style="margin: 0;">You can always view all your content in the portal.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">View in Portal</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Content Published!\n\nHi there,\n\nGreat news! "${contentTitle}" has been published and is now live.\n\nView in portal: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}, {"key": "publishedUrl", "description": "Live URL where content is published", "example": "https://example.com/blog/10-tips-local-seo"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 7. Content Scheduled
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-scheduled',
    'Content Scheduled',
    'Notifies client that content has been scheduled for publishing',
    'content_status_changed',
    'Content is scheduled for future publishing',
    'client',
    'Content scheduled for publishing: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Content Scheduled</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">"${contentTitle}" is scheduled to go live soon.</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Content Scheduled</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;">Hi there,</p>\n                <p style="margin: 0 0 16px;">"<strong>${contentTitle}</strong>" has been scheduled for publishing.</p>\n                <p style="margin: 0;">We''ll send you another notification once it goes live.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">View in Portal</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Content Scheduled\n\nHi there,\n\n"${contentTitle}" has been scheduled for publishing.\n\nWe''ll send you another notification once it goes live.\n\nView in portal: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}, {"key": "scheduledDate", "description": "Date when content will be published", "example": "March 15, 2026"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 8. Client Started Reviewing (Team-facing)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-client-started-reviewing',
    'Client Started Reviewing',
    'Notifies team that a client has started reviewing content',
    'content_review_started',
    'Client opens content for review in the portal',
    'admin',
    '${clientName} is reviewing: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Client Reviewing Content</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">${changedByName} from ${clientName} started reviewing content.</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Client Reviewing Content</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;"><strong>${changedByName}</strong> from ${clientName} has started reviewing "<strong>${contentTitle}</strong>".</p>\n                <p style="margin: 0;">They may approve the content or request revisions soon.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">View Content</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Client Reviewing Content\n\n${changedByName} from ${clientName} has started reviewing "${contentTitle}".\n\nThey may approve the content or request revisions soon.\n\nView content: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "changedByName", "description": "Name of person who started reviewing", "example": "John Smith"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 9. Client Approved (Team-facing)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-client-approved',
    'Client Approved Content',
    'Notifies team that a client has approved content',
    'content_approved',
    'Client clicks Approve on content review',
    'admin',
    E'✅ Approved: ${contentTitle} — ${clientName}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Content Approved!</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">${clientName} approved "${contentTitle}". Ready for final optimization.</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Content Approved!</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;"><strong>${changedByName}</strong> from ${clientName} has approved "<strong>${contentTitle}</strong>".</p>\n                <p style="margin: 0;">The content is now ready for final optimization and publishing.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Begin Final Optimization</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Content Approved!\n\n${changedByName} from ${clientName} has approved "${contentTitle}".\n\nThe content is now ready for final optimization and publishing.\n\nView content: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "changedByName", "description": "Name of person who approved", "example": "John Smith"}, {"key": "portalUrl", "description": "URL to view content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 10. Revisions Requested (Team-facing)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'content-revisions-requested',
    'Revisions Requested',
    'Notifies team that a client has requested content revisions',
    'content_revisions_requested',
    'Client clicks Request Revisions on content review',
    'admin',
    E'⚠️ Revisions requested: ${contentTitle}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Revisions Requested</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="display: none; max-height: 0px; overflow: hidden;">${clientName} requested changes to "${contentTitle}".</div>\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Revisions Requested</h1>\n              <div style="font-size: 16px; color: #5A6358; line-height: 1.6;">\n                <p style="margin: 0 0 16px;"><strong>${changedByName}</strong> from ${clientName} has requested revisions on "<strong>${contentTitle}</strong>".</p>\n                <p style="margin: 0;">Please review the feedback and make the necessary updates.</p>\n              </div>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Edit Content</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 20px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6; text-align: center;">Or copy and paste this link:<br /><a href="${portalUrl}" style="color: #324438; word-break: break-all;">${portalUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">This is an automated notification from Pyrus Digital Media.</p>\n              <p style="margin: 8px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Revisions Requested\n\n${changedByName} from ${clientName} has requested revisions on "${contentTitle}".\n\nPlease review the feedback and make the necessary updates.\n\nEdit content: ${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contentTitle", "description": "Title of the content piece", "example": "10 Tips for Local SEO"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "changedByName", "description": "Name of person who requested revisions", "example": "John Smith"}, {"key": "portalUrl", "description": "URL to edit content in portal", "example": "https://portal.pyrusdigitalmedia.com/content/abc123"}, {"key": "reviewRound", "description": "Current revision round number", "example": "2"}, {"key": "note", "description": "Client feedback/notes", "example": "Please change the headline to be more specific."}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- 11. File Notification
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_workflow,
    'file-notification',
    'File Added Notification',
    'Notifies client when a new file is added to their portal',
    'file_uploaded',
    'Admin uploads a file to client''s documents',
    'client',
    'New file added to your portal: ${fileName}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New File Added</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Hi ${contactName},</h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">A new file has been added to your ${clientName} portal.</p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px; margin-bottom: 24px;">\n                <tr>\n                  <td style="padding: 20px;">\n                    <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                      <tr>\n                        <td style="padding: 8px 0;">\n                          <span style="font-size: 12px; color: #8B9088; text-transform: uppercase; letter-spacing: 0.5px;">File Name</span><br />\n                          <span style="font-size: 16px; color: #1A1F16; font-weight: 500;">${fileName}</span>\n                        </td>\n                      </tr>\n                      <tr>\n                        <td style="padding: 8px 0;">\n                          <span style="font-size: 12px; color: #8B9088; text-transform: uppercase; letter-spacing: 0.5px;">Category</span><br />\n                          <span style="font-size: 16px; color: #1A1F16; font-weight: 500;">${fileCategory}</span>\n                        </td>\n                      </tr>\n                    </table>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">Log in to your portal to view and download the file.</p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">View in Portal</a>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 24px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">You''re receiving this because you have an account on the Pyrus Digital Media portal.</p>\n              <p style="margin: 12px 0 0; font-size: 12px; color: #8B9088; line-height: 1.6; text-align: center;">Pyrus Digital Media &bull; <a href="https://pyrusdigitalmedia.com" style="color: #324438;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Hi ${contactName},\n\nA new file has been added to your ${clientName} portal.\n\nFile Name: ${fileName}\nCategory: ${fileCategory}\n\nLog in to your portal to view and download the file:\n${portalUrl}\n\n- Pyrus Digital Media',
    '[{"key": "contactName", "description": "Recipient''s name", "example": "John"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "fileName", "description": "Name of the uploaded file", "example": "Q1-2026-Report.pdf"}, {"key": "fileCategory", "description": "Category of the file", "example": "Reports"}, {"key": "portalUrl", "description": "URL to view files in portal", "example": "https://portal.pyrusdigitalmedia.com/documents"}]'::jsonb,
    true,
    false
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- SALES TEMPLATES
  -- ============================================================

  -- 12. Recommendation Invite (Proposal)
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_sales,
    'recommendation-invite',
    'Proposal Invitation',
    'Sent when a marketing proposal is shared with a prospect',
    'recommendation_sent',
    'Admin sends recommendation/proposal to prospect',
    'prospect',
    'Your Personalized Marketing Proposal for ${clientName}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Your Marketing Proposal</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Hi ${firstName},</h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">We''ve prepared a personalized marketing proposal for <strong>${clientName}</strong>. Inside, you''ll find tailored recommendations designed to help grow your business online.</p>\n              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">Click below to view your proposal and explore the options we''ve put together for you:</p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                <tr>\n                  <td align="center">\n                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">View Your Proposal</a>\n                  </td>\n                </tr>\n              </table>\n              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">Or copy and paste this link into your browser:<br /><a href="${inviteUrl}" style="color: #324438; word-break: break-all;">${inviteUrl}</a></p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 0 40px 40px;">\n              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAF8; border-radius: 8px; padding: 24px;">\n                <tr>\n                  <td style="padding: 24px;">\n                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #324438; text-transform: uppercase; letter-spacing: 0.5px;">Why Choose Pyrus?</h3>\n                    <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">✓</span> 30-day money-back guarantee</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">✓</span> Month-to-month, no contracts</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">✓</span> AI-powered marketing tools</td></tr>\n                      <tr><td style="padding: 8px 0; font-size: 14px; color: #5A6358;"><span style="color: #324438; margin-right: 8px;">✓</span> Local business expertise</td></tr>\n                    </table>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">\n              <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">Questions? We''re here to help.</p>\n              <p style="margin: 0 0 16px; font-size: 14px; color: #324438;"><a href="mailto:support@pyrusdigitalmedia.com" style="color: #324438; text-decoration: none;">support@pyrusdigitalmedia.com</a></p>\n              <p style="margin: 0; font-size: 12px; color: #8B9088;">Pyrus Digital Media<br />702 Houston St, Fort Worth, TX 76102<br /><a href="https://pyrusdigitalmedia.com" style="color: #8B9088;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">\n          <tr>\n            <td style="padding: 20px; text-align: center;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088;">You''re receiving this email because a marketing proposal was created for ${clientName}.</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'Hi ${firstName},\n\nWe''ve prepared a personalized marketing proposal for ${clientName}. Inside, you''ll find tailored recommendations designed to help grow your business online.\n\nView your proposal here:\n${inviteUrl}\n\nWhy Choose Pyrus?\n✓ 30-day money-back guarantee\n✓ Month-to-month, no contracts\n✓ AI-powered marketing tools\n✓ Local business expertise\n\nQuestions? We''re here to help.\nEmail: support@pyrusdigitalmedia.com\n\n---\nPyrus Digital Media\n702 Houston St, Fort Worth, TX 76102\nhttps://pyrusdigitalmedia.com\n\nYou''re receiving this email because a marketing proposal was created for ${clientName}.',
    '[{"key": "firstName", "description": "Recipient''s first name", "example": "John"}, {"key": "clientName", "description": "Name of the prospect/client organization", "example": "Acme Corp"}, {"key": "inviteUrl", "description": "URL to view the proposal", "example": "https://portal.pyrusdigitalmedia.com/proposal/abc123"}, {"key": "senderName", "description": "Name of person who sent the proposal", "example": "Jane Smith"}]'::jsonb,
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ALERT TEMPLATES
  -- ============================================================

  -- 13. Result Alert
  INSERT INTO public.email_templates (
    category_id, slug, name, description,
    trigger_event, trigger_description,
    recipient_type, subject_template, body_html, body_text,
    available_variables, is_active, is_system
  ) VALUES (
    cat_alerts,
    'result-alert',
    'Result Alert',
    'Sends marketing performance alerts to clients (rankings, traffic, leads, milestones)',
    'result_alert_sent',
    'Admin sends a result alert from the client dashboard',
    'client',
    '${subject}',
    E'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${alertTypeLabel}</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">\n  <table role="presentation" style="width: 100%; border-collapse: collapse;">\n    <tr>\n      <td align="center" style="padding: 40px 20px;">\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">\n              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 30px 40px 0; text-align: center;">\n              <span style="display: inline-block; padding: 8px 16px; background-color: #D1FAE5; color: #10B981; font-size: 14px; font-weight: 600; border-radius: 20px;">${alertTypeLabel}</span>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 30px 40px 40px;">\n              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3; text-align: center;">${subject}</h1>\n              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">Hi ${firstName},</p>\n              <p style="margin: 0 0 24px; font-size: 16px; color: #5A6358; line-height: 1.6;">${message}</p>\n              <table role="presentation" style="width: 100%; border-collapse: collapse;">\n                <tr>\n                  <td align="center">\n                    <a href="${portalUrl}/results" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">View Full Results</a>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">\n              <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">Keep up the great work! Your marketing is making an impact.</p>\n              <p style="margin: 0 0 16px; font-size: 14px; color: #324438;"><a href="mailto:support@pyrusdigitalmedia.com" style="color: #324438; text-decoration: none;">support@pyrusdigitalmedia.com</a></p>\n              <p style="margin: 0; font-size: 12px; color: #8B9088;">Pyrus Digital Media<br />702 Houston St, Fort Worth, TX 76102<br /><a href="https://pyrusdigitalmedia.com" style="color: #8B9088;">pyrusdigitalmedia.com</a></p>\n            </td>\n          </tr>\n        </table>\n        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">\n          <tr>\n            <td style="padding: 20px; text-align: center;">\n              <p style="margin: 0; font-size: 12px; color: #8B9088;">You''re receiving this result alert for ${clientName} because you''re subscribed to marketing updates.</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>',
    E'${alertTypeLabel}\n\n${subject}\n\nHi ${firstName},\n\n${message}\n\nView your full results at:\n${portalUrl}/results\n\n---\nKeep up the great work! Your marketing is making an impact.\n\nPyrus Digital Media\n702 Houston St, Fort Worth, TX 76102\nsupport@pyrusdigitalmedia.com\nhttps://pyrusdigitalmedia.com\n\nYou''re receiving this result alert for ${clientName} because you''re subscribed to marketing updates.',
    '[{"key": "firstName", "description": "Recipient''s first name", "example": "John"}, {"key": "clientName", "description": "Name of the client organization", "example": "Acme Corp"}, {"key": "alertType", "description": "Type of alert (ranking, traffic, leads, milestone, ai, other)", "example": "ranking"}, {"key": "alertTypeLabel", "description": "Human-readable alert type label", "example": "Keyword Ranking"}, {"key": "subject", "description": "Email subject line", "example": "New #1 Ranking Achieved!"}, {"key": "message", "description": "Main alert message body", "example": "Great news! Your website has achieved a #1 ranking for your target keyword."}, {"key": "portalUrl", "description": "Base portal URL", "example": "https://portal.pyrusdigitalmedia.com"}]'::jsonb,
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;

END $$;


-- ============================================================
-- Verification query (optional - run to verify seeding)
-- ============================================================
-- SELECT
--   c.name as category,
--   t.slug,
--   t.name,
--   t.is_active,
--   t.is_system
-- FROM public.email_templates t
-- LEFT JOIN public.email_categories c ON t.category_id = c.id
-- ORDER BY c.sort_order, t.slug;
