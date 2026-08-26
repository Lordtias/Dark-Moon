# ENTREGA — LIM-2: ordenamiento de aplicación y partida

## 1. Estado de cierre

- **Etapa:** LIM-2 — ordenamiento de aplicación y partida.
- **Estado:** cierre documental preparado tras la aprobación explícita del
  usuario de los tres incrementales funcionales.
- **Rama:** `main`.
- **Commit base y HEAD verificado de la copia:**
  `13978039963e198b98bcc943baedb6375879e58a`.
- **Dependencias nuevas:** ninguna.
- **Commit y push:** no realizados; este incremental contiene exclusivamente
  documentación y propone el commit que realizará el usuario.

La copia heredada contiene ruido amplio de CRLF/LF. Ignorando únicamente los
finales de línea, la Fase A contiene dos archivos productivos modificados y
cuatro agregados. La Fase B contiene solamente los dos documentos nuevos de
este incremental.

## 2. Objetivo completado

Ordenar el arranque y la sesión de partida sin modificar qué hace el juego.

La separación deja explícito quién coordina cada parte:

```text
Aplicacion
  └─ CoordinadorInicioPartida
       └─ ControladorPartida
            ├─ CoordinadorTransicionesMapa
            └─ CoordinadorComandosPartida
```

`Aplicacion` conserva presentación, preferencias, idioma, carga de catálogos y
menú. `ControladorPartida` conserva el estado canónico de la sesión, la
creación del `Juego`, las APIs públicas y la derrota durable. Los coordinadores
no poseen una segunda partida ni fórmulas propias: reciben contexto o callbacks
del dueño canónico.

## 3. Alcance funcional aprobado

### Bloque 1 — inicio de partida

`CoordinadorInicioPartida` concentra las dos rutas de inicio:

- continuar desde guardado válido;
- comenzar un personaje nuevo;
- limpiar guardado y barra de habilidades sólo al confirmar la nueva aventura;
- conservar mensajes de error y estado visual del guardado en `Aplicacion`.

### Bloque 2 — transición de mapas

`CoordinadorTransicionesMapa` concentra:

- tokenización de transiciones asíncronas;
- pantalla de Loading, progreso, primer pintado y ocultamiento;
- invalidación de entrada durante carga;
- recuperación del mapa previo o vuelta al menú ante error.

`ControladorPartida` continúa construyendo la configuración, creando el
`Juego`, guardando el estado de sesión y exponiendo las transiciones públicas.
`ValidacionConfiguracionMapa` es el contrato único usado antes de preparar o
activar un mapa.

### Bloque 3 — comandos y resultados

`CoordinadorComandosPartida` concentra:

- la entrada de comando y acciones jugables genéricas;
- integración de selección, confirmación y cancelación de Habilidades;
- orientación de interacción, detalle de entidad e interacción de contenedores;
- invocación única de `aplicarResultadoAccion` y la notificación canónica de
  cambio de estado del jugador.

`ControladorPartida` mantiene `ejecutarComandoJugador`,
`ejecutarAccionJugable` y `procesarResultadoAccion` como fachadas públicas.

## 4. Archivos funcionales aprobados

### Reemplazados

- `src/aplicacion/Aplicacion.js`
- `src/aplicacion/ControladorPartida.js`

### Agregados

- `src/aplicacion/CoordinadorInicioPartida.js`
- `src/aplicacion/CoordinadorTransicionesMapa.js`
- `src/aplicacion/CoordinadorComandosPartida.js`
- `src/aplicacion/ValidacionConfiguracionMapa.js`

### Eliminados

Ninguno.

## 5. Incrementales funcionales aprobados

1. `Dark-Moon-Etapa2-Bloque1-incremental-funcional-v2.zip`
2. `Dark-Moon-Etapa2-Bloque2-incremental-funcional.zip`
3. `Dark-Moon-Etapa2-Bloque3-incremental-funcional.zip`

Los tres fueron probados satisfactoriamente por el usuario antes de este cierre.

## 6. Validaciones registradas

| Prueba | Resultado | Estado |
|---|---|---|
| Sintaxis de los archivos productivos modificados | Correcta | Correcto |
| Inicio desde guardado y nuevo personaje con dobles controlados | Contratos y orden de limpieza conservados | Correcto |
| Transición normal y recuperación de carga fallida | Token, Loading, progreso y recuperación conservados | Correcto |
| Validación de configuración de mapa | Un único contrato y rechazo de mapa inválido | Correcto |
| Interacción orientada y confirmación de habilidad | Resultado canónico, orientación y redibujado conservados | Correcto |
| Auditoría del contenido de cada ZIP funcional | Rutas y archivos completos contrastados | Correcto |
| Pruebas manuales funcionales | Aprobadas explícitamente por el usuario | Correcto |

Las pruebas manuales se registran como validadas por el usuario. No se
atribuyen al asistente pruebas visuales o de juego que no ejecutó.

## 7. Compatibilidad e impacto

- **Web:** compatible; no se agregan dependencias ni cambia el punto de
  entrada `game.js`.
- **Electron:** compatible; no se modifica Electron ni se lo vuelve requisito
  de la versión web.
- **Persistencia:** sin cambio de formato ni de dueño. El guardado se sigue
  limpiando al confirmar un personaje nuevo y se elimina al producirse la
  derrota.
- **Combate, balance y modificadores:** sin cambio de ecuaciones, objetivos ni
  orden de resolución.
- **Interfaz y Phaser:** sin cambio visual ni de tecnología de renderizado.

## 8. Riesgos y pendientes

- No hay riesgo funcional conocido dentro del alcance aprobado tras las
  pruebas manuales del usuario.
- Los coordinadores nuevos deben seguir recibiendo contexto desde
  `ControladorPartida`; no deben guardar una copia de `Juego`, `EstadoPartida`
  o `GestorMapasPartida`.
- La etapa 3 debe analizar combate y estadísticas sin absorber responsabilidades
  de arranque, transiciones o comandos.

## 9. Comprobación de restricciones

- sin motor paralelo de partida, combate o persistencia;
- sin cambio de reglas, balance, contenido ni apariencia;
- sin dependencia nueva;
- sin commit ni push durante la entrega;
- sin archivos productivos en este incremental documental;
- sin presentar validación manual del usuario como ejecución del asistente.

## 10. Conventional Commit propuesto

```text
refactor(aplicacion): ordenar inicio, transiciones y comandos de partida

- extrae la coordinación de nuevo juego y continuar sin alterar guardado ni menú;
- separa Loading, tokenización y recuperación de transiciones de mapa;
- centraliza comandos, habilidades, interacciones y resultados en un coordinador sin estado propio;
- conserva las fachadas públicas de ControladorPartida y el procesador canónico de resultados;
- documenta el plan de limpieza estructural y las pruebas funcionales aprobadas.
```

## 11. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro — Limpieza estructural de Dark Moon.

ETAPA CERRADA:
LIM-2 — ordenamiento de aplicación y partida.

ESTADO:
Cerrada.

COMMIT BASE:
`13978039963e198b98bcc943baedb6375879e58a`

HEAD FINAL VERIFICADO:
`13978039963e198b98bcc943baedb6375879e58a` antes del commit final del usuario.

GIT STATUS FINAL:
La copia auditada conserva ruido heredado de CRLF/LF. Ignorando finales de
línea, la Fase A contiene dos archivos productivos modificados y cuatro
agregados; la Fase B contiene este documento y el Plan Maestro de limpieza
estructural. No hay archivos en staging, commit ni push realizados por el
asistente.

DOCUMENTO DE ENTREGA:
`docs/mantenimiento/entregas/ENTREGA_LIM_2_ORDENAMIENTO_APLICACION_PARTIDA.md`

DOCUMENTOS MAESTROS ACTUALIZADOS:
- `docs/mantenimiento/PLAN_MAESTRO_LIMPIEZA_ESTRUCTURAL_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md` — Sin cambios.

OBJETIVO QUE SE COMPLETÓ:
Separar arranque de partida, transición de mapas y coordinación de comandos
sin cambiar reglas, persistencia, combate, interfaz ni APIs públicas.

ARQUITECTURA HEREDADA:
`Aplicacion` conserva presentación y configuración; `ControladorPartida` es el
único dueño de sesión; los coordinadores reciben contexto/callbacks y no
mantienen un segundo estado de juego. `ProcesadorResultadoAccion` sigue siendo
el único procesador canónico de resultados.

ARCHIVOS CLAVE:
- `src/aplicacion/Aplicacion.js`: arranque, menús, preferencias y fachadas de inicio.
- `src/aplicacion/ControladorPartida.js`: dueño de la sesión y fachada pública.
- `src/aplicacion/CoordinadorInicioPartida.js`: rutas de nuevo juego y continuar.
- `src/aplicacion/CoordinadorTransicionesMapa.js`: Loading y ciclo asíncrono de mapa.
- `src/aplicacion/CoordinadorComandosPartida.js`: entrada, habilidades, interacciones y resultados.
- `src/aplicacion/ValidacionConfiguracionMapa.js`: contrato único de mapa previo a activación.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- inicio de personaje nuevo y continuación desde guardado;
- ciudad, mazmorra, retorno y recuperación ante carga fallida;
- movimiento, ataque, habilidades, interacción, botín, comercio, muerte y guardado;
- pruebas manuales aprobadas explícitamente por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno conocido dentro de LIM-2.

DECISIONES APROBADAS:
- extraer coordinación por responsabilidad sin crear un segundo estado de partida;
- mantener las APIs públicas de `Aplicacion` y `ControladorPartida`;
- conservar `ProcesadorResultadoAccion` como única resolución de resultados;
- mantener la validación de mapas en un único contrato compartido.

DECISIONES QUE SIGUEN ABIERTAS:
- alcance interno concreto de LIM-3, a analizar antes de implementar.

SIGUIENTE ETAPA RECOMENDADA:
LIM-3 — descomposición interna de combate y estadísticas.

OBJETIVO DE LA SIGUIENTE ETAPA:
Ordenar `EstadisticasDerivadas`, `SistemaCombate`, `SistemaCombateJugador` y
sus contratos para que daño, impacto, dispersión, defensa y DPT tengan una
única ruta canónica, sin alterar balance ni contratos de modificadores.

PRIMEROS ARCHIVOS A REVISAR:
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/juego/combate/SistemaCombate.js`
- `src/juego/combate/SistemaCombateJugador.js`

NO MODIFICAR SIN NUEVA APROBACIÓN:
- fórmulas canónicas de daño, impacto, dispersión, defensa y DPT;
- contratos de `SistemaModificadoresCombatiente`;
- fuentes persistidas y reglas de guardado;
- contratos de presentación ya cerrados en AUD2;
- responsables de sesión, transición y comandos cerrados en LIM-2.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Cada dato de combate y estadística debe tener una única ruta comprobada,
manteniendo resultados equivalentes para los casos de prueba existentes y sin
alterar balance, modificadores ni persistencia.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
`refactor(aplicacion): ordenar inicio, transiciones y comandos de partida`

- extrae la coordinación de nuevo juego y continuar sin alterar guardado ni menú;
- separa Loading, tokenización y recuperación de transiciones de mapa;
- centraliza comandos, habilidades, interacciones y resultados en un coordinador sin estado propio;
- conserva las fachadas públicas de ControladorPartida y el procesador canónico de resultados;
- documenta el plan de limpieza estructural y las pruebas funcionales aprobadas.

----------------- FIN DEL ENLACE -----------------
