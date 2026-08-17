# ENTREGA HP4 — Modificadores internos de habilidades, auras y maldiciones

## 1. Estado de la etapa

**Estado:** Cerrada.

HP4 quedó implementada sobre el cierre confirmado de HP3. La validación estructural, de configuración, contratos, referencias y rutas fue completada y las pruebas manuales finales fueron superadas y aprobadas por el usuario, incluido el refresco centralizado de valores derivados mediante un único observador canónico. La etapa queda cerrada y lista para el commit final del usuario.

El asistente no realizó commit ni push.

---

## 2. Repositorio verificado

- Ruta de trabajo: `/mnt/data/hp4_work/Dark-Moon`
- Rama: `main`
- Commit base / cierre confirmado de HP3: `f5e810d51172cd12b4063b40e0cdd0a90cdef646`
- HEAD durante la implementación: `f5e810d51172cd12b4063b40e0cdd0a90cdef646`
- `origin/main` inicial: `f5e810d51172cd12b4063b40e0cdd0a90cdef646`
- Estado inicial: limpio.
- Commit/push realizados por el asistente: **No**.

La etapa parte directamente del ZIP de HP3 confirmado por el usuario.

---

## 3. Alcance aprobado

HP4 debía:

1. auditar exhaustivamente los parámetros internos reales de las habilidades activas;
2. documentar tanto los atributos/contextos heredados de HP3 como los incorporados en HP4;
3. acompañar los atributos nuevos de código con comentarios que expliquen claramente su significado;
4. mantener `SistemaModificadoresCombatiente` como único intérprete/compositor de modificadores;
5. resolver una configuración efectiva única por ejecución, evitando que cada consumidor interprete modificadores de forma independiente;
6. agregar las operaciones matemáticas que el juego realmente necesita, en vez de dejar cálculos paralelos fuera del centralizador;
7. convertir auras y maldiciones en contenido jugable real;
8. integrar Resistencia Mental y reutilizar Sabiduría como atributo base de su progresión;
9. implementar Ceguera como límite de Percepción a una casilla, sin modificar alcance de ataque o habilidad;
10. integrar Silencio como Maldición que bloquea habilidades activas pero permite ataques con arma;
11. hacer explícito por efecto cómo escala Potencia de Efectos, preservando el balance actual;
12. incorporar dieciséis pasivas mágicas que ejerciten el contrato de atributos internos;
13. incorporar cuatro auras mágicas elementales, doce maldiciones, ocho auras de arma y cuatro auras defensivas;
14. conservar sin migración los esquemas actuales de persistencia porque el nuevo estado es derivado/temporal;
15. eliminar compatibilidades viejas alcanzadas por la etapa, sin wrappers;
16. documentar decisiones futuras, campos reservados y variables deliberadamente excluidas;
17. mantener `cantidadProyectiles` y `maximoProyectilesSimultaneos` destacados como candidatos de corto plazo para habilidades de arco;
18. no introducir dependencias nuevas, motores paralelos ni lógica por nombre visible.

---

## 4. Resumen sencillo

HP4 amplía el mismo motor central de HP2/HP3 para que una habilidad activa también pueda recibir modificadores antes de ejecutarse.

El flujo final es:

```text
Habilidades.json
        ↓
configuración base del grado
        ↓
ConfiguracionHabilidadEfectiva
        ↓
SistemaModificadoresCombatiente
        ↓
snapshot efectivo único
        ↓
selección / Maná / tiempo / geometría / daño / efectos / zonas
```

No existe `SistemaModificadoresHabilidad`.

Las auras/maldiciones reutilizan el sistema temporal:

```text
SistemaEfectosTemporales
→ existencia, duración, renovación y expiración

CoordinadorTiempoPartida
→ relación espacial móvil de auras

SistemaModificadoresCombatiente
→ composición numérica final
```

No existe `SistemaAuras` ni `SistemaMaldiciones`.

---

## 5. Objetivos nuevos del centralizador

HP4 agrega únicamente dos objetivos de habilidad:

### `danoHabilidad`

Representa el daño base interno de una habilidad antes del escalado mágico, crítico y defensas.

Permite distinguir mediante contexto:

- maestría;
- habilidad;
- tipo de daño;
- impacto directo;
- daño periódico;
- daño producido por zona.

### `atributoHabilidad`

Representa un atributo interno numérico de una habilidad.

No acepta strings libres. Todo modificador debe declarar `atributoHabilidad` y la clave debe existir en el registro canónico de `ContratosAtributosHabilidad.js`.

Ejemplo:

```text
objetivo       = atributoHabilidad
atributo       = radioImpacto
operación      = sumar
valor          = 1
```

---

## 6. Atributos internos productivos de HP4

Los dieciocho atributos productivos quedan documentados también en código con comentarios de significado:

| Atributo | Significado |
|---|---|
| `costoMana` | Maná consumido por una ejecución confirmada |
| `costoTemporal` | coste temporal base propio de la habilidad antes de factores generales |
| `alcance` | distancia máxima de selección inicial |
| `radioImpacto` | radio de una forma de impacto radial |
| `longitudLinea` | longitud de una forma lineal |
| `anchoLinea` | ancho de una forma lineal |
| `cantidadObjetivos` | máximo de objetivos distintos de una cadena |
| `alcanceSalto` | distancia máxima entre saltos consecutivos |
| `factorDanioPorSalto` | multiplicador de daño aplicado de un salto al siguiente |
| `probabilidadEfecto` | probabilidad base de aplicación de un efecto |
| `duracionEfecto` | duración de una instancia de efecto temporal |
| `intervaloEfecto` | intervalo entre ticks de un efecto periódico |
| `maximoAcumulacionesEfecto` | máximo de acumulaciones/intensidad permitido por el efecto |
| `incrementoAcumulacionEfecto` | incremento aportado por una nueva aplicación |
| `magnitudModificadorEfecto` | valor numérico aportado por un efecto modificador |
| `duracionZona` | duración total de una zona temporal |
| `intervaloZona` | intervalo de activación/tick de una zona |
| `radioAura` | radio de emisión móvil de una aura |

Todos terminan en `SistemaModificadoresCombatiente` mediante `atributoHabilidad`.

---

## 7. Atributos/contexto heredados de HP3 documentados

HP3 había incorporado contexto necesario para pasivas físicas. HP4 lo conserva y lo documenta explícitamente en código:

| Contexto | Significado |
|---|---|
| `tipoCombatiente` | clase funcional del actor que resuelve el valor |
| `familiaArma` | familia del arma principal de la resolución |
| `familiaSecundaria` | familia del objeto equipado en la fuente secundaria |
| `mano` | principal/secundaria dentro del ataque |
| `tipoAtaque` | tipo canónico de ataque físico |
| `esAtaqueDual` | indica si la resolución corresponde a dual wield |
| `categoriaArmadura` | ligera/media/pesada/mixta según las cinco piezas corporales |
| `conjuntoArmaduraCompleto` | indica si las cinco ranuras corporales forman un conjunto completo |

HP4 agrega:

| Contexto | Significado |
|---|---|
| `idHabilidad` | habilidad concreta que se resuelve |
| `maestriaHabilidad` | maestría de la habilidad |
| `tipoObjetivoHabilidad` | propio/enemigo/casilla |
| `formaImpactoHabilidad` | individual/radio/cadena/línea |
| `atributoHabilidad` | atributo interno concreto que se resuelve |
| `tipoDanioHabilidad` | tipo de daño del componente actual |
| `faseHabilidad` | impacto directo, efecto periódico o zona |
| `efectoIdHabilidad` | efecto temporal asociado |
| `tipoEfectoHabilidad` | tipo temporal asociado |
| `objetivoModificadorEfecto` | estadística modificada por el descriptor de un efecto |

Una clave desconocida falla explícitamente.

---

## 8. Campos reservados a corto plazo

No se activan sin consumidor real, pero quedan destacados como candidatos cercanos —especialmente para habilidades de Arco—:

### `cantidadProyectiles`

Cantidad de proyectiles generados por una única ejecución.

Casos previstos:

- Disparo múltiple;
- abanico de flechas;
- disparos simultáneos.

### `maximoProyectilesSimultaneos`

Máximo de proyectiles pertenecientes a una misma fuente que pueden permanecer activos simultáneamente.

Puede ser útil para:

- lluvia de flechas;
- habilidades canalizadas;
- limitar acumulación visual/lógica de proyectiles persistentes.

No forman parte todavía de `ATRIBUTOS_HABILIDAD` productivos: permanecen en el registro de corto plazo.

---

## 9. Estructura deliberadamente fuera del motor numérico

HP4 no permite transformar mediante modificadores numéricos:

- tipo de objetivo;
- patrón de ataque;
- requerimiento de línea de visión;
- hostilidad;
- tipo de forma de impacto;
- orientación;
- políticas de obstáculos;
- tipo elemental/físico estructural;
- activadores de zona;
- política de superposición;
- apariencia;
- bloqueo estructural de visión/movimiento;
- perfiles de aplicación;
- grupo de acumulación.

Una futura habilidad transformativa deberá diseñar un contrato específico; no se introduce una operación genérica de reemplazo arbitrario de strings/booleanos.

---

## 10. Operaciones canónicas finales de HP4

El centralizador admite ocho operaciones:

1. `sumar`;
2. `porcentaje_base`;
3. `porcentaje_total`;
4. `porcentaje_multiplicativo`;
5. `porcentaje_inverso`;
6. `multiplicar_redondear`;
7. `multiplicar`;
8. `limitar_maximo`.

### Nuevas en HP4

`porcentaje_multiplicativo`
: representa porcentajes de tipo «más/menos» que se multiplican entre sí.

`porcentaje_inverso`
: representa incrementos/reducciones de velocidad sobre una magnitud expresada como tiempo/coste. Por ejemplo +20% velocidad equivale a dividir el tiempo por 1,20.

`limitar_maximo`
: impone un techo al resultado. Ceguera la necesita para garantizar Percepción máxima 1 sin ramas especiales.

Los nombres históricos reservados `multiplicarMas` y `aumentarVelocidad` desaparecen; los afijos todavía inactivos que expresaban esas semánticas pasan a usar los nombres canónicos.

---

## 11. Configuración efectiva y snapshot

`ConfiguracionHabilidadEfectiva.js` genera un snapshot derivado para una ejecución/vista previa.

Resuelve mediante el centralizador:

- Maná;
- tiempo;
- alcance;
- geometría;
- daño;
- efectos;
- acumulaciones;
- zona;
- radio de aura.

El snapshot:

- no modifica `Habilidades.json`;
- no se persiste;
- se congela;
- se reutiliza por los consumidores de esa ejecución.

Una zona/efecto ya creado conserva sus parámetros resueltos; las defensas del objetivo continúan consultándose dinámicamente.

---

## 12. Resistencia Mental

HP4 activa `resistenciaMental` como estadística funcional.

Base heredada:

```text
resistenciaMentalBase
+ 2 × Sabiduría
```

Luego:

```text
SistemaModificadoresCombatiente
→ clamp 0–75
```

Todas las Maldiciones usan:

```text
probabilidadFinal = probabilidadBase × (1 - resistenciaMental / 100)
```

Resistencia Mental solo reduce la probabilidad de aplicación. Una Maldición que entra conserva la potencia configurada de su grado.

HP5 queda autorizado a analizar dónde mostrar Resistencia Mental en Personaje.

---

## 13. Ceguera

Ceguera implementa exactamente el diseño aprobado:

```text
percepcion
→ limitar_maximo 1
```

- no modifica `alcanceAtaque`;
- no modifica el atributo `alcance` de habilidades;
- los tres grados mantienen el mismo límite de Percepción;
- los grados mejoran probabilidad y duración;
- el alcance de lanzamiento permanece constante en los tres grados;
- permite cortar visión/persecución de enemigos y habilitar desenganche/reposicionamiento.

Valores:

| Grado | Probabilidad base | Duración | Percepción máxima |
|---:|---:|---:|---:|
| 1 | 50% | 3 turnos | 1 |
| 2 | 65% | 5 turnos | 1 |
| 3 | 80% | 7 turnos | 1 |

---

## 14. Silencio

El efecto `silencio` existente se reutiliza, sin crear una implementación paralela.

Como Maldición:

- usa Resistencia Mental;
- bloquea habilidades activas;
- permite movimiento;
- permite espera;
- permite ataques con arma;
- puede existir sobre cualquier combatiente.

Grados:

| Grado | Probabilidad base | Duración |
|---:|---:|---:|
| 1 | 40% | 2 turnos |
| 2 | 55% | 3 turnos |
| 3 | 70% | 4 turnos |

Cualquier consumidor futuro de habilidades enemigas debe consultar el mismo bloqueo temporal.

---

## 15. Potencia de Efectos

Se elimina la decisión rígida por tipo de efecto.

Cada efecto declara explícitamente `escaladoPotencia`:

- `ninguna`;
- `valor`;
- `duracion`;
- `valor_y_duracion`.

Para preservar el balance existente:

- Envenenamiento: `valor`;
- Quemadura: `valor`;
- resto del contenido actual: `ninguna`;
- Auras iniciales: `ninguna`;
- Maldiciones iniciales: `ninguna`.

Por lo tanto Veneno y Quemadura continúan escalando su daño; HP4 solo elimina la excepción codificada por tipo.

---

## 16. Efectos temporales genéricos

El tipo viejo `modificador_factor` fue eliminado.

Se utiliza:

```text
modificador_combatiente
```

para cualquier efecto temporal que aporte descriptores al centralizador.

Ralentización, Electrización, Auras, Maldiciones y futuros buffs/debuffs numéricos pueden compartir el mismo contrato.

No queda wrapper del tipo anterior.

---

## 17. Auras móviles

Una Aura no se representa como zona estática.

Se modela como efecto temporal en el emisor con:

- duración;
- radio;
- relación `aliados/enemigos/todos`;
- modificadores;
- condiciones del emisor cuando corresponda.

El `CoordinadorTiempoPartida` consulta la posición real de emisor/receptor. Al moverse el emisor, la Aura se mueve con él.

La misma Aura reaplicada por el mismo emisor renueva. La misma Aura proveniente de emisores distintos aporta fuentes distintas y puede acumularse.

Las Auras físicas verifican dinámicamente el equipamiento requerido. Si el emisor deja de cumplirlo, deja de aportar el modificador aunque la instancia temporal todavía exista.

---

## 18. Catálogo de dieciséis pasivas mágicas

### Fuego

| Pasiva | Requisito | Efecto |
|---|---:|---|
| Afinidad ígnea | 2 | +10% daño de habilidades de Fuego |
| Ascua eficiente | 4 | Ascua -1 Maná |
| Detonación expansiva | 7 | Explosión ígnea +1 radio |
| Combustión persistente | 9 | Quemadura de Incinerar +1 turno |

### Frío

| Pasiva | Requisito | Efecto |
|---|---:|---|
| Afinidad glacial | 2 | +10% daño de habilidades de Frío |
| Esquirla persistente | 4 | Ralentización de Esquirla +1 turno |
| Nova expansiva | 7 | Nova de escarcha +1 radio |
| Congelación profunda | 9 | Ráfaga glacial +15 puntos de probabilidad de Congelamiento |

### Rayo

| Pasiva | Requisito | Efecto |
|---|---:|---|
| Afinidad tormentosa | 2 | +10% daño de habilidades de Rayo |
| Chispa fulminante | 4 | Chispa +10% velocidad de lanzamiento |
| Conducción múltiple | 7 | Cadena de rayos +1 objetivo máximo |
| Descarga extendida | 9 | Descarga fulminante +1 longitud de línea |

### Veneno

| Pasiva | Requisito | Efecto |
|---|---:|---|
| Afinidad tóxica | 2 | +10% daño derivado de habilidades de Veneno |
| Toxina persistente | 4 | Envenenamiento de Aguijón tóxico +1 turno |
| Nube persistente | 7 | Nube tóxica +2 turnos de duración |
| Plaga voraz | 9 | Plaga corrosiva +1 acumulación máxima |

Las dieciséis son de un grado y se expresan mediante descriptores declarativos; ninguna introduce una rama por ID de pasiva.

---

## 19. Magia — Auras elementales y Maldiciones

### Fuego

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Manto Ígneo | 0 | 3 | Res. Fuego +10/+15/+20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Ígnea | 0 | 3 | Res. Fuego -10/-15/-20 | 70/80/90%; 10 turnos |
| Exposición | 3 | 3 | Armadura base -8/-12/-18% | 70/80/90%; 5/7/10 turnos |
| Debilidad | 6 | 3 | daño de ataques/habilidades -5/-8/-12% | 70/80/90%; 5/7/10 turnos |

### Frío

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Velo Glacial | 0 | 3 | Res. Frío +10/+15/+20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Glacial | 0 | 3 | Res. Frío -10/-15/-20 | 70/80/90%; 10 turnos |
| Lentitud | 3 | 3 | movimiento ×1,10/1,15/1,20; ataque ×1,05/1,08/1,10 | 70/80/90%; 5/7/10 turnos |
| Ceguera | 6 | 3 | Percepción máxima 1 | 50/65/80%; 3/5/7 turnos |

### Rayo

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Égida de Tormenta | 0 | 3 | Res. Rayo +10/+15/+20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Eléctrica | 0 | 3 | Res. Rayo -10/-15/-20 | 70/80/90%; 10 turnos |
| Torpeza | 3 | 3 | Precisión -4/-6/-8 | 70/80/90%; 5/7/10 turnos |
| Silencio | 6 | 3 | bloquea habilidades activas | 40/55/70%; 2/3/4 turnos |

### Veneno

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Velo Antitóxico | 0 | 3 | Res. Veneno +10/+15/+20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Tóxica | 0 | 3 | Res. Veneno -10/-15/-20 | 70/80/90%; 10 turnos |
| Marchitamiento | 3 | 3 | regen Vida/Maná -0,5/-0,75/-1 | 70/80/90%; 5/7/10 turnos |
| Supresión | 6 | 3 | Potencia Habilidad -5/-10/-15; Potencia Efectos -3/-6/-10 | 70/80/90%; 5/7/10 turnos |

Las cuatro Auras elementales duran diez turnos, radio 2, afectan aliados e incluyen al propio emisor. Sus costes de Maná son 3/4/5.

Todas las Maldiciones usan Resistencia Mental.

---

## 20. Auras de Armas

Todas tienen tres grados, requisito de maestría 4, duración 10 turnos, radio 2, coste 0 Maná y coste de acción 100. Requieren la familia correspondiente.

| Maestría | Aura | Grado 1 | Grado 2 | Grado 3 |
|---|---|---|---|---|
| Dagas | Aura de Celeridad | movimiento/ataque +4% velocidad | +7% | +10% |
| Espadas | Aura de Disciplina | Precisión +2; Evasión +1 | +4/+2 | +6/+3 |
| Hachas | Aura de Furia | daño +5%; crítico +1 | +10%/+2 | +15%/+3 |
| Mandobles | Aura de Ímpetu | daño +6%; Armadura base +5% | +12%/+10% | +18%/+15% |
| Lanzas | Aura de Vigilancia | Percepción +1 | +2 | +3 |
| Arcos | Aura de Precisión | Precisión +3 | +5 | +8 |
| Bastones | Aura de Recuperación | regen Vida/Maná +0,25 | +0,5 | +1 |
| Varitas | Aura de Enfoque | Potencia Habilidad +5; Efectos +3 | +10/+6 | +15/+10 |

---

## 21. Auras de Armaduras y Escudos

| Maestría | Aura | Grado 1 | Grado 2 | Grado 3 | Condición |
|---|---|---|---|---|---|
| Ligera | Aura de Agilidad | Evasión +2; movimiento +3% | +4/+5% | +6/+8% | conjunto ligero completo |
| Media | Aura de Resguardo Elemental | resistencias elementales +4 | +7 | +10 | conjunto medio completo |
| Pesada | Aura de Guardia | Armadura base +5% | +10% | +15% | conjunto pesado completo |
| Escudos | Aura de Voluntad | resistencias a efectos +4 y Mental +4 | +7 | +10 | escudo equipado |

El escudo no altera la clasificación de las cinco piezas corporales.

---

## 22. Cantidad de contenido nuevo

HP4 incorpora **44 contenidos aprendibles**:

- 16 pasivas mágicas;
- 4 Auras mágicas elementales;
- 12 Maldiciones;
- 8 Auras de armas;
- 4 Auras de armaduras/escudo.

El catálogo total queda en:

- 104 habilidades de jugador;
- 40 activas;
- 64 pasivas.

No se aumentan puntos de maestría. Tener más inversiones que puntos específicos es una decisión deliberada de construcción; el balance posterior podrá revisar puntos, XP, requisitos, costes y magnitudes sin cambiar el motor.

---

## 23. Presentación y perfiles visuales

No se crean assets gráficos nuevos en HP4.

Se amplían los perfiles canónicos existentes para cubrir:

- las 40 habilidades activas del jugador;
- las 2 habilidades NPC existentes;
- los 35 efectos temporales configurados.

Las nuevas Auras/Maldiciones reutilizan perfiles genéricos y recursos existentes.

La tarjeta de habilidad puede mostrar desde la configuración canónica:

- modificadores principales del aura/maldición;
- probabilidad;
- duración;
- radio de aura;
- bloqueo de habilidades activas para Silencio.

La UI no recalcula los valores.

HP5 conserva la decisión sobre iconografía definitiva.

---

## 24. Afijos reservados y operaciones históricas

HP4 no activa afijos pendientes solamente para hacerlos coincidir con el registro.

Los afijos activos `portador` fueron auditados y sus objetivos pertenecen al centralizador.

Los afijos inactivos/reservados pueden seguir mencionando objetivos futuros deliberadamente no implementados, entre ellos:

- daño físico global;
- daño elemental global;
- atributos primarios;
- rareza/cantidad de objetos encontrados;
- daño/precisión/potencia de hechizos;
- regeneraciones porcentuales.

Esas claves continúan documentadas como futuras y requieren aprobación cuando se activen.

Sí se normalizaron las operaciones antiguas:

- `multiplicarMas` → `porcentaje_multiplicativo`;
- `aumentarVelocidad` → `porcentaje_inverso`.

No quedan wrappers con los nombres anteriores.

---

## 25. Ideas y decisiones futuras preservadas

Quedan documentadas explícitamente en el Plan Maestro:

1. `cantidadProyectiles` y `maximoProyectilesSimultaneos` como candidatos de corto plazo para habilidades de Arco;
2. posible diseño futuro de habilidades transformativas que cambien estructura, separado del resolutor numérico;
3. `precisionHechizos` pendiente porque hoy las habilidades utilizan la Precisión canónica general;
4. daño elemental global pendiente por afectar potencialmente armas y habilidades y requerir decisión transversal;
5. `potenciaAura` pendiente; las Auras iniciales usan magnitud por grado y no una estadística propia;
6. atributos primarios modificables continúan pendientes de decisión explícita;
7. robo de Vida/Maná, hallazgo de objetos y otros afijos reservados continúan fuera hasta aprobar consumidor/balance;
8. una futura habilidad de curación cuantitativa requiere su propio consumidor canónico; las habilidades NPC actuales de recuperación completa siguen estructurales;
9. las magnitudes/costes/XP/puntos de los 44 contenidos de HP4 requieren una futura etapa/pasada de balance, sin cambiar la arquitectura;
10. HP5 debe mostrar Potencia de Habilidad, analizar si la sección se llama Magia/Habilidades, decidir presentación de Resistencia Mental, mostrar ámbito de afijo y diseñar iconografía definitiva de pasivas;
11. HP5 puede evaluar iconografía propia para Auras/Maldiciones, que HP4 deja con recursos genéricos;
12. cualquier futuro enemigo que use habilidades activas debe consultar el mismo bloqueo de Silencio;
13. el contenido futuro puede reutilizar Auras/Maldiciones desde habilidades, objetos, NPC u otras fuentes sin crear motores específicos.

---

## 26. Persistencia

HP4 no incrementa los esquemas:

- jugador: v4;
- progreso: v3.

Razón:

- configuración efectiva es derivada;
- efectos temporales son transitorios;
- Auras son efectos temporales;
- Maldiciones son efectos temporales;
- no se persisten resultados calculados.

No se agregan migraciones, parches ni wrappers.

---

## 27. Archivos agregados

- `src/juego/habilidades/ConfiguracionHabilidadEfectiva.js`
- `src/juego/habilidades/ContratosAtributosHabilidad.js`
- `src/juego/estado/ObservadorCambiosEstadoJugador.js`
- `src/interfaz/dom/CoordinadorActualizacionPresentacionDom.js`
- `docs/habilidades/entregas/ENTREGA_HP4.md`

---

## 28. Archivos modificados

- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/habilidades/entregas/ENTREGA_HP3.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `src/aplicacion/ControladorPartida.js`
- `src/interfaz/dom/PresentacionMapaActivoDom.js`
- `src/interfaz/habilidades/IntegracionHabilidadesDom.js`
- `src/config/habilidades/Habilidades.json`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/config/magia/Efectos.json`
- `src/config/objetos/afijos/Prefijos.json`
- `src/config/objetos/afijos/Sufijos.json`
- `src/config/presentacion/PerfilesEstadosTemporalesVisuales.json`
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/herramientas/balance/AnalizadorBalanceCombate.js`
- `src/herramientas/balance/AnalizadorBalanceEfectos.js`
- `src/herramientas/balance/AnalizadorBalanceRegresion.js`
- `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
- `src/juego/efectos/CatalogoEfectos.js`
- `src/juego/efectos/ContratosEfectosTemporales.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/juego/habilidades/GeometriaHabilidades.js`
- `src/juego/habilidades/MotorEfectosHabilidad.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`
- `src/juego/magia/CalculadorAtributosMagicos.js`
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/modificadores/SistemaModificadoresCombatiente.js`
- `src/juego/tiempo/CoordinadorTiempoPartida.js`

## 29. Archivos eliminados

- `src/juego/habilidades/ObservadorProgresoHabilidades.js`

El observador específico de progreso fue retirado al canonizar `ObservadorCambiosEstadoJugador` como único canal de invalidación de presentación derivada. No se dejó wrapper.

---

## 30. Dependencias

Nuevas dependencias: **Ninguna**.

No se modifican:

- Phaser;
- Electron;
- Node/npm;
- `package.json`;
- `package-lock.json`.

No hay instrucciones de instalación/desinstalación adicionales.

---

## 31. Compatibilidad web

La etapa conserva ES Modules, JSON y rutas web existentes.

Se comprobó por servidor HTTP local que responden con `200`:

- `/index.html`;
- `/src/juego/habilidades/ConfiguracionHabilidadEfectiva.js`;
- `/src/juego/habilidades/ContratosAtributosHabilidad.js`;
- `/src/config/habilidades/Habilidades.json`;
- `/src/config/magia/Efectos.json`.

La ejecución interactiva completa queda pendiente de la prueba manual del usuario.

---

## 32. Compatibilidad Electron

No se modifica `electron/main.js`, preload ni configuración de aislamiento.

La arquitectura sigue utilizando el mismo contenido web.

Electron no fue ejecutado independientemente en este entorno; no se declara esa prueba como superada.

---

## 33. Validación estructural realizada

### JSON

- 38 JSON parseados correctamente.

### Imports

- 756 imports relativos auditados;
- 0 rutas faltantes.

### Contratos

- 32 objetivos canónicos registrados;
- 8 operaciones canónicas;
- 18 claves de contexto;
- 18 atributos productivos de habilidad;
- 2 atributos reservados a corto plazo.

### Contenido

- 104 habilidades del jugador;
- 40 activas;
- 64 pasivas;
- 44/44 contenidos nuevos aprobados presentes;
- 303 descriptores de modificador de habilidades auditados contra objetivo/operación/contexto/atributo;
- 117 referencias desde habilidades hacia efectos verificadas contra el catálogo.

### Efectos

- 35 efectos temporales;
- 12/12 Maldiciones usan Resistencia Mental;
- Envenenamiento y Quemadura usan `escaladoPotencia = valor`;
- el resto del contenido actual usa `ninguna`, preservando el balance acordado.

### Ceguera

Los tres grados verifican:

- alcance de lanzamiento constante 4;
- probabilidad 50/65/80;
- duración 300/500/700;
- `percepcion limitar_maximo 1`.

### Perfiles visuales

- 42 perfiles de habilidad, exactamente las 40 activas del jugador + 2 NPC;
- 35 perfiles de estados, exactamente el catálogo de 35 efectos.

### Idiomas

- ES: cobertura de las 104 habilidades del jugador y 35 efectos;
- EN: cobertura de las 104 habilidades del jugador y 35 efectos.

### Afijos

- 12 efectos activos de ámbito `portador` auditados contra objetivos/operaciones vigentes;
- afijos reservados/inactivos separados de la validación productiva y mantenidos como decisiones futuras;
- operaciones históricas retiradas.

### Higiene

No aparecen en `src`:

- `modificador_factor`;
- `MODIFICADOR_FACTOR`;
- `procesarEfectosPendientes`;
- `aumentarVelocidad`;
- `multiplicarMas`;
- nombres productivos `HP0`, `HP1`, etc.

No existen archivos `.patch`, `.mjs`, `.tmp` o `.bak` creados por HP4.

`git diff --check`: **Correcto**.

---

## 34. Pruebas no declaradas como realizadas

No se declara como superada todavía la regresión interactiva del juego.

Quedan pendientes de usuario:

- aprender/equipar pasivas nuevas;
- lanzar Auras;
- comprobar emisión móvil y expiración;
- aplicar Maldiciones;
- comprobar Resistencia Mental;
- Ceguera sobre enemigos y pérdida de visión;
- Silencio;
- regresión de habilidades antiguas;
- guardado/carga normal;
- consola sin errores durante la pasada.

---

## 35. Pruebas manuales básicas propuestas

### A. Pasivas mágicas representativas

1. **Ascua eficiente**: comparar coste de Maná antes/después; debe bajar exactamente 1.
2. **Detonación expansiva**: Explosión ígnea debe ganar +1 radio.
3. **Chispa fulminante**: debe reducir el tiempo de lanzamiento mediante +10% velocidad, no mediante una resta de tiempo incorrecta.
4. **Conducción múltiple**: Cadena de rayos debe admitir un objetivo adicional.
5. **Nube persistente**: Nube tóxica debe durar dos turnos más.
6. **Plaga voraz**: debe aumentar en uno el máximo de acumulaciones.

### B. Aura mágica elemental

1. aprender Manto Ígneo;
2. comprobar Resistencia a Fuego;
3. lanzar el Aura;
4. la Resistencia debe subir según grado;
5. debe durar diez turnos;
6. al expirar debe volver exactamente al valor anterior.

### C. Aura física

1. aprender Aura de Guardia;
2. equipar cinco piezas pesadas;
3. lanzar el Aura y verificar Armadura;
4. quitar una pieza pesada mientras el Aura sigue vigente;
5. el aporte debe dejar de aplicarse sin necesitar eliminar manualmente la instancia temporal.

También puede probarse un aura de arma y cambiar el arma requerida durante su duración.

### D. Maldición elemental

1. aplicar Vulnerabilidad Ígnea a un enemigo;
2. comprobar que la resistencia correspondiente baja mientras el efecto permanece;
3. esperar expiración y verificar restauración automática.

### E. Ceguera

1. aplicar Ceguera a un enemigo;
2. confirmar que su Percepción queda limitada a 1;
3. alejarse más de una casilla;
4. comprobar que pierde visión/contacto según la IA actual;
5. confirmar que no se altera el alcance de armas/habilidades.

### F. Silencio

Aplicar Silencio a un combatiente con habilidades activas:

- habilidad activa: bloqueada;
- movimiento: permitido;
- espera: permitida;
- ataque con arma: permitido;
- tras expirar: habilidades nuevamente disponibles.

### G. Resistencia Mental

Comparar dos objetivos con diferente Resistencia Mental usando la misma Maldición. La resistencia debe reducir únicamente la probabilidad de aplicación, no el valor del debuff una vez aplicado.

### H. Regresión

- una habilidad de cada afinidad antigua;
- un efecto periódico (Veneno o Quemadura);
- una ralentización/electrización existente;
- movimiento y ataque físico;
- guardar/cargar;
- consola sin errores.

---

## 36. Riesgos pendientes

### Balance

Los valores de los 44 contenidos nuevos son balance inicial aprobado. La arquitectura permite ajustar JSON posteriormente sin cambiar motores.

### Densidad de progresión

Las maestrías ahora ofrecen más inversiones que puntos específicos. Es deliberado para permitir builds; una futura pasada de balance puede revisar puntos/requisitos.

### Presentación

HP5 debe absorber la densidad real de habilidades, pasivas, Auras, Maldiciones, Resistencia Mental y desgloses sin recalcular datos.

### Habilidades enemigas

Silencio ya es genérico sobre el combatiente, pero cualquier futura ruta de ejecución de habilidades enemigas debe consultar el mismo bloqueo temporal.

### Campos futuros

Los atributos reservados y afijos inactivos no deben activarse sin consumidor canónico y aprobación.

---

## 37. Comprobación de restricciones

- un solo `SistemaModificadoresCombatiente`: **Sí**;
- sin `SistemaModificadoresHabilidad`: **Sí**;
- sin `SistemaAuras`: **Sí**;
- sin `SistemaMaldiciones`: **Sí**;
- configuración efectiva derivada y no persistida: **Sí**;
- efectos numéricos por centralizador: **Sí**;
- Auras móviles, no zonas falsas: **Sí**;
- Resistencia Mental canónica: **Sí**;
- Ceguera sin excepción por nombre en percepción: **Sí**;
- Silencio reutiliza contrato temporal: **Sí**;
- sin migraciones: **Sí**;
- sin wrappers nuevos: **Sí**;
- compatibilidad vieja alcanzada eliminada: **Sí**;
- sin dependencias nuevas: **Sí**;
- sin `.patch`: **Sí**;
- sin `.mjs`: **Sí**;
- sin commit/push: **Sí**;
- sin nombres de etapa en producción: **Sí**;
- Plan Maestro actualizado: **Sí**;
- decisiones futuras documentadas: **Sí**;
- entrega en `docs/habilidades/entregas`: **Sí**.

---

## 38. Conventional Commit final propuesto

```text
feat(habilidades): integrar auras, maldiciones y modificadores internos

- resolver daño y atributos internos de habilidades mediante una configuración efectiva y el centralizador canónico de combatientes;
- ampliar el contrato con operaciones multiplicativas, velocidad inversa, límite máximo y Resistencia Mental para Maldiciones;
- incorporar dieciséis pasivas mágicas, cuatro auras elementales, doce maldiciones y doce auras físicas configurables;
- generalizar efectos temporales y emisiones móviles para auras sin crear motores paralelos ni persistir resultados derivados;
- centralizar la invalidación de valores derivados con ObservadorCambiosEstadoJugador y refrescar DOM sin forzar redibujado Phaser;
- preservar el escalado actual de Veneno/Quemadura y hacer explícitas las políticas de Potencia de Efectos;
- ampliar perfiles visuales, traducciones, panel, balance y depuración para el nuevo catálogo;
- eliminar compatibilidades históricas alcanzadas y documentar atributos, decisiones de diseño, candidatos de proyectiles y pendientes futuros.
```

Las pruebas manuales fueron aprobadas. El asistente no realizó el commit ni el push; el mensaje queda listo para el commit final del usuario.

---

## 39. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Habilidades pasivas, modificadores y progresión física de Dark Moon.

ETAPA CERRADA:
HP4 — Diseño exhaustivo de modificadores de habilidades, auras y maldiciones

ESTADO:
Cerrada.

COMMIT BASE:
f5e810d51172cd12b4063b40e0cdd0a90cdef646

HEAD FINAL VERIFICADO:
f5e810d51172cd12b4063b40e0cdd0a90cdef646 (sin commit realizado por el asistente; cambios de HP4 permanecen en el árbol de trabajo)

GIT STATUS FINAL:
Árbol de trabajo con los cambios implementados/documentados de HP4, sin commit ni push. Validación estructural y pruebas manuales finales superadas y aprobadas por el usuario; listo para commit final.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_HP4.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Cerrar el contrato numérico interno de habilidades mediante una configuración efectiva resuelta por SistemaModificadoresCombatiente e implementar como contenido jugable las pasivas mágicas, auras y maldiciones aprobadas, incluida Resistencia Mental, Ceguera y Silencio, sin motores paralelos.

ARQUITECTURA HEREDADA:
`ObservadorCambiosEstadoJugador` es el único canal canónico de invalidación del estado derivado visible y `CoordinadorActualizacionPresentacionDom` agrupa el refresco DOM sin forzar Phaser. SistemaModificadoresCombatiente sigue siendo el único compositor numérico. ConfiguracionHabilidadEfectiva genera snapshots derivados y no persistidos para selección, Maná, tiempo, geometría, daño, efectos y zonas. SistemaEfectosTemporales conserva duración/renovación/expiración; CoordinadorTiempoPartida resuelve receptores espaciales de emisiones móviles; auras/maldiciones entregan descriptores al centralizador. ProgresoHabilidadesJugador conserva únicamente aprendizaje/grados. No hay migraciones.

ARCHIVOS CLAVE:
- src/juego/habilidades/ContratosAtributosHabilidad.js: registro comentado de 18 atributos productivos y dos candidatos de proyectiles a corto plazo.
- src/juego/habilidades/ConfiguracionHabilidadEfectiva.js: snapshot único de atributos internos resueltos.
- src/juego/modificadores/ContratosModificadoresCombatiente.js: objetivos, ocho operaciones y contexto HP3/HP4.
- src/juego/modificadores/SistemaModificadoresCombatiente.js: composición matemática única.
- src/juego/efectos/SistemaEfectosTemporales.js: ciclo de vida, bloqueos y exposición de modificadores/emisiones.
- src/juego/tiempo/CoordinadorTiempoPartida.js: resolución espacial de auras móviles.
- src/config/habilidades/Habilidades.json: 104 habilidades, incluido el catálogo HP4.
- src/config/magia/Efectos.json: catálogo temporal genérico, Resistencia Mental y políticas de Potencia de Efectos.
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md: decisiones implementadas y futuras.
- src/juego/estado/ObservadorCambiosEstadoJugador.js: observador canónico único de invalidación del estado derivado del jugador.
- src/interfaz/dom/CoordinadorActualizacionPresentacionDom.js: agrupa y ejecuta refrescos DOM sin recalcular dominio ni repintar Phaser.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser/Electron existentes sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 38 JSON válidos y 756 imports relativos sin rutas faltantes.
- 44/44 contenidos aprobados presentes; 104 habilidades totales (40 activas/64 pasivas) y 303 descriptores de habilidad auditados.
- 12/12 Maldiciones utilizan Resistencia Mental; Ceguera mantiene Percepción máxima 1 y no modifica alcance; Envenenamiento/Quemadura conservan escalado de valor.
- perfiles visuales: 42/42 habilidades activas/NPC y 35/35 efectos; traducciones ES/EN completas para el contenido productivo.
- afijos activos de portador compatibles con el registro; afijos reservados separados y documentados.
- `git diff --check`, higiene de compatibilidad vieja y rutas HTTP principales correctos.
- pruebas manuales de contenido HP4 y del refresco centralizado superadas y aprobadas por el usuario; los valores derivados se actualizan sin movimiento intermedio.

PROBLEMAS O RIESGOS PENDIENTES:
- balance fino de los 44 contenidos nuevos pendiente para una futura revisión;
- Electron no ejecutado independientemente en este entorno;
- UI final, iconografía y densidad de panel corresponden a HP5.

DECISIONES APROBADAS:
- solo `danoHabilidad` y `atributoHabilidad` como nuevos objetivos de habilidades;
- dieciocho atributos internos productivos con claves validadas;
- `cantidadProyectiles` y `maximoProyectilesSimultaneos` reservados a corto plazo;
- ocho operaciones canónicas, incluida velocidad inversa y límite máximo;
- Auras móviles como efectos del emisor y Maldiciones como efectos temporales, sin motores propios;
- misma Aura/mismo emisor renueva; emisores distintos acumulan como fuentes diferentes;
- Ceguera limita Percepción a 1 y sus grados solo mejoran probabilidad/duración;
- Silencio bloquea habilidades activas y permite ataques con arma;
- Resistencia Mental escala con Sabiduría y reduce la probabilidad de Maldiciones;
- Potencia de Efectos declarada por configuración, preservando el balance existente;
- 16 pasivas mágicas, 4 auras elementales, 12 maldiciones, 8 auras de armas y 4 auras defensivas;
- no aumentar puntos de maestría en HP4;
- no aumentar esquema de persistencia ni crear migraciones.

DECISIONES QUE SIGUEN ABIERTAS:
- balance fino de costes, magnitudes, duraciones, XP/puntos y requisitos del nuevo catálogo;
- activación futura de `cantidadProyectiles` y `maximoProyectilesSimultaneos` cuando exista una habilidad de arco concreta;
- contrato futuro de habilidades transformativas que cambien estructura;
- precisión de hechizos, daño elemental global, potencia de auras, atributos primarios y otros afijos reservados;
- ubicación/presentación de Resistencia Mental;
- diseño visual definitivo de pasivas, Auras y Maldiciones;
- mejoras de Personaje/afijos ya reservadas para HP5.

SIGUIENTE ETAPA RECOMENDADA:
HP5 — Interfaz, posible rediseño, regresión y cierre

OBJETIVO DE LA SIGUIENTE ETAPA:
Analizar la pantalla Personaje y la densidad real producida por HP2–HP4, presentar valores/desgloses canónicos sin recalcularlos, incorporar las mejoras visuales ya aprobadas y realizar la regresión/cierre integral del hito.

PRIMEROS ARCHIVOS A REVISAR:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
- src/interfaz/habilidades/PanelHabilidadesMaestrias.js
- src/interfaz/PanelPersonaje.js
- src/juego/modificadores/SistemaModificadoresCombatiente.js
- src/config/habilidades/Habilidades.json
- src/config/magia/Efectos.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- SistemaModificadoresCombatiente como único compositor numérico;
- separación entre configuración base y ConfiguracionHabilidadEfectiva;
- ciclo temporal genérico de Auras/Maldiciones;
- semántica de Ceguera y Silencio;
- fórmula/base de Resistencia Mental;
- catálogo HP4 salvo ajuste de balance explícitamente aprobado;
- reglas de persistencia sin resultados derivados.
- `ObservadorCambiosEstadoJugador` como único canal canónico de invalidación de presentación derivada; no volver a crear observadores visuales específicos por dominio.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
La interfaz debe mostrar los valores/desgloses canónicos de pasivas, auras, maldiciones, Potencia de Habilidad, Resistencia Mental y ámbitos de afijo sin recalcular lógica; la presentación debe ser usable con el catálogo completo, la regresión integral debe superar combate/progresión/efectos/persistencia/web y los pendientes visuales/documentales deben quedar cerrados o explícitamente diferidos.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(habilidades): integrar auras, maldiciones y modificadores internos

- resolver daño y atributos internos de habilidades mediante una configuración efectiva y el centralizador canónico de combatientes;
- ampliar el contrato con operaciones multiplicativas, velocidad inversa, límite máximo y Resistencia Mental para Maldiciones;
- incorporar dieciséis pasivas mágicas, cuatro auras elementales, doce maldiciones y doce auras físicas configurables;
- generalizar efectos temporales y emisiones móviles para auras sin crear motores paralelos ni persistir resultados derivados;
- centralizar la invalidación de valores derivados con ObservadorCambiosEstadoJugador y refrescar DOM sin forzar redibujado Phaser;
- preservar el escalado actual de Veneno/Quemadura y hacer explícitas las políticas de Potencia de Efectos;
- ampliar perfiles visuales, traducciones, panel, balance y depuración para el nuevo catálogo;
- eliminar compatibilidades históricas alcanzadas y documentar atributos, decisiones de diseño, candidatos de proyectiles y pendientes futuros.

----------------- FIN DEL ENLACE -----------------

## Ajuste incremental posterior — refresco centralizado de interfaz

Se agregó una corrección incremental sobre HP4 para resolver la actualización tardía de valores derivados visibles (por ejemplo, costes de Maná en barra tras aprender pasivas como `Ascua eficiente`) sin introducir llamadas específicas por contenido.

### Decisión arquitectónica

Se canoniza `src/juego/estado/ObservadorCambiosEstadoJugador.js` como único observador de invalidación del estado derivado del jugador.

Responsabilidades:

- observar mutaciones de `ProgresoHabilidadesJugador`;
- recibir invalidaciones explícitas desde `ControladorPartida.procesarResultadoAccion`;
- agrupar señales mediante microtarea;
- emitir solamente invalidaciones semánticas (`estadoJugador`, `habilidades`, `motivos`), nunca valores calculados.

`src/interfaz/dom/CoordinadorActualizacionPresentacionDom.js` consume ese canal y refresca DOM derivado:

- Panel Personaje / HUD;
- Barra de habilidades;
- Panel de Habilidades.

La presentación relee siempre el estado canónico. No se agregan ramas por pasiva, aura, maldición, afijo o habilidad concreta. Tampoco se fuerza redibujado Phaser por cambios puramente numéricos.
