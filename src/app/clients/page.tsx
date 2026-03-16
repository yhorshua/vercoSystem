// src/app/client/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';

import styles from './clientes.module.css';
import { useUser } from '../context/UserContext';
import { getUbigeoPeru } from './clientes/ubigeoData';
import { createClient, getMyClients, ClientRow, CreateClientPayload } from '../services/clientServices';
// import { getDocumentTypes, DocumentTypeRow } from '../services/documentTypeServices';

type Ubigeo = Record<string, Record<string, string[]>>;

function onlyDigits(s: string) {
  return s.replace(/\D/g, '');
}

function docLabelFromCode(code: string) {
  if (code === '01') return 'DNI (8 dígitos)';
  if (code === '06') return 'RUC (11 dígitos)';
  return 'Documento';
}

function docPlaceholderFromCode(code: string) {
  if (code === '01') return 'Ej: 12345678';
  if (code === '06') return 'Ej: 20123456789';
  return 'Ingrese documento';
}

function validateDocByCode(code: string, value: string) {
  const digits = onlyDigits(value);

  // SUNAT: 01 DNI, 06 RUC
  if (code === '01') {
    if (digits.length !== 8) return 'DNI debe tener 8 dígitos';
  } else if (code === '06') {
    if (digits.length !== 11) return 'RUC debe tener 11 dígitos';
  } else {
    if (digits.length < 6) return 'Documento inválido';
  }
  return null;
}

export default function RegisterClientePage() {
  const { user } = useUser();
  const token = user?.token ?? '';

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [ubigeo, setUbigeo] = useState<Ubigeo>({});
  // const [docTypes, setDocTypes] = useState<DocumentTypeRow[]>([]);

  // ====== Form state ======
  // ✅ IMPORTANT: guardamos el CODE ('01'|'06'), no el texto
  const [docTypeCode, setDocTypeCode] = useState<string>('06'); // default RUC
  const [docNumber, setDocNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');

  const [loading, setLoading] = useState(false);

  const docError = useMemo(() => validateDocByCode(docTypeCode, docNumber), [docTypeCode, docNumber]);

  const docLabel = docLabelFromCode(docTypeCode);
  const docPlaceholder = docPlaceholderFromCode(docTypeCode);

  const provincias = departamento ? Object.keys(ubigeo?.[departamento] ?? {}) : [];
  const distritos = departamento && provincia ? ubigeo?.[departamento]?.[provincia] ?? [] : [];

  async function refresh() {
    if (!token) return;
    const data = await getMyClients(token);
    setRows(data);
  }

  function resetForm() {
    setDocTypeCode('06');
    setDocNumber('');
    setBusinessName('');
    setTradeName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setDepartamento('');
    setProvincia('');
    setDistrito('');
  }

  // Carga ubigeo
  useEffect(() => {
    (async () => {
      try {
        const u = await getUbigeoPeru();
        setUbigeo(u);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);
  /*
    // Carga catálogo document types (SUNAT codes)
    useEffect(() => {
      (async () => {
        try {
          // si tu endpoint requiere token, pásalo; si no, quítalo
          const dts = await getDocumentTypes(token);
          setDocTypes(dts);
  
          // set default: si existe RUC(06), lo dejamos, si no el primero
          if (dts.some((x) => x.code === '06')) setDocTypeCode('06');
          else if (dts.length) setDocTypeCode(dts[0].code);
        } catch (e: any) {
          // no bloqueamos el form si no hay catálogo
          console.error(e);
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);
  */
  // Carga tabla clientes
  useEffect(() => {
    refresh().catch((e) => {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message ?? 'Error cargando clientes' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Sesión', text: 'No hay token. Vuelve a iniciar sesión.' });
      return;
    }

    const err = validateDocByCode(docTypeCode, docNumber);
    if (err) {
      Swal.fire({ icon: 'warning', title: 'Documento inválido', text: err });
      return;
    }

    if (!businessName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'Razón social / nombre es obligatorio' });
      return;
    }

    const payload: CreateClientPayload = {
      // ✅ enviamos el CODE (01/06) al backend (no el texto)
      document_type_code: docTypeCode,
      document_number: onlyDigits(docNumber),
      business_name: businessName.trim(),
      trade_name: tradeName.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      department: departamento || undefined,
      province: provincia || undefined,
      district: distrito || undefined,
      country: 'Perú',
    };

    setLoading(true);
    try {
      await createClient(payload, token);
      await refresh();
      resetForm();
      Swal.fire({ icon: 'success', title: 'Listo', text: 'Cliente registrado' });
    } catch (err2: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err2?.message ?? 'Error registrando cliente' });
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      { header: 'ID', accessorKey: 'id' },
      {
        header: 'Tipo',
        cell: ({ row }) => {
          const code = row.original.document_type;
          return code === '06' ? 'RUC' : code === '01' ? 'DNI' : code;
        },
      },

      { header: 'Documento', accessorKey: 'document_number' },
      { header: 'Razón Social', accessorKey: 'business_name' },
      { header: 'Dirección', cell: ({ row }) => row.original.address ?? '-' },
      { header: 'Departamento', cell: ({ row }) => row.original.department ?? '-' },
      { header: 'Provincia', cell: ({ row }) => row.original.province ?? '-' },
      { header: 'Distrito', cell: ({ row }) => row.original.district ?? '-' },
      { header: 'Teléfono', cell: ({ row }) => row.original.phone ?? '-' },
      { header: 'Correo', cell: ({ row }) => row.original.email ?? '-' },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registrar Cliente</h1>

      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <div className={styles.field}>
            <label className={styles.label}>Tipo de documento</label>

            <select
              className={styles.input}
              value={docTypeCode}
              onChange={(e) => {
                setDocTypeCode(e.target.value);
                setDocNumber('');
              }}
              disabled={loading}
            >
              {/* Si el catálogo carga, lo usamos */}
             
                  <option value="06">RUC</option>
                  <option value="01">DNI</option>
                
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{docLabel}</label>
            <input
              className={styles.input}
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder={docPlaceholder}
              inputMode="numeric"
              disabled={loading}
            />
            {docError && <div className={styles.errorText}>{docError}</div>}
          </div>

          <div className={styles.fieldWide}>
            <label className={styles.label}>Razón Social / Nombre</label>
            <input
              className={styles.input}
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.fieldWide}>
            <label className={styles.label}>Nombre Comercial</label>
            <input
              className={styles.input}
              type="text"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.fieldWide}>
            <label className={styles.label}>Dirección</label>
            <input
              className={styles.input}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Teléfono</label>
            <input
              className={styles.input}
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Correo</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Departamento</label>
            <select
              className={styles.input}
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value);
                setProvincia('');
                setDistrito('');
              }}
              disabled={loading}
            >
              <option value="">Selecciona</option>
              {Object.keys(ubigeo).map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Provincia</label>
            <select
              className={styles.input}
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value);
                setDistrito('');
              }}
              disabled={!departamento || loading}
            >
              <option value="">Selecciona</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Distrito</label>
            <select
              className={styles.input}
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              disabled={!provincia || loading}
            >
              <option value="">Selecciona</option>
              {distritos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.addButton} type="submit" disabled={loading || !!docError}>
            {loading ? 'Registrando...' : 'Agregar Cliente'}
          </button>

          <button className={styles.secondaryButton} type="button" onClick={resetForm} disabled={loading}>
            Limpiar
          </button>

          <button className={styles.secondaryButton} type="button" onClick={() => refresh()} disabled={loading || !token}>
            Refrescar
          </button>
        </div>
      </form>

      <div className={styles.tableContainer}>
        <div className={styles.responsiveWrapper}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className={styles.tableCell}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.tableCell}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && <div className={styles.empty}>Sin clientes</div>}
        </div>
      </div>
    </div>
  );
}
