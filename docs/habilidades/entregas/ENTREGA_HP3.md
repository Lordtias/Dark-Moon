# ENTREGA HP3 — Diseño de contenido pasivo y progresión física

## 1. Estado de la etapa

**Estado:** Cerrada.

La implementación, la validación técnica y la pasada manual de HP3 fueron completadas. El usuario confirmó que las pruebas finales fueron superadas después de los ajustes de refresco inmediato y presentación de pasivas. HP3 queda cerrada y preparada para el commit final.

No se realizó commit ni push.

---

## 2. Repositorio verificado

- Ruta de trabajo: `/mnt/data/hp3_work/Dark-Moon`
- Rama: `main`
- Commit base / cierre confirmado de HP2: `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`
- HEAD durante la implementación: `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`
- `origin/main`: `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`
- Estado inicial: limpio.
- Commit/push realizados por el asistente: **No**.

La etapa parte directamente del ZIP `Dark-Moon-HP2(1).zip` confirmado por el usuario.

---

## 3. Alcance aprobado

HP3 debía:

1. realizar un diseño fuerte de progresión física en lugar de agregar unas pocas pasivas aisladas;
2. agregar las maestrías físicas que correspondan al equipamiento realmente existente;
3. implementar un catálogo amplio de pasivas declarativas;
4. reutilizar exclusivamente `SistemaModificadoresCombatiente` para interpretar condiciones y calcular sus efectos;
5. mantener `ProveedorModificadoresPasivasAprendidas` como mero traductor entre progreso aprendido y descriptores configurados;
6. generalizar la XP de maestrías para que magia, armas, armaduras y escudos utilicen un único sistema;
7. utilizar daño y mitigación ya resueltos por combate, sin recalcularlos en progresión;
8. definir con precisión conjuntos corporales completos, equipamiento mixto, escudos y dual wield;
9. diseñar un catálogo funcional inicial de auras y maldiciones para HP4 sin implementar todavía su runtime;
10. mantener `Básicas` vacía mientras no exista una identidad y fuente natural de XP aprobada;
11. continuar sin migraciones de guardados;
12. documentar ampliamente decisiones, fórmulas y pendientes de diseño.

No formaba parte de HP3:

- runtime completo de auras/maldiciones;
- atributos internos modificables de habilidades activas;
- rediseño del panel Personaje;
- nuevas píldoras visuales de afijos;
- nuevas dependencias;
- cambios de Phaser/Electron;
- balance definitivo de las magnitudes iniciales.

---

## 4. Resumen sencillo

HP3 agrega **12 maestrías físicas y 48 pasivas funcionales** sin crear un segundo motor de pasivas.

La arquitectura final es:

```text
Habilidades.json
+ ProgresoHabilidadesJugador
        ↓
ProveedorModificadoresPasivasAprendidas
        ↓
qué pasivas/grados están aprendidos
        ↓
descriptores declarativos
        ↓
SistemaModificadoresCombatiente
        ↓
condiciones + operaciones + resultado final
```

El proveedor no sabe si una pasiva está activa por el equipo actual. Esa decisión sigue perteneciendo exclusivamente al centralizador mediante su contexto real.

La progresión queda también unificada:

```text
hecho canónico ya resuelto
        ↓
SistemaExperienciaMaestrias
        ↓
fuente/factor configurado de la maestría
        ↓
ProgresoHabilidadesJugador
```

No existe `SistemaExperienciaArmas`, `SistemaExperienciaArmaduras` ni una fórmula de XP mágica paralela.

---

## 5. Maestrías finales

Se conservan las cuatro mágicas:

- Fuego;
- Frío;
- Rayo;
- Veneno.

Se agregan doce físicas:

### Armas

- Dagas;
- Espadas;
- Hachas;
- Mandobles;
- Lanzas;
- Arcos;
- Bastones;
- Varitas.

### Armaduras

- Armadura ligera;
- Armadura media;
- Armadura pesada;
- Escudos.

Las doce maestrías físicas están disponibles para Guerrero, Rogue y Mago. El sistema actual no impone una restricción de clase que justifique bloquearlas artificialmente.

`Básicas` permanece deliberadamente sin maestrías. La decisión queda documentada, no olvidada.

---

## 6. Estructura de progresión física

Cada maestría física posee cuatro pasivas:

```text
Pasiva 1: 3 grados — requisito 0
Pasiva 2: 3 grados — requisito 3
Pasiva 3: 3 grados — requisito 6
Pasiva 4: 1 grado  — requisito 9
```

Total: **10 grados**.

Una maestría que alcanza nivel 10 obtiene diez puntos específicos, por lo que puede completar exactamente sus diez grados utilizando únicamente sus puntos propios.

Se conserva:

- 1 punto universal inicial;
- 1 punto universal por nivel general;
- 1 punto específico por nivel de maestría;
- nivel máximo de maestría 10;
- curva total actual de 1250 XP para alcanzar el máximo.

---

## 7. Catálogo de 48 pasivas

### Dagas

- Ritmo de daga;
- Punto vital;
- Maestría dual;
- Danza de cuchillas.

### Espadas

- Técnica de hoja;
- Corte maestro;
- Guardia de duelista;
- Esgrima fluida.

### Hachas

- Golpe brutal;
- Cabeza equilibrada;
- Impacto decisivo;
- Ejecutor.

### Mandobles

- Inercia;
- Dominio pesado;
- Guardia a dos manos;
- Quebrantador.

### Lanzas

- Punta firme;
- Empuje profundo;
- Guardia de distancia;
- Dominio de alcance.

### Arcos

- Tiro estable;
- Tensión controlada;
- Tiro letal;
- Ojo de halcón.

### Bastones

- Canalización estable;
- Golpe disciplinado;
- Guardia de bastón;
- Foco profundo.

### Varitas

- Canalización fina;
- Precisión arcana;
- Doble canalización;
- Canal extendido.

### Armadura ligera

- Armadura ligera;
- Paso ligero;
- Flujo libre;
- Sin lastre.

### Armadura media

- Defensa flexible;
- Movilidad entrenada;
- Preparación elemental;
- Equilibrio.

### Armadura pesada

- Placas ajustadas;
- Aguante;
- Firmeza;
- Fortaleza.

### Escudos

- Guardia firme;
- Bloqueo experto;
- Bastión;
- Muro.

Los valores por grado viven en `src/config/habilidades/Habilidades.json`. Ningún ID de estas pasivas aparece como excepción funcional en combate, estadísticas o tiempo.

---

## 8. Proveedor de pasivas

Archivo nuevo:

`src/juego/modificadores/ProveedorModificadoresPasivasAprendidas.js`

Responsabilidad exacta:

1. leer la configuración validada de habilidades;
2. consultar en `ProgresoHabilidadesJugador` qué pasivas están aprendidas;
3. obtener el grado actual;
4. devolver los descriptores correspondientes a ese grado.

No puede:

- evaluar condiciones;
- decidir si el jugador tiene el arma correcta;
- calcular estadísticas;
- aplicar clamps;
- ejecutar una pasiva;
- modificar directamente Player o combate.

Esas responsabilidades siguen siendo de `SistemaModificadoresCombatiente` y del dominio consumidor correspondiente.

---

## 9. Contexto de equipamiento

El contexto canónico se amplía con:

```text
familiaSecundaria
conjuntoArmaduraCompleto
```

Y se formaliza:

```text
categoriaArmadura = ligera | media | pesada | mixta | null
```

Las cinco ranuras corporales son:

```text
cabeza
torso
manos
piernas
pies
```

El escudo queda fuera de esa clasificación.

Reglas:

- cinco piezas de una misma categoría → conjunto completo de esa categoría;
- cinco piezas mezcladas → `mixta` + conjunto completo;
- una o más ranuras vacías → conjunto incompleto;
- sin armadura corporal → categoría `null`.

Las pasivas de Ligera/Media/Pesada exigen simultáneamente categoría correcta y conjunto completo.

---

## 10. Casos de referencia de pasivas

### Ojo de halcón

```text
aprendida
+ arco equipado
→ alcanceAtaque +1
```

Con espada equipada el descriptor sigue existiendo, pero el centralizador rechaza la condición `familiaArma=arco` y no aplica el +1.

### Maestría dual

La penalización base de la secundaria continúa siendo 0,50.

En grado 3:

```text
0,50 + 0,24 = 0,74
```

El combate no contiene `if` por nombre de pasiva.

### Armadura ligera

```text
cinco piezas ligeras → pasiva activa
quitar una pieza      → pasiva inactiva
mezclar una pieza     → categoriaArmadura=mixta → pasiva inactiva
```

---

## 11. SistemaExperienciaMaestrias

Archivos nuevos:

- `src/juego/maestrias/ContratosExperienciaMaestrias.js`
- `src/juego/maestrias/SistemaExperienciaMaestrias.js`

Fuentes canónicas iniciales:

```text
mana_consumido
danio_aplicado_arma
danio_mitigado_armadura
danio_mitigado_bloqueo
```

Factores iniciales configurados:

```text
Maná consumido              × 1
Daño real de arma           × 0,75
Mitigación de Armadura      × 8
Mitigación de Bloqueo       × 4
```

Los factores pertenecen a `Maestrias.json`.

---

## 12. XP de armas

La cantidad base es la Vida realmente retirada por la fuente concreta.

```text
si dañoRealAplicado <= 0:
  XP = 0

si dañoRealAplicado > 0:
  XP = max(1, round(dañoRealAplicado × factor))
```

Esto resuelve:

- fallo → 0 XP;
- daño 0 → 0 XP;
- overkill → solo cuenta la Vida realmente retirada;
- dual → cada fuente conserva mano y familia;
- primera fuente mata → la segunda no se ejecuta ni recibe XP;
- ataque natural sin familia → no crea XP física artificial.

---

## 13. XP de Armadura

`ComponentesDanio` expone `danioMitigadoArmadura` desde la resolución física real antes del redondeo final y excluyendo Bloqueo.

No se recalcula la mitigación en progresión.

`EstadisticasDerivadas` expone:

```text
desgloseArmadura.ligera
desgloseArmadura.media
desgloseArmadura.pesada
desgloseArmadura.escudo
desgloseArmadura.otras
```

Las fuentes globales no atribuibles a una pieza quedan en `otras` y no regalan XP de equipamiento.

### Conservación de XP en conjuntos mixtos

La mitigación clasificable de un mismo golpe forma un único pool de XP.

Primero se obtiene la XP exacta de cada categoría según su aporte y factor. Luego:

```text
XP_total = max(1, round(suma XP_exacta))
```

El entero se distribuye por restos mayores. Así, dividir una misma Armadura entre dos categorías no puede crear ni destruir XP solamente por redondear cada parte de forma independiente.

---

## 14. XP de Escudos

Escudos recibe dos fuentes distintas:

1. mitigación de Armadura atribuible a la Armadura local del escudo;
2. mitigación real producida por Bloqueo.

La primera comparte el pool de Armadura del golpe. La segunda utiliza `danio_mitigado_bloqueo` con su propio factor.

Un bloqueo fallido no otorga XP de Bloqueo.

---

## 15. Deduplicación

Cada ataque real recibe un `idResolucion` técnico de sesión.

La clave de recompensa incluye:

- resolución;
- componente/fuente;
- tipo de XP;
- maestría;
- índice de fuente configurada.

Procesar nuevamente el mismo resultado no vuelve a entregar XP.

Estos IDs no se persisten.

---

## 16. Persistencia

Sin migración.

Cambios:

```text
ProgresoHabilidadesJugador: v2 → v3
Guardado durable jugador:   v3 → v4
Clave: dark-moon:estado-jugador:v4
```

Se persisten:

- niveles de maestría;
- XP;
- puntos universales/específicos;
- grados aprendidos.

No se persisten:

- pasiva activa/inactiva;
- estadísticas resultantes;
- contexto del equipo;
- desglose de Armadura;
- IDs de deduplicación.

Todo se reconstruye desde las fuentes canónicas.

---

## 17. Auras diseñadas para HP4

Sin runtime en HP3:

1. **Aura de Guardia:** +15% Armadura base.
2. **Aura de Celeridad:** movimiento ×0,90 y ataque ×0,95.
3. **Aura de Precisión:** +8 Precisión.
4. **Aura de Enfoque:** +15 Potencia de Habilidad y +10 Potencia de Efectos.
5. **Aura de Recuperación:** +1 regeneración de Vida y +1 de Maná.
6. **Aura de Resguardo Elemental:** +10 a las cuatro resistencias elementales.
7. **Aura de Voluntad:** +10 a las cuatro resistencias de efectos.
8. **Aura de Vigilancia:** +2 Percepción.

HP4 debe definir emisión, radio, duración, renovación, convivencia y atributos internos de habilidad que correspondan.

---

## 18. Maldiciones diseñadas para HP4

Sin runtime en HP3:

1. **Torpeza:** -8 Precisión.
2. **Exposición:** -15% Armadura base.
3. **Lentitud:** movimiento ×1,20 y ataque ×1,10.
4. **Supresión:** -15 Potencia de Habilidad y -10 Potencia de Efectos.
5. **Marchitamiento:** -1 regeneración de Vida y de Maná.
6. **Vulnerabilidad elemental:** -10 a las cuatro resistencias elementales.
7. **Ceguera:** -3 Percepción y -1 Alcance.
8. **Debilidad:** -10% daño de fuente.

---

## 19. Básicas

La categoría sigue existiendo en el contrato general, pero permanece vacía por decisión de diseño.

No se encontró una fuente natural de XP equivalente a usar un arma, mitigar daño o consumir Maná. Incorporar Supervivencia/Atletismo/Exploración u otra maestría sin decidir primero qué comportamiento real la hace progresar produciría una regla arbitraria.

Queda como decisión futura explícita.

---

## 20. Mejoras de interfaz ya reservadas para HP5

### Ajustes incorporados tras la primera validación manual de HP3

La primera pasada manual detectó dos problemas de presentación que forman parte del cierre funcional de HP3 y fueron aprobados para corregirse dentro de la misma etapa:

1. **Refresco inmediato de estadísticas:** aprender o mejorar una pasiva actualiza inmediatamente Panel Personaje y HUD. El observador de progreso no espera a un movimiento/ataque para que HTML represente el nuevo valor canónico y no fuerza un redibujado de Phaser solamente para refrescar estadísticas.
2. **Beneficio explícito de las pasivas:** la tarjeta obtiene de `modificadoresPorGrado` el descriptor del grado actual (o grado 1 como vista previa si todavía no fue aprendida) y muestra únicamente el beneficio principal para el jugador, por ejemplo `Precisión +2`, `Armadura +8%` o `Velocidad de ataque +3%`. Las condiciones siguen siendo evaluadas por `SistemaModificadoresCombatiente`, pero no se repiten como una fila `Requiere` dentro del bloque de beneficio. No se expone como dato principal la operación técnica del resolutor ni una fila genérica `Tipo: Pasiva`. `Activa`/`Pasiva` se muestra mediante una píldora visual de clasificación. El panel no recalcula la estadística final.

La iconografía definitiva no se incorpora en HP3: queda reservada explícitamente para HP5 y utilizará el atributo `icono` ya existente en `Habilidades.json`, sin crear un contrato paralelo.

### Pendientes visuales reservados para HP5

Se conservan las tres mejoras aprobadas durante el cierre de HP2 y se agrega la iconografía de pasivas reservada durante la validación de HP3:

1. mostrar **Potencia de Habilidad** en el panel Personaje, usando el valor canónico;
2. analizar si la sección `Magia` debe seguir llamándose así o pasar a `Habilidades`/otra denominación más general;
3. agregar a las cajas de afijo una segunda píldora junto a Prefijo/Sufijo que comunique si el efecto pertenece al objeto o se aplica al portador. La terminología visible se decidirá allí; la UI consumirá `ambito`.
4. diseñar y asignar la iconografía definitiva de las 48 pasivas usando `icono` en `Habilidades.json`, sin introducir un catálogo visual paralelo.

HP3 no implementa ninguna de estas mejoras.

---

## 21. Archivos agregados

```text
src/juego/maestrias/ContratosExperienciaMaestrias.js
src/juego/maestrias/SistemaExperienciaMaestrias.js
src/juego/modificadores/ProveedorModificadoresPasivasAprendidas.js
docs/habilidades/entregas/ENTREGA_HP3.md
```

---

## 22. Archivos modificados

```text
README.md
docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
docs/habilidades/entregas/ENTREGA_HP2.md
src/config/habilidades/Habilidades.json
src/config/habilidades/Maestrias.json
src/config/idiomas/en.json
src/config/idiomas/es.json
src/entidad/destructible/combatiente/Combatiente.js
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
src/entidad/destructible/combatiente/Player.js
src/herramientas/balance/AnalizadorBalanceJuego.js
src/herramientas/depuracion/DepuradorMagiaHabilidades.js
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/interfaz/habilidades/IntegracionHabilidadesDom.js
src/interfaz/Renderizador.js
assets/estilos/paneles/habilidades-maestrias.css
src/juego/combate/ComponentesDanio.js
src/juego/combate/SistemaCombate.js
src/juego/combate/SistemaCombateJugador.js
src/juego/habilidades/ObservadorProgresoHabilidades.js
src/juego/habilidades/SistemaHabilidadesJugador.js
src/juego/ia/SistemaAccionesEnemigos.js
src/juego/maestrias/ProgresoHabilidadesJugador.js
src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js
src/juego/modificadores/ContratosModificadoresCombatiente.js
src/partida/PersistenciaJugador.js
```

---

## 23. Archivos eliminados

**Ninguno.**

HP3 no necesita wrappers nuevos ni archivos antiguos que sobrevivan bajo nombres paralelos.

---

## 24. Arquitectura anterior y final

### Antes

```text
ProgresoHabilidadesJugador
└─ conocía directamente la XP por Maná

SistemaModificadoresCombatiente
└─ sin proveedor de pasivas aprendido

4 maestrías mágicas
12 habilidades activas
```

### Después

```text
ProgresoHabilidadesJugador
└─ estado puro de progresión
        ↑
SistemaExperienciaMaestrias
├─ Maná consumido
├─ daño real de arma
├─ mitigación real de Armadura
└─ mitigación real de Bloqueo

ProgresoHabilidadesJugador + Habilidades.json
        ↓
ProveedorModificadoresPasivasAprendidas
        ↓
SistemaModificadoresCombatiente
        ↓
reglas canónicas existentes

16 maestrías
12 activas mágicas
48 pasivas físicas
```

---

## 25. Dependencias

Nuevas dependencias: **Ninguna**.

No se modificaron:

- `package.json`;
- `package-lock.json`;
- Phaser;
- Electron;
- configuración de empaquetado.

No hay instrucciones de instalación/desinstalación adicionales.

---

## 26. Ejecución

Se conserva el procedimiento habitual del proyecto mediante servidor HTTP. No se incorpora un nuevo entrypoint ni se cambia el modelo de carga.

Los recursos clave se comprobaron mediante HTTP local y respondieron `200`:

- `index.html`;
- `Maestrias.json`;
- `Habilidades.json`;
- `SistemaExperienciaMaestrias.js`;
- `ProveedorModificadoresPasivasAprendidas.js`.

---

## 27. Validación técnica ejecutada

### 27.1. JSON

- Preparación: todos los `.json` del repositorio.
- Resultado esperado: parseo válido.
- Resultado obtenido: **38/38 válidos**.
- Estado: **Correcto**.

### 27.2. Imports relativos

- Preparación: módulos JavaScript de `src` y entrada aplicable.
- Resultado esperado: ninguna ruta relativa inexistente.
- Resultado obtenido: **747 imports comprobados, 0 faltantes**.
- Estado: **Correcto**.

### 27.3. Carga real de módulos modificados

Se utilizaron Chromium/V8 y módulos servidos por HTTP, sin Node ni nuevas dependencias.

- Módulos JS modificados/agregados auditados: **18**.
- Importaciones fallidas: **0**.
- Estado: **Correcto**.

### 27.4. Catálogo

Resultado real validado:

```text
16 maestrías
12 físicas
60 habilidades totales
12 activas
48 pasivas
```

Las doce maestrías físicas poseen exactamente estructura `3/3/3/1` y requisitos `0/3/6/9`.

Estado: **Correcto**.

### 27.5. Progresión completa

Caso real en Arcos:

- XP total aplicada: 1250;
- nivel resultante: 10;
- puntos específicos obtenidos: 10;
- los diez grados `3+3+3+1` pudieron comprarse;
- puntos específicos finales: 0.

Estado: **Correcto**.

### 27.6. Ojo de halcón

Caso real:

```text
Arco corto antes: alcance 6
Ojo de halcón aprendido: alcance 7
Cambiar a espada: alcance 1
```

Estado: **Correcto**.

### 27.7. Armadura ligera / conjunto mixto

Caso real:

```text
Evasión antes: 25
Cinco piezas ligeras + grado 1: 27
Quitar cabeza: 25
Completar con pieza media: categoriaArmadura=mixta, Evasión 25
```

Estado: **Correcto**.

### 27.8. Maestría dual

Caso real con dos dagas:

```text
secundaria antes: 0,50
Maestría dual grado 3: 0,74
principal: 1,00
```

Estado: **Correcto**.

### 27.9. XP mágica por el sistema común

Evento real del contrato:

```text
mana_consumido = 7
maestría = fuego
XP resultante = 7
```

No se utiliza el antiguo `registrarEjecucionEfectiva`.

Estado: **Correcto**.

### 27.10. XP de arma y overkill

Caso de combate real:

- objetivo dejado en 2 de Vida;
- daga infligía daño teórico mayor;
- Vida realmente retirada: 2;
- XP de Dagas: 2.

Estado: **Correcto**.

### 27.11. Segunda mano no ejecutada

Caso real Espada + Daga contra objetivo con 1 de Vida:

- la espada principal destruyó al objetivo;
- golpes realmente ejecutados: 1;
- XP Espadas: 1;
- XP Dagas: 0.

Estado: **Correcto**.

### 27.12. Armadura mixta y conservación de XP

Caso real de conjunto mixto:

- mitigación real de Armadura del golpe: `0.34535104364326585`;
- XP total correspondiente con factor 8: 3;
- reparto: Ligera 2 / Media 1;
- suma final: 3.

Además se ejecutó un caso límite sintético de dos contribuciones de `0,06`: el pool produjo exactamente 1 XP total y una segunda ejecución del mismo ID produjo 0 XP.

Estado: **Correcto**.

### 27.13. Escudo

Caso real con bloqueo determinista:

- bloqueo: verdadero;
- daño mitigado por Bloqueo: 14,3;
- mitigación de Armadura atribuida al escudo: `0.19663865546218595`;
- ambas fuentes se registraron en Escudos;
- XP total de la resolución: 59.

Estado: **Correcto**.

### 27.14. Persistencia

Validado:

```text
Guardado jugador: v4
ProgresoHabilidades: v3
```

Un guardado de jugador v3 fue rechazado explícitamente.
Un progreso de habilidades v2 fue rechazado explícitamente.

No existe migración automática.

Estado: **Correcto**.

### 27.15. Integridad arquitectónica

Comprobado:

- 0 referencias productivas a `registrarEjecucionEfectiva`;
- 0 referencias productivas a `factorExperienciaPorMana`;
- 0 identificadores HP dentro de `src`;
- 0 `.patch`, `.mjs`, `.tmp`, `.bak` o temporales equivalentes;
- `git diff --check`: sin errores.

Estado: **Correcto**.

---

## 28. Validación manual de cierre

### Sesión jugable manual completa

**Estado:** Correcto — superada y aprobada por el usuario.

La primera pasada manual detectó dos incidencias de presentación: el Panel Personaje no reflejaba una pasiva aprendida hasta la siguiente acción jugable y la tarjeta de pasiva no exponía el beneficio concreto. Tras los ajustes aprobados se revalidó el flujo y el usuario confirmó las pruebas como superadas.

Quedó comprobado manualmente que:

- aprender/mejorar una pasiva actualiza inmediatamente los valores visibles del personaje sin exigir movimiento u otra acción posterior;
- la tarjeta toma el descriptor del grado desde `modificadoresPorGrado` y muestra el beneficio principal de forma directa, por ejemplo `Precisión +2`;
- `Activa`/`Pasiva` se representa como píldora de clasificación y no como una fila funcional;
- la condición de activación sigue perteneciendo al contrato canónico y no se duplica como fila `Requiere` en el bloque del beneficio.

Las pruebas manuales complementan la validación técnica ya registrada en esta entrega.

### Electron

**Estado:** No ejecutado de forma independiente.

HP3 no modifica Electron y no se instalaron dependencias para forzar esa prueba.

---

## 29. Incidencias de pruebas técnicas

Dos primeras variantes de scripts de prueba fueron corregidas sin implicar fallos del producto:

1. se utilizó inicialmente un ID de pasiva incorrecto (`armadura_ligera` en lugar de `dominio_armadura_ligera`);
2. una primera prueba de Ojo de halcón entregó 810 XP cuando el requisito de nivel 9 necesita 960 XP acumulada.

Ambos casos se repitieron con la preparación correcta y resultaron **Correctos**.

En una prueba inicial de overkill el objetivo se creó con Vida máxima derivada mayor a la pretendida; se fijó su Vida actual al valor de prueba y el caso real pasó correctamente.

No se detectó un fallo funcional de HP3 en estas incidencias.

---

## 30. Compatibilidad web

Compatible con la arquitectura web existente.

No se modifica:

- `game.js` como entrada;
- carga general de Phaser;
- servidor requerido por módulos/fetch;
- GitHub Pages como modelo de publicación.

---

## 31. Compatibilidad Electron

Arquitectónicamente compatible.

HP3 no modifica:

- `electron/main.js`;
- preload;
- aislamiento de contexto;
- Node integration;
- empaquetado.

No se afirma una ejecución Electron que no se realizó.

---

## 32. Riesgos y pendientes

### Balance

Los valores iniciales de las 48 pasivas y los factores `0,75 / 8 / 4` son configurables y deben observarse durante pruebas reales. No son una deuda arquitectónica.

### Básicas

Continúa abierta la decisión de qué identidad y fuente natural de XP debe tener la categoría.

### HP4

Debe realizar la auditoría fuerte de atributos internos de habilidades y completar el runtime de las auras/maldiciones diseñadas aquí.

### HP5

Debe resolver las cuatro mejoras visuales ya registradas —incluida la iconografía definitiva de pasivas— y la presentación de pasivas/efectos/desgloses sin recalcular valores.

---

## 33. Comprobación de restricciones

- una sola progresión general: **Sí**;
- un solo sistema de XP de maestrías: **Sí**;
- pasivas calculadas por `SistemaModificadoresCombatiente`: **Sí**;
- proveedor sin lógica de condiciones: **Sí**;
- no recalcular combate en progresión: **Sí**;
- sin excepciones por nombre de pasiva: **Sí**;
- sin wrappers históricos nuevos: **Sí**;
- sin migraciones: **Sí**;
- sin nuevas dependencias: **Sí**;
- sin `.patch`: **Sí**;
- sin `.mjs`: **Sí**;
- sin commit/push: **Sí**;
- sin nombres de etapa en producción: **Sí**;
- sin cambios visuales fuera del alcance: **Sí**;
- Plan Maestro actualizado: **Sí**;
- entrega en `docs/habilidades/entregas`: **Sí**.

---

## 34. Entregables ZIP

Se generan fuera del repositorio:

- `Dark-Moon-HP3-Incremental.zip`: 30 archivos completos para agregar/reemplazar respecto de `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`, más instrucciones y listados. No hay archivos a eliminar.
- `Dark-Moon-HP3.zip`: repositorio completo con `.git`, sin `node_modules`.

Ambos ZIP deben verificarse antes de la entrega al usuario.

---

## 35. Conventional Commit propuesto

```text
feat(habilidades): incorporar pasivas y progresión física

- agregar doce maestrías físicas y cuarenta y ocho pasivas declarativas reutilizando el centralizador canónico de modificadores;
- incorporar el proveedor de pasivas aprendidas y formalizar contexto de arma secundaria y conjuntos corporales completos/mixtos;
- unificar la experiencia de maestrías por Maná, daño real de arma, mitigación de Armadura y Bloqueo con deduplicación y conservación de XP;
- exponer trazabilidad de daño y mitigación desde el combate sin recalcular fórmulas en progresión;
- versionar progreso a v3 y guardado de jugador a v4 sin migraciones;
- refrescar inmediatamente estadísticas al aprender pasivas y mostrar su beneficio concreto con clasificación Activa/Pasiva en píldora;
- validar catálogos, imports, pasivas, dual wield, overkill, armaduras, escudos, persistencia y pruebas manuales, y actualizar Plan Maestro/entregas.
```

La pasada manual fue aprobada. No realizar el commit desde esta entrega; el commit final queda a cargo del usuario.

---

## 36. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Habilidades pasivas, modificadores y progresión física de Dark Moon.

ETAPA CERRADA:
HP3 — Diseño de contenido pasivo y progresión física

ESTADO:
Cerrada.

COMMIT BASE:
f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65

HEAD FINAL VERIFICADO:
f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65 (sin commit realizado por el asistente)

GIT STATUS FINAL:
Árbol de trabajo con exclusivamente los cambios implementados de HP3 y su documentación de cierre; sin commit ni push realizado por el asistente. La pasada manual fue aprobada por el usuario.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_HP3.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Implementar un catálogo amplio de progresión física con doce maestrías y cuarenta y ocho pasivas declarativas, unificando la XP de todas las maestrías mediante hechos canónicos ya resueltos y dejando diseñado el catálogo de auras/maldiciones para HP4.

ARQUITECTURA HEREDADA:
ProgresoHabilidadesJugador conserva únicamente estado de progresión. ProveedorModificadoresPasivasAprendidas traduce pasivas/grados a descriptores y SistemaModificadoresCombatiente sigue siendo el único intérprete de condiciones y composición. SistemaExperienciaMaestrias traduce Maná consumido, daño real y mitigación ya resuelta a XP sin recalcular combate. El contexto distingue arma/secundaria, dual y conjunto corporal completo/mixto. No hay migraciones.

ARCHIVOS CLAVE:
- src/config/habilidades/Maestrias.json: 16 maestrías y fuentes/factores configurables de XP.
- src/config/habilidades/Habilidades.json: 12 activas y 48 pasivas con modificadores por grado.
- src/juego/modificadores/ProveedorModificadoresPasivasAprendidas.js: puente declarativo entre progreso y centralizador.
- src/juego/maestrias/SistemaExperienciaMaestrias.js: único traductor de hechos canónicos a XP.
- src/juego/modificadores/ContratosModificadoresCombatiente.js: contexto ampliado de arma secundaria y conjuntos.
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md: diseño detallado y decisiones heredables.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser/Electron existentes sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 38 JSON válidos, 747 imports relativos sin faltantes y 18 módulos modificados/agregados cargados en Chromium/V8.
- 16 maestrías, 60 habilidades y 48 pasivas; progresión física 3/3/3/1 validada hasta nivel 10.
- Ojo de halcón, Maestría dual, conjunto ligero/mixto, XP mágica, overkill, segunda mano no ejecutada, Armadura mixta, Escudos y persistencia v4 verificados con módulos reales.
- Pruebas manuales finales aprobadas por el usuario: refresco inmediato al aprender/mejorar pasivas y presentación del beneficio concreto sin fila redundante `Requiere`.

PROBLEMAS O RIESGOS PENDIENTES:
- Balance fino de magnitudes de pasivas y factores de XP a observar con juego real.
- Categoría Básicas permanece deliberadamente sin maestrías hasta aprobar identidad y fuente natural de progresión.

DECISIONES APROBADAS:
- doce maestrías físicas para las tres profesiones y 48 pasivas 3/3/3/1;
- ProveedorModificadoresPasivasAprendidas no interpreta condiciones ni calcula estadísticas;
- conjuntos corporales usan cinco ranuras, mixto es categoría propia y escudo queda fuera del conjunto;
- XP física usa daño real/mitigación real y un único SistemaExperienciaMaestrias;
- XP de Armadura conserva el pool entero al distribuir categorías;
- Básicas permanece vacía en HP3;
- ocho auras y ocho maldiciones quedan diseñadas para HP4;
- persistencia v4/progreso v3 sin migración;
- el beneficio de una pasiva se muestra como dato principal del grado (`Precisión +2`, etc.), `Activa`/`Pasiva` usa una píldora visual y las condiciones no se duplican como fila `Requiere`.

DECISIONES QUE SIGUEN ABIERTAS:
- auditoría y contrato final de atributos internos modificables de habilidades en HP4;
- runtime, radio, duración, renovación y convivencia de auras/maldiciones en HP4;
- balance fino posterior de pasivas y XP;
- identidad/fuente de XP de futuras maestrías Básicas;
- mejoras de presentación reservadas para HP5, incluida la iconografía definitiva de las 48 pasivas.

SIGUIENTE ETAPA RECOMENDADA:
HP4 — Diseño exhaustivo de modificadores de habilidades, auras y maldiciones

OBJETIVO DE LA SIGUIENTE ETAPA:
Auditar exhaustivamente las habilidades activas y todos sus parámetros reales, aprobar el registro canónico de atributos internos modificables y sus puntos de integración, y completar el runtime genérico de auras/maldiciones diseñadas en HP3 sin crear motores paralelos.

PRIMEROS ARCHIVOS A REVISAR:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- src/config/habilidades/Habilidades.json
- src/juego/modificadores/ContratosModificadoresCombatiente.js
- src/juego/modificadores/SistemaModificadoresCombatiente.js
- src/juego/habilidades/SistemaHabilidadesJugador.js
- src/juego/efectos/ContratosEfectosTemporales.js
- src/juego/efectos/SistemaEfectosTemporales.js
- src/juego/zonas/SistemaZonasTemporales.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- separación Progreso → Proveedor → SistemaModificadoresCombatiente;
- fuentes/fórmulas canónicas de XP de HP3;
- operaciones/orden matemático del centralizador;
- semántica de conjunto corporal y escudo;
- fórmulas base de combate fuera de los puntos de integración aprobados;
- catálogo de auras/maldiciones aprobado, salvo ajuste justificado por la auditoría de HP4.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Todos los atributos de habilidad que se decida exponer deben estar registrados y resolverse por el contrato canónico sin ramas por habilidad; auras/maldiciones deben usar fuentes/ciclo de vida genéricos y todo objetivo modificable debe continuar desembocando en los centralizadores existentes, con regresión completa y documentación actualizada.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(habilidades): incorporar pasivas y progresión física

- agregar doce maestrías físicas y cuarenta y ocho pasivas declarativas reutilizando el centralizador canónico de modificadores;
- incorporar el proveedor de pasivas aprendidas y formalizar contexto de arma secundaria y conjuntos corporales completos/mixtos;
- unificar la experiencia de maestrías por Maná, daño real de arma, mitigación de Armadura y Bloqueo con deduplicación y conservación de XP;
- exponer trazabilidad de daño y mitigación desde el combate sin recalcular fórmulas en progresión;
- versionar progreso a v3 y guardado de jugador a v4 sin migraciones;
- refrescar inmediatamente estadísticas al aprender pasivas y mostrar su beneficio concreto con clasificación Activa/Pasiva en píldora;
- validar catálogos, imports, pasivas, dual wield, overkill, armaduras, escudos, persistencia y pruebas manuales, y actualizar Plan Maestro/entregas.

----------------- FIN DEL ENLACE -----------------
