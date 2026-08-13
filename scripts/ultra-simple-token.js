// Token ultra simple només amb ticket_id
const payload = {
  ticket_id: "TICKET_12345",
};

const header = { alg: "none", typ: "JWT" };

// Encoding manual
const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
  "base64url"
);
const token = `${encodedHeader}.${encodedPayload}.`;

console.log("🔑 TOKEN ULTRA SIMPLE:\n");
console.log(`http://localhost:3000/ca/survey?t=${token}\n`);

// També en espanyol
console.log(`http://localhost:3000/es/survey?t=${token}\n`);

console.log("Token payload:", JSON.stringify(payload, null, 2));
console.log("Aquest token només té ticket_id, res més!");
