
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'ssl0.ovh.net',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    async sendNotification(
        to: string,
        titleEn: string,
        bodyEn: string,
        titleFr?: string,
        bodyFr?: string,
    ): Promise<void> {
        const subject = titleFr ? `${titleEn} / ${titleFr}` : titleEn;
        this.logger.log(`Sending email → ${to} | "${subject}"`);
        try {
            await this.transporter.sendMail({
                from: `"MyLIS" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html: this.buildTemplate(titleEn, bodyEn, titleFr, bodyFr),
                text: titleFr
                    ? `${titleEn}\n\n${bodyEn}\n\n---\n\n${titleFr}\n\n${bodyFr}`
                    : `${titleEn}\n\n${bodyEn}`,
            });
            this.logger.log(`Email sent ✓ → ${to} | "${subject}"`);
        } catch (err) {
            this.logger.error(`Email failed → ${to} | "${subject}" | ${err?.message}`);
        }
    }

    private buildTemplate(titleEn: string, bodyEn: string, titleFr?: string, bodyFr?: string): string {
        const hasFr = !!(titleFr && bodyFr);

        const enSection = `
          <!-- EN Section -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:#e8fafa;color:#1a9a9b;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:14px;">English</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="margin:0 0 10px;color:#1a1a2e;font-size:17px;font-weight:700;line-height:1.3;">${this.esc(titleEn)}</h2>
                    <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.7;">${this.esc(bodyEn).replace(/\n/g, '<br/>')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

        const frSection = hasFr ? `
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px dashed #e5e7eb;"></div>
            </td>
          </tr>

          <!-- FR Section -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:#fef3c7;color:#b45309;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:14px;">Français</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="margin:0 0 10px;color:#1a1a2e;font-size:17px;font-weight:700;line-height:1.3;">${this.esc(titleFr!)}</h2>
                    <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.7;">${this.esc(bodyFr!).replace(/\n/g, '<br/>')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

        return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${this.esc(titleEn)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a4a6b 0%,#283852 100%);padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 40px 24px;" align="center">
                    <img
                      src="https://admin.mylisapp.online/Logo.png"
                      alt="MyLIS"
                      width="120"
                      style="display:block;height:auto;max-width:120px;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="background:linear-gradient(90deg,#33cbcc 0%,#2bb5b6 100%);padding:12px 40px;">
                    <p style="margin:0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;text-align:center;">
                      Workspace Notification &nbsp;·&nbsp; Notification de travail
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${enSection}
          ${frSection}

          <!-- Solid divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;line-height:1.6;">
                This is an automated message from <strong style="color:#6b7280;">MyLIS</strong>. Please do not reply to this email.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                Ceci est un message automatique de <strong style="color:#6b7280;">MyLIS</strong>. Merci de ne pas répondre à cet e-mail.
              </p>
              <p style="margin:16px 0 0;color:#c4c9d4;font-size:10px;">
                &copy; ${new Date().getFullYear()} MyLIS &mdash; LIS Group
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    private esc(str: string): string {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
