import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const numero = (searchParams.get('numero') || '').trim();

    if (!/^\d{8}$/.test(numero)) {
      return NextResponse.json({ message: 'DNI inválido (8 dígitos).' }, { status: 400 });
    }

    const token = process.env.DECOLECTA_TOKEN;
    if (!token) {
      return NextResponse.json({ message: 'Falta DECOLECTA_TOKEN en .env.local' }, { status: 500 });
    }

    const url = `https://api.decolecta.com/v1/reniec/dni?numero=${numero}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Referer: 'https://apis.net.pe/consulta-dni-api',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Error consultando DNI', raw: data },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error interno' }, { status: 500 });
  }
}
