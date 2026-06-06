import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { passcode } = await request.json().catch(() => ({ passcode: "" }));
  const expected = process.env.ADMIN_PASSCODE || "kenny";
  if (passcode && passcode === expected) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 401 });
}
