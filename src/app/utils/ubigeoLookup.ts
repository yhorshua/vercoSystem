import type { Ubigeo } from './types/ubigeo';

export type UbigeoInput = {
  department?: string | number | null;
  province?: string | number | null;
  district?: string | number | null;
};

export type UbigeoSelection = {
  departmentId: string;
  provinceId: string;
  districtId: string;
  departmentName: string;
  provinceName: string;
  districtName: string;
};

const normalize = (value: string | number | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('es-PE');

function findKey<T>(
  entries: Array<[string, T]>,
  value: string | number | null | undefined,
  getName: (entry: T) => string,
) {
  const token = normalize(value);
  if (!token) return '';

  const exactKey = entries.find(([key]) => normalize(key) === token);
  if (exactKey) return exactKey[0];

  const exactName = entries.find(([, entry]) => normalize(getName(entry)) === token);
  return exactName?.[0] ?? '';
}

/**
 * Convierte los valores almacenados por clientes (nombres o códigos INEI) a los
 * IDs controlados por los selects. La resolución respeta la jerarquía para no
 * confundir provincias o distritos con nombres repetidos.
 */
export function resolveUbigeoSelection(ubigeo: Ubigeo, input: UbigeoInput): UbigeoSelection {
  const departmentEntries = Object.entries(ubigeo);
  const departmentId = findKey(departmentEntries, input.department, (department) => department.nombre);
  if (!departmentId) return emptySelection();

  const department = ubigeo[departmentId];
  const provinceEntries = Object.entries(department.provincias);
  const provinceId = findKey(provinceEntries, input.province, (province) => province.nombre);
  if (!provinceId) {
    return {
      ...emptySelection(),
      departmentId,
      departmentName: department.nombre,
    };
  }

  const province = department.provincias[provinceId];
  const districtEntries = Object.entries(province.distritos);
  const districtId = findKey(districtEntries, input.district, (district) => district);

  return {
    departmentId,
    provinceId,
    districtId,
    departmentName: department.nombre,
    provinceName: province.nombre,
    districtName: districtId ? province.distritos[districtId] : '',
  };
}

function emptySelection(): UbigeoSelection {
  return {
    departmentId: '',
    provinceId: '',
    districtId: '',
    departmentName: '',
    provinceName: '',
    districtName: '',
  };
}
