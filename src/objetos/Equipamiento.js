// Administra los objetos equipados y las
// reservas generadas por armas de dos manos.
export class Equipamiento {
  constructor({ ranurasDisponibles = [], objetosIniciales = [] } = {}) {
    if (!Array.isArray(ranurasDisponibles)) {
      throw new Error("Las ranuras de equipamiento deben ser una lista.");
    }

    if (!Array.isArray(objetosIniciales)) {
      throw new Error(
        "Los objetos equipados inicialmente deben ser una lista.",
      );
    }

    this.ranuras = {};
    this.reservas = {};

    for (const nombreRanura of ranurasDisponibles) {
      const normalizada = this.normalizarNombreRanura(nombreRanura);

      if (Object.prototype.hasOwnProperty.call(this.ranuras, normalizada)) {
        throw new Error(`La ranura "${normalizada}" está repetida.`);
      }

      this.ranuras[normalizada] = null;
      this.reservas[normalizada] = null;
    }

    for (const objeto of objetosIniciales) {
      const resultado = this.equiparAutomaticamente(objeto);

      if (resultado === null) {
        throw new Error(
          "No existe una ranura compatible libre " +
            `para "${objeto.nombre ?? "el objeto"}".`,
        );
      }

      if (resultado.objetosDesequipados.length > 0) {
        throw new Error(
          `La configuración inicial de "${objeto.nombre}" desplaza otro objeto.`,
        );
      }
    }
  }

  normalizarNombreRanura(nombreRanura) {
    if (typeof nombreRanura !== "string" || nombreRanura.trim() === "") {
      throw new Error("Cada ranura debe tener un nombre válido.");
    }

    return nombreRanura.trim().toLowerCase();
  }

  obtenerRanuras() {
    return {
      ...this.ranuras,
    };
  }

  obtenerObjetosEquipados() {
    return Object.values(this.ranuras).filter(Boolean);
  }

  obtenerEstadoRanuras() {
    const estado = {};

    for (const nombreRanura of Object.keys(this.ranuras)) {
      estado[nombreRanura] = {
        objeto: this.ranuras[nombreRanura],

        reservadaPor: this.reservas[nombreRanura],
      };
    }

    return estado;
  }

  tieneRanura(nombreRanura) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    return Object.prototype.hasOwnProperty.call(this.ranuras, normalizada);
  }

  obtenerObjetoEnRanura(nombreRanura) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    this.validarRanura(normalizada);

    return this.ranuras[normalizada];
  }

  estaRanuraReservada(nombreRanura) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    this.validarRanura(normalizada);

    return this.reservas[normalizada] !== null;
  }

  buscarRanuraCompatibleLibre(objeto) {
    this.validarObjetoEquipable(objeto);

    for (const nombreRanura of objeto.ranurasCompatibles) {
      const normalizada = this.normalizarNombreRanura(nombreRanura);

      if (!this.tieneRanura(normalizada)) {
        continue;
      }

      if (
        this.ranuras[normalizada] !== null ||
        this.reservas[normalizada] !== null
      ) {
        continue;
      }

      if (normalizada === "arma" && objeto.bloqueaSecundaria) {
        if (
          !this.tieneRanura("secundaria") ||
          this.ranuras.secundaria !== null ||
          this.reservas.secundaria !== null
        ) {
          continue;
        }
      }

      return normalizada;
    }

    return null;
  }

  equiparAutomaticamente(objeto) {
    const ranura = this.buscarRanuraCompatibleLibre(objeto);

    if (ranura === null) {
      return null;
    }

    return this.equiparEnRanura(ranura, objeto);
  }

  // Informa qué objetos serían desplazados,
  // sin modificar todavía el equipamiento.
  previsualizarObjetosDesplazados(nombreRanura, objeto) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    this.validarRanura(normalizada);
    this.validarObjetoEquipable(objeto);

    if (!objeto.puedeEquiparseEn(normalizada)) {
      throw new Error(
        `${objeto.nombre} no puede equiparse en "${normalizada}".`,
      );
    }

    const objetosDesplazados = [];

    if (normalizada === "arma" && objeto.bloqueaSecundaria) {
      this.agregarSinRepetir(objetosDesplazados, this.ranuras.arma);

      this.agregarSinRepetir(objetosDesplazados, this.ranuras.secundaria);

      return objetosDesplazados;
    }

    if (normalizada === "secundaria") {
      this.agregarSinRepetir(objetosDesplazados, this.reservas.secundaria);

      this.agregarSinRepetir(objetosDesplazados, this.ranuras.secundaria);

      return objetosDesplazados;
    }

    this.agregarSinRepetir(objetosDesplazados, this.ranuras[normalizada]);

    return objetosDesplazados;
  }

  equiparEnRanura(nombreRanura, objeto) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    this.validarRanura(normalizada);
    this.validarObjetoEquipable(objeto);

    if (!objeto.puedeEquiparseEn(normalizada)) {
      throw new Error(
        `${objeto.nombre} no puede equiparse en "${normalizada}".`,
      );
    }

    const objetosDesequipados = [];

    this.retirarMismoObjeto(objeto);

    if (normalizada === "arma" && objeto.bloqueaSecundaria) {
      if (!this.tieneRanura("secundaria")) {
        throw new Error(
          `${objeto.nombre} necesita una ranura secundaria disponible.`,
        );
      }

      this.extraerObjetoDeRanura("arma", objetosDesequipados);

      this.extraerObjetoDeRanura("secundaria", objetosDesequipados);

      this.ranuras.arma = objeto;
      this.reservas.secundaria = objeto;
    } else if (normalizada === "secundaria") {
      const objetoQueReserva = this.reservas.secundaria;

      if (objetoQueReserva) {
        this.extraerObjetoPorReferencia(objetoQueReserva, objetosDesequipados);
      }

      this.extraerObjetoDeRanura("secundaria", objetosDesequipados);

      this.ranuras.secundaria = objeto;
    } else {
      this.extraerObjetoDeRanura(normalizada, objetosDesequipados);

      this.ranuras[normalizada] = objeto;
    }

    return {
      ranuraAsignada: normalizada,

      objetoEquipado: objeto,

      objetosDesequipados,
    };
  }

  desequipar(nombreRanura) {
    const normalizada = this.normalizarNombreRanura(nombreRanura);

    this.validarRanura(normalizada);

    const objetoQueReserva = this.reservas[normalizada];

    if (objetoQueReserva) {
      this.extraerObjetoPorReferencia(objetoQueReserva, []);

      return objetoQueReserva;
    }

    const objeto = this.ranuras[normalizada];

    if (!objeto) {
      return null;
    }

    this.ranuras[normalizada] = null;

    this.liberarReservasDelObjeto(objeto);

    return objeto;
  }

  retirarMismoObjeto(objeto) {
    for (const nombreRanura of Object.keys(this.ranuras)) {
      if (this.ranuras[nombreRanura] === objeto) {
        this.ranuras[nombreRanura] = null;

        this.liberarReservasDelObjeto(objeto);
      }
    }
  }

  extraerObjetoDeRanura(nombreRanura, objetosDesequipados) {
    const objeto = this.ranuras[nombreRanura];

    if (!objeto) {
      return null;
    }

    this.ranuras[nombreRanura] = null;

    this.liberarReservasDelObjeto(objeto);

    this.agregarSinRepetir(objetosDesequipados, objeto);

    return objeto;
  }

  extraerObjetoPorReferencia(objetoBuscado, objetosDesequipados) {
    for (const nombreRanura of Object.keys(this.ranuras)) {
      if (this.ranuras[nombreRanura] === objetoBuscado) {
        this.ranuras[nombreRanura] = null;

        this.liberarReservasDelObjeto(objetoBuscado);

        this.agregarSinRepetir(objetosDesequipados, objetoBuscado);

        return objetoBuscado;
      }
    }

    return null;
  }

  liberarReservasDelObjeto(objeto) {
    for (const nombreRanura of Object.keys(this.reservas)) {
      if (this.reservas[nombreRanura] === objeto) {
        this.reservas[nombreRanura] = null;
      }
    }
  }

  agregarSinRepetir(lista, objeto) {
    if (objeto && !lista.includes(objeto)) {
      lista.push(objeto);
    }
  }

  validarObjetoEquipable(objeto) {
    if (
      objeto === null ||
      typeof objeto !== "object" ||
      Array.isArray(objeto)
    ) {
      throw new Error("Se necesita un objeto válido para equipar.");
    }

    if (!objeto.esEquipable || !Array.isArray(objeto.ranurasCompatibles)) {
      throw new Error(`${objeto.nombre ?? "El objeto"} no es equipable.`);
    }
  }

  validarRanura(nombreRanura) {
    if (!this.tieneRanura(nombreRanura)) {
      throw new Error(`La ranura "${nombreRanura}" no existe.`);
    }
  }
}
