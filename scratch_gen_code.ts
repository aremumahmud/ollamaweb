import { prisma } from "./src/lib/prisma";
import * as OTPAuth from "otpauth";

const deviceId = process.argv[2];

prisma.device.findUnique({ where: { id: deviceId } }).then((d) => {
  if (!d?.totpSecret) {
    console.error("no secret");
    process.exit(1);
  }
  const totp = new OTPAuth.TOTP({
    issuer: "Care RAG",
    label: d.label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(d.totpSecret),
  });
  console.log(totp.generate());
  process.exit(0);
});
