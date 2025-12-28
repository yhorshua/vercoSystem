import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const numero = (searchParams.get('numero') || '').trim();

    if (!/^\d{11}$/.test(numero)) {
      return NextResponse.json({ message: 'RUC inválido (11 dígitos).' }, { status: 400 });
    }

    const token = process.env.DECOLECTA_TOKEN;
    if (!token) {
      return NextResponse.json({ message: 'Falta DECOLECTA_TOKEN en .env.local' }, { status: 500 });
    }

    const url = `https://api.decolecta.com/v1/sunat/ruc?numero=${numero}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Referer: 'http://apis.net.pe/api-ruc',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Error consultando RUC', raw: data },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error interno' }, { status: 500 });
  }
}
