// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money was actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Latest attempt per txn_id
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (const line of lines) {
  if (!line.trim()) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line: ignore
  }

  if (!event || !event.txn_id) continue; // no txn_id: ignore

  const prev = latest.get(event.txn_id);
  // ts is ISO 8601 in UTC, so compare as real dates
  if (!prev || new Date(event.ts) >= new Date(prev.ts)) {
    latest.set(event.txn_id, event);
  }
}

// Amounts can arrive as numbers or as strings like "4,804.15"
function toNumber(amount) {
  if (typeof amount === "number") return amount;
  return Number(String(amount).replace(/,/g, ""));
}

let total = 0;
let count = 0;
for (const event of latest.values()) {
  if (event.status === "success") {
    total += toNumber(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8"), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way it should.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}