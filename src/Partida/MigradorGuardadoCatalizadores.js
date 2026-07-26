import { componerPropiedadesObjeto } from "../juego/objetos/SistemaAfijosCatalizadores.js";

const IDS_VARITAS_HEREDADAS = new Set([
  "varita_aprendiz",
  "varita_canalizada",
]);

export function migrarSnapshotCatalizadores({
  snapshot,
  configuracionObjetos,
} = {}) {
  validarObjetoPlano(snapshot, "el guardado del jugador");
  validarObjetoPlano(configuracionObjetos, "la configuración de objetos");

  const migrado = copiarDatos(snapshot);
  const jugador = migrado.jugador;
  if (!jugador || typeof jugador !== "object" || Array.isArray(jugador)) {
    return migrado;
  }

  const espacios = jugador.inventario?.espacios;
  if (Array.isArray(espacios)) {
    jugador.inventario.espacios = espacios.map((definicion) =>
      migrarDefinicionPersistida({ definicion, configuracionObjetos }),
    );
  }

  const ranuras = jugador.equipamiento?.ranuras;
  if (ranuras && typeof ranuras === "object" && !Array.isArray(ranuras)) {
    jugador.equipamiento.ranuras = Object.fromEntries(
      Object.entries(ranuras).map(([ranura, definicion]) => [
        ranura,
        migrarDefinicionPersistida({ definicion, configuracionObjetos }),
      ]),
    );
  }

  return migrado;
}

export function migrarDefinicionPersistida({
  definicion,
  configuracionObjetos,
} = {}) {
  if (definicion === null || definicion === undefined) return null;
  validarObjetoPlano(definicion, "la definición persistida del objeto");

  const migrada = copiarDatos(definicion);
  const id = normalizarId(migrada.id);

  if (IDS_VARITAS_HEREDADAS.has(id)) {
    const plantilla = configuracionObjetos[id];
    validarObjetoPlano(
      plantilla,
      `la plantilla actual de la varita heredada "${id}"`,
    );
    validarObjetoPlano(
      plantilla.propiedades,
      `las propiedades actuales de la varita heredada "${id}"`,
    );

    migrada.propiedadesFinales = componerPropiedadesObjeto({
      propiedadesBase: plantilla.propiedades,
      prefijos: Array.isArray(migrada.prefijos) ? migrada.prefijos : [],
      sufijos: Array.isArray(migrada.sufijos) ? migrada.sufijos : [],
    });
  }

  if (migrada.contenedor?.espacios && Array.isArray(migrada.contenedor.espacios)) {
    migrada.contenedor.espacios = migrada.contenedor.espacios.map((contenido) =>
      migrarDefinicionPersistida({
        definicion: contenido,
        configuracionObjetos,
      }),
    );
  }

  return migrada;
}

function normalizarId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("La definición persistida necesita un ID de objeto válido.");
  }
  return id.trim().toLowerCase();
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válido.`);
  }
}

function copiarDatos(valor) {
  if (Array.isArray(valor)) return valor.map(copiarDatos);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        copiarDatos(contenido),
      ]),
    );
  }
  return valor;
}
