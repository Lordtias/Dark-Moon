# ENTREGA P6.3C.2A — ZONAS TEMPORALES PERSISTENTES

Fecha: 2026-08-06  
Etapa: P6.3C.2A  
Base obligatoria: `e2e2b859f2e3e25989a73ab057b5f11195e32a0e`  
Rama esperada: `main`

## 1. Objetivo

Incorporar una representación persistente y reutilizable de zonas temporales sin trasladar duración, activadores, daño, objetivos o superposición a Phaser. La primera integración visual corresponde a Nube tóxica, pero el contrato admite futuras zonas de fuego, frío, electricidad y apariencias genéricas.

## 2. Cierre documental de P6.3C.1B

P6.3C.1B fue validada manualmente y cerrada en:

`e2e2b859f2e3e25989a73ab057b5f11195e32a0e`

README, Plan Maestro, Diseño Maestro y `ENTREGA_P6_3_C_1_B.md` se actualizan en esta entrega para reflejar el cierre real.

## 3. Perfiles visuales reutilizables

Se incorpora `PerfilesZonasTemporalesVisuales.json` con perfiles declarativos para:

- veneno;
- fuego;
- frío;
- electricidad;
- zona genérica.

Cada perfil define forma, textura, movimiento ambiental, efectos de creación, renovación, activación, entrada y vencimiento, además de colores, opacidad, densidad y medidas visuales. No contiene duración jugable, intervalos, daño ni reglas de objetivo.

## 4. Escena neutral

Cada zona visual transporta:

- ID estable;
- habilidad y grado de origen;
- nombre y apariencia;
- grupo y política de superposición;
- activadores canónicos;
- casillas;
- creación, vencimiento y próxima activación;
- duración y tiempo restante;
- perfil visual ya validado.

Phaser no consulta `Habilidades.json` ni deduce el perfil por el nombre de la habilidad.

## 5. Eventos visuales neutrales

Se agregan:

- `zona_temporal_creada`;
- `zona_temporal_renovada`;
- `zona_temporal_vencida`.

Los eventos canónicos conservan una instantánea suficiente de la zona para reproducir creación, renovación o disipación incluso antes de aplicar la escena final.

## 6. Identidad y reconciliación Phaser

`CompositorMundoPhaser` mantiene:

```text
Map<zonaId, objetoVisualPersistente>
```

La reconciliación:

- crea zonas faltantes;
- actualiza zonas existentes sin duplicarlas;
- elimina zonas ausentes;
- reconstruye la escena autoritativa después de una cancelación;
- destruye movimientos ambientales al retirar una zona;
- limpia zonas anteriores durante cambios de mapa.

La renovación conserva el mismo `zonaId` y la misma instancia persistente.

## 7. Nube tóxica

Cada casilla canónica muestra:

- mancha tóxica baja;
- vapor ondulante;
- burbujas y partículas;
- variación determinista entre casillas;
- opacidad limitada para conservar terreno, entidades y barras legibles.

Las entidades se dibujan por encima de la nube. Las casillas siguen proviniendo del resolutor espacial canónico, por lo que la zona no atraviesa paredes.

## 8. Lanzamiento y activación inicial

La secuencia `zona_conjurada` reproduce:

1. conjuración en el ejecutor;
2. despliegue de vapor en todas las casillas canónicas;
3. resultados iniciales ya resueltos sobre los ocupantes;
4. persistencia de la zona mediante el evento de creación;
5. retorno del ejecutor.

Daño, fallo y Envenenamiento continúan llegando desde el dominio. Las activaciones posteriores por entrada o intervalo se completarán en P6.3C.2B.

## 9. Renovación y vencimiento

Renovar una zona:

- mantiene el mismo objeto persistente;
- actualiza sus datos canónicos;
- muestra una oleada transitoria;
- no crea una segunda nube.

Vencer una zona:

- reduce progresivamente su opacidad;
- destruye la instancia visual;
- se reconcilia contra la escena final sin temporizadores jugables.

## 10. Superposición

Zonas con IDs distintos pueden coexistir y compartir casillas. Cada una conserva su identidad y animaciones. La opacidad base de los perfiles está limitada para evitar una superficie completamente opaca.

Las reglas que determinan si una zona renueva, reemplaza o permite superposición siguen perteneciendo a `SistemaZonasTemporales`.

## 11. Canvas 2D

Canvas 2D reemplaza los rectángulos de depuración por una nube simple compuesta por manchas, vapor y partículas. También muestra pulsos breves para creación, renovación y vencimiento.

No intenta replicar todas las animaciones ambientales de Phaser.

## 12. Archivos nuevos

- `src/config/presentacion/PerfilesZonasTemporalesVisuales.json`
- `src/interfaz/graficos/ContextoPerfilesZonasTemporalesVisuales.js`
- `src/interfaz/graficos/ValidadorPerfilesZonasTemporalesVisuales.js`
- `src/interfaz/graficos/phaser/CreadorZonasTemporalesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P6_3_C_2_A.md`

## 13. Archivos modificados principales

- `src/aplicacion/Aplicacion.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/zonas/SistemaZonasTemporales.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- documentación general de Phaser.

## 14. Exclusiones

Esta entrega no completa todavía:

- activaciones posteriores `al_entrar`;
- activaciones posteriores `por_intervalo`;
- propagación genérica de todos los eventos derivados de esas activaciones;
- daño y estados de entrada o intervalo;
- derrotas producidas por activaciones posteriores;
- habilidades avanzadas;
- zonas de enemigos o NPC nuevas;
- sonidos.

## 15. Validaciones técnicas

- validación del nuevo catálogo de cinco perfiles;
- sintaxis JavaScript;
- JSON completo;
- imports relativos;
- creación canónica con instantánea visual;
- renovación conservando el mismo ID;
- vencimiento transportando la zona retirada;
- planificación de eventos de creación, renovación y vencimiento;
- construcción y destrucción de movimientos ambientales;
- reconciliación estática y cancelación;
- `git diff --check`;
- integridad de ZIP completo e incremental.

## 16. Pruebas manuales sugeridas

1. Crear Nube tóxica grado 1.
2. Crear Nube tóxica grado 3 y comprobar radio 2.
3. Verificar vapor en todas las casillas vacías.
4. Confirmar que paredes recortan la zona.
5. Confirmar que las entidades y barras se leen por encima.
6. Lanzar nuevamente sobre exactamente las mismas casillas.
7. Verificar que la zona no se duplica y muestra renovación.
8. Crear dos zonas con casillas diferentes.
9. Superponer parcialmente ambas.
10. Esperar el vencimiento y comprobar la disipación.
11. Cancelar durante creación o renovación.
12. Cambiar de mapa con una zona activa.
13. Verificar Canvas 2D.
14. Confirmar que duración, intervalos y daño no cambiaron.

## 17. Cierre manual registrado

P6.3C.2A fue validada manualmente y cerrada en:

`4c124b9b45489dba723f9a70848c59d316229e0c`

## 18. Estado Git esperado al entregar

- Rama: `main`.
- HEAD base: `e2e2b859f2e3e25989a73ab057b5f11195e32a0e`.
- Commit realizado: sí.
- SHA de cierre: `4c124b9b45489dba723f9a70848c59d316229e0c`.
- Push realizado: según flujo del usuario.
- GitHub remoto modificado: no.

## 19. Conventional Commit propuesto

```text
feat(phaser): representar zonas temporales persistentes
```

## 20. Próximo paso

P6.3C.2A está cerrada. Continuar con **P6.3C.2B — Activaciones visuales de zonas temporales**.
