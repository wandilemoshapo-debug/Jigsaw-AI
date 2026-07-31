import { NextResponse } from 'next/server';

const USERS = {
  jigsaw: { password: process.env.AUTH_JIGSAW_PASSWORD, token: process.env.AUTH_JIGSAW_TOKEN },
  Boom:   { password: process.env.AUTH_BOOM_PASSWORD,   token: process.env.AUTH_BOOM_TOKEN },
};

export async function POST(req) {
  const { username, password } = await req.json();
  const user = USERS[username];

  if (!user || !user.password || password !== user.password) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username });
  res.cookies.set('jigsaw_session', user.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}