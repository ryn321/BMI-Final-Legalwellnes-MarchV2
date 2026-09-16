# Legal Wellness live gateway

This project keeps the approved Legal Wellness build available on the official domain while the historical source handover is reconciled.

- All public website requests are proxied to `https://legal-wellness-master-final.netlify.app`.
- `POST /api/contact` is handled by a Netlify Function and sends the enquiry to `client@legalwellness.co.za` using the project's existing `RESEND_API_KEY`.
- The consultation form retains the client-requested ID-number field and displays a point-of-submission acknowledgement linked to a full privacy notice. The contact endpoint validates 13-digit South African IDs for consultation requests, bounds input, escapes generated HTML, stores nothing in the gateway, and applies a Netlify-enforced per-IP/domain rate limit.

The approved upstream build remains the content authority. Do not change that origin without a reviewed cutover.
