# ENTREGA E4.D — Casa del Guerrero expandida

**Estado:** Cerrada

## 1. Base

- Rama: `main`
- Commit base / HEAD antes de implementar: `c28c59478f01010a86512e3c4e32db125d71e725`
- Implementación conjunta aprobada E4.C–E4.F.
- No se realizó commit ni push.
- Dependencias nuevas: ninguna.

## 2. Objetivo

Transformar la Casa del Guerrero en un espacio doméstico y militar reconocible utilizando el mismo modelo canónico de cupos, composiciones y familias configurables de entidades.

## 3. Resultado implementado

Perfiles:

- `dormitorio` — 1–2;
- `cocina_comedor` — 1–2;
- `deposito` — 1–2;
- `entrenamiento` — 1–2;
- `arsenal` — 1–2;
- `despacho` — especial;
- `ambiental` — reserva 1–2.

Variantes reutilizables incorporadas:

- `caja_madera` — recipiente;
- `armario_madera` — recipiente;
- `armero_madera` — recipiente;
- `mesa_madera` — decoración destructible;
- `silla_madera` — decoración destructible;
- `cama_madera` — decoración destructible;
- `estanteria_madera` — decoración destructible;
- `banco_madera` — decoración destructible;
- `soporte_entrenamiento` — decoración destructible.

Las relaciones espaciales se expresan directamente en las grillas. Por ejemplo, mesa y silla se colocan juntas por composición, sin introducir un contrato semántico `mesa+silla`.

Las tablas `domestico` y `arsenal` utilizan contenido ya existente del juego.

El presupuesto de ocupación se ajustó a `25 por 100 casillas`, mínimo `3`, máximo `6`.

## 4. Ambiente

Cada perfil utiliza ajustes de desgaste, manchas y escombros del compositor existente. No se crean objetos visuales falsos ni un compositor específico para Casa.

## 5. Pruebas automáticas

30 generaciones:

- 10 mínimo;
- 10 medio;
- 10 máximo.

Resultado: **30/30 correctas**.

Rangos observados:

- contenido físico dirigido: 12–24;
- enemigos totales: 9–19;
- orientaciones reales: horizontal y vertical;
- slots opcionales materializados: 101.

Se comprobaron además reproducibilidad, cupos, composiciones completas, presupuesto, conectividad, interacción y destrucción mediante los validadores canónicos.

## 6. Validación manual de cierre

El responsable del proyecto informó que las pruebas conjuntas de E4.C, E4.D, E4.E y E4.F fueron **correctas** el **13 de agosto de 2026**.

La aprobación se registra como validación jugable manual global satisfactoria. No se atribuyen resultados individuales que no hayan sido informados explícitamente. No se reportaron regresiones bloqueantes.

Con esta validación se satisface el criterio de cierre específico de E4.D.

## 7. Compatibilidad y persistencia

- **Web / GitHub Pages:** la arquitectura permanece estática, con JSON y assets relativos; las rutas necesarias fueron verificadas durante la implementación.
- **Electron:** no se modificó el contrato Electron ni se introdujeron dependencias nuevas; no se ejecutó Electron porque la copia de trabajo no incluye `node_modules` y la etapa no justificaba instalarlos.
- **Persistencia:** sin cambios de contrato ni de versión de guardado; perfiles, composiciones y población continúan perteneciendo a la expedición generada.

## 8. Riesgos y pendientes

No quedan pendientes bloqueantes conocidos para E4.D.

La auditoría transversal completada con E4.F retiró la estrategia histórica temporal de población: los cinco mapas utilizan perfiles por cupos y composiciones dirigidas bajo el mismo contrato canónico.

## 9. Plan Maestro

E4.D queda con Estado **Cerrada**. El Plan Maestro no registra SHA ni historial de commits.

Objetivo completado: Transformar la Casa del Guerrero en un espacio doméstico y militar reconocible utilizando el mismo modelo canónico de cupos, composiciones y familias configurables de entidades.

## 10. Conventional Commit conjunto propuesto

E4.C, E4.D, E4.E y E4.F se implementaron y validaron sobre un mismo working tree y se cerrarán mediante un único commit. No realizar automáticamente:

```text
feat(mapas): completar composición dirigida de mazmorras expandidas

- migrar Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra al modelo canónico de perfiles por cupos y composiciones dirigidas;
- incorporar contenido funerario, doméstico y militar mediante recipientes, obstáculos y decoraciones configurables reutilizables;
- añadir composiciones horizontales y verticales con slots opcionales y posiciones contra pared respetando presupuesto, tránsito y conectividad;
- reutilizar las familias canónicas y eliminar la ruta histórica temporal de población de destructibles al completar 5/5 mazmorras;
- validar tamaños mínimo, medio y máximo, reproducibilidad, población, interactuables, regresión transversal y pruebas jugables globales;
- actualizar las entregas E4.C–E4.F y marcar las cuatro etapas como Cerradas en el Plan Maestro.
```

## 11. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Mazmorras Expandidas y Contenido Ambiental Jugable de Dark Moon.

ETAPA CERRADA:
E4.D — Casa del Guerrero expandida

ESTADO:
Cerrada

COMMIT BASE:
c28c59478f01010a86512e3c4e32db125d71e725

HEAD FINAL VERIFICADO:
c28c59478f01010a86512e3c4e32db125d71e725

GIT STATUS FINAL:
Cambios conjuntos de E4.C–E4.F presentes y sin commit; no existen cambios ajenos conocidos. La verificación final se realiza con `git -c core.autocrlf=true status`.

DOCUMENTO DE ENTREGA:
docs/mazmorras/entregas/ENTREGA_E4_D.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md — E4.C–E4.F cerradas y deuda temporal de población resuelta
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md — Sin cambios
- docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md — Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Transformar la Casa del Guerrero en un espacio doméstico y militar reconocible utilizando el mismo modelo canónico de cupos, composiciones y familias configurables de entidades.

ARQUITECTURA HEREDADA:
- `GeneradorTerreno` continúa como única fuente canónica de geometría procedural.
- Las cinco mazmorras usan perfiles por cupos y composiciones humanas completas sobre habitaciones existentes.
- Las composiciones consumen el presupuesto canónico antes de contenido opcional y enemigos.
- Las entidades físicas reutilizan exclusivamente las familias canónicas `recipiente`, `obstaculo` y `decoracion`.
- La ruta histórica temporal de población fue eliminada al completar E4.F.

ARCHIVOS CLAVE:
- `src/config/mapas/CasaGuerrero.json`: perfiles, cupos y composiciones domésticas/militares.
- `src/config/entidades/mazmorra/Recipientes.json`: cajas, armarios y armeros configurables.
- `src/config/entidades/mazmorra/Decoraciones.json`: mesas, sillas, camas, estanterías y soportes reutilizables.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se mantienen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 30/30 generaciones del mapa en tamaños mínimo, medio y máximo.
- reproducibilidad, cupos, composiciones H/V, slots opcionales, presupuesto y conectividad validados.
- validación jugable manual conjunta de E4.C–E4.F aprobada por el responsable del proyecto.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno bloqueante conocido para E4.D.

DECISIONES APROBADAS:
- perfiles por cupos y composiciones humanas dirigidas;
- mínimo una composición horizontal y una vertical por perfil;
- slots `?` y posiciones `contraPared`;
- familias genéricas configurables en lugar de clases por objeto visual;
- un único commit final conjunto para E4.C–E4.F.

DECISIONES QUE SIGUEN ABIERTAS:
- Ninguna dentro del alcance de E4.D.

SIGUIENTE ETAPA RECOMENDADA:
E4.E — Fortaleza abandonada expandida

OBJETIVO DE LA SIGUIENTE ETAPA:
Dar a la Fortaleza abandonada una identidad militar de mayor escala, con objetos, barreras, mobiliario y sectores funcionales.

PRIMEROS ARCHIVOS A REVISAR:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md
- src/config/mapas/
- src/juego/generacion/PlanificadorPoblacionMazmorra.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- geometría canónica de `GeneradorTerreno`;
- presupuesto canónico de población;
- movimiento, combate, FOV, IA, botín y persistencia.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
La etapa puede marcarse Cerrada cuando la Fortaleza abandonada posea sectores militares reconocibles, contenido funcional coherente, destructibles y registrables integrados al presupuesto, habitaciones ambientales reservadas y regresión satisfactoria.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(mapas): completar composición dirigida de mazmorras expandidas

- migrar Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra al modelo canónico de perfiles por cupos y composiciones dirigidas;
- incorporar contenido funerario, doméstico y militar mediante recipientes, obstáculos y decoraciones configurables reutilizables;
- añadir composiciones horizontales y verticales con slots opcionales y posiciones contra pared respetando presupuesto, tránsito y conectividad;
- reutilizar las familias canónicas y eliminar la ruta histórica temporal de población de destructibles al completar 5/5 mazmorras;
- validar tamaños mínimo, medio y máximo, reproducibilidad, población, interactuables, regresión transversal y pruebas jugables globales;
- actualizar las entregas E4.C–E4.F y marcar las cuatro etapas como Cerradas en el Plan Maestro.

----------------- FIN DEL ENLACE -----------------
