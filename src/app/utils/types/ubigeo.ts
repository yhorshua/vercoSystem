export type Ubigeo = {
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