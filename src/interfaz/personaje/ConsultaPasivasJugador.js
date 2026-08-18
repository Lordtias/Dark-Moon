import { CLAVES_CONTEXTO_MODIFICADOR, cumpleCondicionesModificador } from "../../juego/modificadores/ContratosModificadoresCombatiente.js";
const CLAVES_HABILIDAD = new Set([
  CLAVES_CONTEXTO_MODIFICADOR.ID_HABILIDAD, CLAVES_CONTEXTO_MODIFICADOR.MAESTRIA_HABILIDAD,
  CLAVES_CONTEXTO_MODIFICADOR.TIPO_OBJETIVO_HABILIDAD, CLAVES_CONTEXTO_MODIFICADOR.FORMA_IMPACTO_HABILIDAD,
  CLAVES_CONTEXTO_MODIFICADOR.ATRIBUTO_HABILIDAD, CLAVES_CONTEXTO_MODIFICADOR.TIPO_DANIO_HABILIDAD,
  CLAVES_CONTEXTO_MODIFICADOR.FASE_HABILIDAD, CLAVES_CONTEXTO_MODIFICADOR.EFECTO_ID_HABILIDAD,
  CLAVES_CONTEXTO_MODIFICADOR.TIPO_EFECTO_HABILIDAD, CLAVES_CONTEXTO_MODIFICADOR.OBJETIVO_MODIFICADOR_EFECTO,
]);
// Consulta visual que reutiliza las condiciones canónicas; no calcula estadísticas.
export function obtenerEstadoPasivasJugador({ jugador, configuracion } = {}) {
  if (!jugador?.progresoHabilidades || !configuracion?.habilidades) return [];
  const contexto = jugador.obtenerContextoModificadores?.() ?? {}; const salida=[];
  for (const [id, habilidad] of Object.entries(configuracion.habilidades)) {
    if (habilidad?.tipo !== "pasiva") continue;
    let grado=0; try { grado=jugador.progresoHabilidades.obtenerGradoHabilidad(id); } catch { continue; }
    if (!Number.isInteger(grado) || grado <= 0) continue;
    const mods = habilidad.modificadoresPorGrado?.[grado] ?? [];
    const depende = mods.some(m => Object.keys(m?.condiciones ?? {}).some(k => CLAVES_HABILIDAD.has(k)));
    const faltantes = mods.flatMap(m => Object.entries(m?.condiciones ?? {}).filter(([k,e]) => !CLAVES_HABILIDAD.has(k) && !(Array.isArray(e) ? e.includes(contexto[k]) : contexto[k] === e)).map(([clave,esperado]) => Object.freeze({clave, esperado, actual:contexto[clave]})));
    const activaGeneral = mods.every(m => cumpleCondicionesModificador(m?.condiciones ?? {}, contexto));
    salida.push(Object.freeze({ idHabilidad:id, nombre:habilidad.nombre, maestria:habilidad.maestria, grado, icono:habilidad.icono ?? null, estado:depende?"condicional":activaGeneral?"activa":"inactiva", condicionesNoCumplidas:Object.freeze(faltantes) }));
  }
  return salida.sort((a,b)=>String(a.maestria).localeCompare(String(b.maestria)) || a.nombre.localeCompare(b.nombre,"es"));
}
