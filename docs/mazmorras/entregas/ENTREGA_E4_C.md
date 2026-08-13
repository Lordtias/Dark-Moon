# ENTREGA E4.C — Cementerio expandido

**Estado:** Cerrada

## 1. Base

- Rama: `main`
- Commit base / HEAD antes de implementar: `c28c59478f01010a86512e3c4e32db125d71e725`
- E4.C se implementa dentro de la ejecución conjunta aprobada E4.C–E4.F.
- No se realizó commit ni push.
- Dependencias nuevas: ninguna.

## 2. Objetivo

Dar identidad jugable propia al Cementerio mediante perfiles dirigidos, composiciones funerarias, entidades físicas funcionales y ambiente diferenciado, reutilizando el contrato canónico creado en E4.B.ReestructuraHabitaciones.

## 3. Resultado implementado

Perfiles:

- `cripta` — cupo 1–2;
- `camara_funeraria` — cupo 1–2;
- `osario` — cupo 1–2;
- `capilla` — cupo 1–2;
- `deposito_funerario` — cupo 1–2;
- `tumba_importante` — perfil especial;
- `ambiental` — reserva 1–2.

Cada perfil dispone al menos de una composición horizontal y una vertical. Se utilizan slots opcionales `?` y el aplicador canónico conserva composición completa, conectividad y presupuesto.

Variantes incorporadas y reutilizables:

- `urna_funeraria` — recipiente;
- `ataud_deteriorado` — recipiente;
- `sarcofago_piedra` — recipiente pesado;
- `restos_oseos` — recipiente registrable;
- `lapida_piedra` — obstáculo;
- `pila_huesos` — decoración destructible;
- `banco_madera` — decoración reutilizada.

Las tablas `funerario_basico`, `restos_oseos`, `tumba_importante` y `huesos` utilizan exclusivamente `SistemaBotin` y objetos ya existentes.

El presupuesto de ocupación se ajustó a `25 por 100 casillas`, mínimo `3`, máximo `6`, para permitir las composiciones dirigidas sin crear otra ecuación de capacidad.

## 4. Ambiente

Se agregaron ajustes de decoración por perfil para distinguir cripta, cámara funeraria, osario, capilla, depósito funerario, tumba importante y ambiental mediante las variaciones canónicas de terreno existentes.

Phaser no decide los perfiles: únicamente representa el perfil resuelto por la lógica.

## 5. Pruebas automáticas

Se probaron 30 generaciones del Cementerio:

- 10 en tamaño mínimo;
- 10 en tamaño medio;
- 10 en tamaño máximo.

Resultado: **30/30 correctas**.

Rango observado:

- destructibles/interactuables de composición: 13–25;
- enemigos totales: 11–23;
- orientaciones generadas: horizontal y vertical;
- slots opcionales materializados: 106 en la muestra.

También se comprobaron población, interactuables, presupuesto, conectividad, habitaciones ambientales y reproducibilidad por semilla.

## 6. Validación manual de cierre

El responsable del proyecto informó que las pruebas conjuntas de E4.C, E4.D, E4.E y E4.F fueron **correctas** el **13 de agosto de 2026**.

La aprobación se registra como validación jugable manual global satisfactoria. No se atribuyen resultados individuales que no hayan sido informados explícitamente. No se reportaron regresiones bloqueantes.

Con esta validación se satisface el criterio de cierre específico de E4.C.

## 7. Compatibilidad y persistencia

- **Web / GitHub Pages:** la arquitectura permanece estática, con JSON y assets relativos; las rutas necesarias fueron verificadas durante la implementación.
- **Electron:** no se modificó el contrato Electron ni se introdujeron dependencias nuevas; no se ejecutó Electron porque la copia de trabajo no incluye `node_modules` y la etapa no justificaba instalarlos.
- **Persistencia:** sin cambios de contrato ni de versión de guardado; perfiles, composiciones y población continúan perteneciendo a la expedición generada.

## 8. Riesgos y pendientes

No quedan pendientes bloqueantes conocidos para E4.C.

La auditoría transversal completada con E4.F retiró la estrategia histórica temporal de población: los cinco mapas utilizan perfiles por cupos y composiciones dirigidas bajo el mismo contrato canónico.

## 9. Plan Maestro

E4.C queda con Estado **Cerrada**. El Plan Maestro no registra SHA ni historial de commits.

Objetivo completado: Dar identidad jugable propia al Cementerio mediante contenido funerario funcional y perfiles de habitación diferenciados.

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
E4.C — Cementerio expandido

ESTADO:
Cerrada

COMMIT BASE:
c28c59478f01010a86512e3c4e32db125d71e725

HEAD FINAL VERIFICADO:
c28c59478f01010a86512e3c4e32db125d71e725

GIT STATUS FINAL:
Cambios conjuntos de E4.C–E4.F presentes y sin commit; no existen cambios ajenos conocidos. La verificación final se realiza con `git -c core.autocrlf=true status`.

DOCUMENTO DE ENTREGA:
docs/mazmorras/entregas/ENTREGA_E4_C.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md — E4.C–E4.F cerradas y deuda temporal de población resuelta
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md — Sin cambios
- docs/phaser/PLAN_MAESTRO_MAZMORRAS_INTERFAZ_DARK_MOON.md — Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Dar identidad jugable propia al Cementerio mediante contenido funerario funcional y perfiles de habitación diferenciados.

ARQUITECTURA HEREDADA:
- `GeneradorTerreno` continúa como única fuente canónica de geometría procedural.
- Las cinco mazmorras usan perfiles por cupos y composiciones humanas completas sobre habitaciones existentes.
- Las composiciones consumen el presupuesto canónico antes de contenido opcional y enemigos.
- Las entidades físicas reutilizan exclusivamente las familias canónicas `recipiente`, `obstaculo` y `decoracion`.
- La ruta histórica temporal de población fue eliminada al completar E4.F.

ARCHIVOS CLAVE:
- `src/config/mapas/Cementerio.json`: perfiles, cupos, composiciones y ambiente funerario.
- `src/config/entidades/mazmorra/Recipientes.json`: urnas, ataúdes, sarcófagos y restos registrables configurables.
- `src/config/entidades/mazmorra/Obstaculos.json`: lápidas y rejas reutilizables.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se mantienen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 30/30 generaciones del mapa en tamaños mínimo, medio y máximo.
- reproducibilidad, cupos, composiciones H/V, slots opcionales, presupuesto y conectividad validados.
- validación jugable manual conjunta de E4.C–E4.F aprobada por el responsable del proyecto.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno bloqueante conocido para E4.C.

DECISIONES APROBADAS:
- perfiles por cupos y composiciones humanas dirigidas;
- mínimo una composición horizontal y una vertical por perfil;
- slots `?` y posiciones `contraPared`;
- familias genéricas configurables en lugar de clases por objeto visual;
- un único commit final conjunto para E4.C–E4.F.

DECISIONES QUE SIGUEN ABIERTAS:
- Ninguna dentro del alcance de E4.C.

SIGUIENTE ETAPA RECOMENDADA:
E4.D — Casa del Guerrero expandida

OBJETIVO DE LA SIGUIENTE ETAPA:
Transformar la Casa del Guerrero en un espacio doméstico y militar reconocible donde los objetos físicos tengan función jugable.

PRIMEROS ARCHIVOS A REVISAR:
- docs/mazmorras/PLAN_MAESTRO_MAZMORRAS_EXPANDIDAS.md
- src/config/mapas/
- src/juego/generacion/PlanificadorPoblacionMazmorra.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- geometría canónica de `GeneradorTerreno`;
- presupuesto canónico de población;
- movimiento, combate, FOV, IA, botín y persistencia.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
La etapa puede marcarse Cerrada cuando la Casa del Guerrero se lea como un lugar habitado y funcional, sus objetos físicos posean comportamiento coherente, los perfiles respeten presupuesto y tránsito, las habitaciones ambientales estén preservadas y el mapa supere la regresión correspondiente.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(mapas): completar composición dirigida de mazmorras expandidas

- migrar Cementerio, Casa del Guerrero, Fortaleza abandonada y Sala de guerra al modelo canónico de perfiles por cupos y composiciones dirigidas;
- incorporar contenido funerario, doméstico y militar mediante recipientes, obstáculos y decoraciones configurables reutilizables;
- añadir composiciones horizontales y verticales con slots opcionales y posiciones contra pared respetando presupuesto, tránsito y conectividad;
- reutilizar las familias canónicas y eliminar la ruta histórica temporal de población de destructibles al completar 5/5 mazmorras;
- validar tamaños mínimo, medio y máximo, reproducibilidad, población, interactuables, regresión transversal y pruebas jugables globales;
- actualizar las entregas E4.C–E4.F y marcar las cuatro etapas como Cerradas en el Plan Maestro.

----------------- FIN DEL ENLACE -----------------
