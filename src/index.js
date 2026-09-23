const RECIPIENT = "admin@torqservicegroup.com";
const SENDER = "requests@dash360tech.com";
const HOST = "dash360tech.com";

function response(message, status = 200) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function field(form, name, max = 500) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/request") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return response("Method not allowed.", 405);
    }

    if (request.headers.get("origin") !== `https://${HOST}`) {
      return response("Invalid origin.", 403);
    }

    if (Number(request.headers.get("content-length") || 0) > 20000) {
      return response("Request is too large.", 413);
    }

    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      return response("Invalid form.", 400);
    }

    if (!env.TURNSTILE_SECRET || !env.EMAIL) {
      return response("Service is temporarily unavailable. Please email us instead.", 503);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return response("Invalid form.", 400);
    }

    if (field(form, "website")) {
      return response("Request received.");
    }

    const name = field(form, "name", 100);
    const email = field(form, "email", 150);
    const phone = field(form, "phone", 40);
    const type = field(form, "customerType", 30);
    const company = field(form, "company", 150);
    const location = field(form, "location", 150);
    const vehicle = field(form, "vehicle", 200);
    const service = field(form, "service", 80);
    const equipment = field(form, "equipment", 300);
    const details = field(form, "details", 3000);
    const token = field(form, "cf-turnstile-response", 2048);

    if (
      !name || !email || !phone || !location || !details ||
      !["Company", "Private consumer"].includes(type) ||
      (type === "Company" && !company)
    ) {
      return response("Please complete the required fields.", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token) {
      return response("Please check your email and security verification.", 400);
    }

    let verified;
    try {
      const check = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET,
            response: token,
            remoteip: request.headers.get("CF-Connecting-IP") || ""
          })
        }
      );
      verified = await check.json();
    } catch {
      return response("Verification is unavailable. Please try again.", 503);
    }

    if (!verified.success || verified.hostname !== HOST) {
      return response("Security verification failed. Please try again.", 403);
    }

    const text = [
      "New Dash 360 service request",
      "",
      `Customer: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Customer type: ${type}`,
      `Company: ${type === "Company" ? company : "N/A"}`,
      `Installation location: ${location}`,
      `Vehicle(s): ${vehicle || "Not provided"}`,
      `Service: ${service || "Not specified"}`,
      `Equipment: ${equipment || "Not specified"}`,
      "",
      "Requested work:",
      details
    ].join("\n");

    try {
      await env.EMAIL.send({
        to: RECIPIENT,
        from: SENDER,
        replyTo: email,
        subject: `Dash 360 service request - ${type}`,
        text
      });
    } catch (error) {
      console.error("Service request email failed", error);
      return response("We couldn't send your request. Please email or call us directly.", 503);
    }

    return response("Thank you. Your service request was sent.");
  }
};
