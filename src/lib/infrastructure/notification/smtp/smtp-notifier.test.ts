import { createTransport } from "nodemailer";
import { describe, expect, it } from "vitest";

import { senderField, type SmtpConfig } from "./smtp-notifier";

const CONFIG: SmtpConfig = {
  host: "smtp.example.test",
  port: 465,
  user: "bot@example.test",
  password: "secret",
  from: "bot@example.test",
  fromName: "Text Share",
};

// streamTransport builds the real MIME message without a network, so these assert the header a
// mail client actually reads rather than the object we passed in.
async function fromHeaderFor(config: SmtpConfig): Promise<string> {
  const info = await createTransport({ streamTransport: true, buffer: true }).sendMail({
    from: senderField(config),
    to: "someone@example.test",
    subject: "Reset your password",
    text: "body",
  });

  const header = String(info.message).split("\r\n").find((line) => line.startsWith("From:"));

  return header ?? "";
}

describe("senderField", () => {
  it("puts a display name on the From header, not a bare address", async () => {
    await expect(fromHeaderFor(CONFIG)).resolves.toBe("From: Text Share <bot@example.test>");
  });

  it("quotes a name containing a comma, which would otherwise split the address list", async () => {
    const header = await fromHeaderFor({ ...CONFIG, fromName: "Share, Text" });

    expect(header).toBe('From: "Share, Text" <bot@example.test>');
  });

  it("encodes a non-ASCII name rather than emitting raw bytes", async () => {
    const header = await fromHeaderFor({ ...CONFIG, fromName: "Chia sẻ" });

    expect(header).toContain("<bot@example.test>");
    expect(header).not.toContain("Chia sẻ");
    expect(header).toMatch(/=\?UTF-8\?/i);
  });
});
