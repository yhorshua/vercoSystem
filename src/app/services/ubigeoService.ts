import fs from "fs";

// 👇 usa require SIN tipos raros
const raw = require("../utils/ubigeo.json");

type RawUbigeo = {
  inei_district: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

// 👇 tipado correcto
const data: RawUbigeo[] = raw;

// 👇 tipado del resultado (mejor que any)
type Ubigeo = {
  [depId: string]: {
    nombre: string;
    provincias: {
      [provId: string]: {
        nombre: string;
        distritos: {
          [distId: string]: string;
        };
      };
    };
  };
};

const result: Ubigeo = {};

data.forEach((item) => {
  const distId = item.inei_district;
  const provId = distId.slice(0, 4);
  const depId = distId.slice(0, 2);

  if (!result[depId]) {
    result[depId] = {
      nombre: item.departamento,
      provincias: {}
    };
  }

  if (!result[depId].provincias[provId]) {
    result[depId].provincias[provId] = {
      nombre: item.provincia,
      distritos: {}
    };
  }

  if (!result[depId].provincias[provId].distritos[distId]) {
    result[depId].provincias[provId].distritos[distId] = item.distrito;
  }
});

// 👇 guarda en carpeta utils (mejor organizado)
fs.writeFileSync(
  "./src/app/utils/ubigeo-peru-optimizado.json",
  JSON.stringify(result, null, 2)
);

console.log("Ubigeo completo listo ✅");