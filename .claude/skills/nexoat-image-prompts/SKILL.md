---
name: nexoat-image-prompts
description: Fórmula y plantillas para escribir prompts de generación de imagen (portadas de categoría y de artículo) del blog de NexoAT. Úsalo siempre que haya que redactar un prompt nuevo de imagen para una categoría o un artículo, para que el resultado tenga la misma fotografía documental cálida y la misma ética de representación del acompañamiento terapéutico que el resto del set ya generado — y, en categorías, el encuadre correcto para el recorte agresivo que sufre la imagen en el encabezado.
---

# Prompts de imagen — NexoAT

Este skill documenta **cómo redactar** (no cómo generar) los prompts de imagen fotográfica del blog: portadas de categoría (`/nexoat-admin/categorias`) y portadas de artículo. No genero las imágenes — este skill produce el texto del prompt para que lo uses en la herramienta de generación que corresponda, igual que ya se hizo para el set de categorías original.

Referencia de prompts ya escritos: [`docs/features/category-image-prompts.md`](../../docs/features/category-image-prompts.md) (10 categorías originales — **desactualizado**, todavía no cubre las 5 categorías agregadas después, ver `docs/features/new-categories-batch-1.md`).

## Fórmula fotográfica común (categoría y artículo)

Todo prompt es **una sola fotografía ultrarealista, estilo documental**, con esta estructura fija de bloques, en este orden:

1. **Encabezado técnico:** `Fotografía ultrarealista, estilo documental [narrativo/cálido], 35mm, grano sutil, [profundidad de campo], [descripción de la luz].`
2. **Escenario:** dónde ocurre la escena — siempre un espacio doméstico/cotidiano real (living, cocina, jardín, balcón, sala de espera), nunca un set genérico ni un consultorio clínico salvo que la categoría sea explícitamente "Sistema de Salud".
3. **Sujetos y acción concreta:** quién está en la escena (edad aproximada, rol), qué está haciendo con las manos/cuerpo — la acción tiene que ser específica y observable, no una pose genérica ("una mujer sonriendo a cámara" no sirve).
4. **Detalles de entorno que refuerzan el mensaje:** objetos cotidianos fuera de foco (una taza, una carpeta, un calendario, un pastillero) que anclan la escena en lo real sin protagonizarla.
5. **Qué transmite la escena:** una o dos frases explícitas sobre el concepto que la imagen debe comunicar (ver "Ética de representación" abajo) — esto es lo que más gobierna el resultado, no lo dejes implícito.
6. **Paleta y textura:** 2-3 tonos concretos (ej. "tierra, madera, beige" / "ámbar, beige, maderas claras") + qué textura debe verse (tela, piel, madera, papel).
7. **Ajustes de cámara, siempre al final:** `Apertura f/X, ISO Y, velocidad 1/Z, lente Nmm.` — `35mm` es el default para escena completa/ambiente; `50mm` cuando la escena es un plano más cerrado sobre dos personas en diálogo (como en el ejemplo de artículo). Apertura entre f/2.8 y f/4 (nunca más cerrada — el fondo desenfocado es parte del estilo). ISO 320-800 según cuán cálida/oscura sea la luz descripta.

## Ética de representación (innegociable en cualquier prompt)

Esto viene directo de los prompts ya aprobados y **no se negocia por prompt individual** — es la postura editorial del blog sobre el AT y el cuidado:

- **"Hacer con", nunca "hacer por".** El acompañante/cuidador sostiene el espacio, no reemplaza a la persona. Si hay un AT en la escena, su postura es de escucha activa (cuerpo orientado hacia la otra persona, manos relajadas, sin libreta tomando notas salvo que la escena sea explícitamente sobre planificación) — no de asistencia física a menos que la categoría sea específicamente sobre movilización/higiene (ej. "Guía del Cuidador").
- **Relación horizontal, de pares.** Nunca una composición que ponga a la persona mayor/con discapacidad en posición de objeto pasivo y al profesional en posición de autoridad activa.
- **Sin estigma visual.** Nunca camas de hospital, rejas, sujeciones, batas blancas, guantes ni equipos clínicos — salvo que la categoría sea literalmente "Sistema de Salud", y aun ahí el foco es lo administrativo/logístico, no lo médico-dramático.
- **Sin dramatización del sufrimiento.** El cansancio, el duelo o la angustia se transmiten con gestos contenidos (mirada perdida, codos en las rodillas, silencio) — nunca con llanto explícito, colapso o crisis en cuadro.
- **Autonomía y dignidad como default**, incluso en categorías sobre vejez/discapacidad/salud mental: la persona está activa, presente y con agencia en la escena, no reducida a su diagnóstico.
- **Diversidad etaria y de roles realista** para Latinoamérica — no asumas que "persona cuidada" es siempre igual a "adulta mayor pasiva en sillón".

## Plantilla — portada de artículo

Una escena **específica y narrativa**, atada a la tesis concreta de ese artículo (no una escena genérica de la categoría a la que pertenece). Se arma así:

```
Fotografía ultrarealista, estilo documental cálido, 35mm, grano sutil, profundidad de campo selectiva,
[iluminación específica de la escena]. [Escenario doméstico/cotidiano concreto, con 3-4 objetos que lo
anclan]. En el centro de la escena, [sujeto principal: edad, rol, qué hace con las manos/cuerpo,
expresión]. [Segundo sujeto si corresponde: edad, rol, postura, qué transmite su postura corporal].
La escena transmite [la tesis concreta del artículo, en 1-2 frases explícitas]. No hay [elementos a
evitar específicos de este artículo]. [1-2 frases sobre qué se ve al fondo/contexto]. Estilo fotografía
documental de alta calidad, tonos [2-3 colores], texturas visibles ([2-3 texturas concretas]), sensación
de [1-2 palabras: intimidad/calma/dignidad/etc]. Apertura f/[2.8-3.5], ISO [320-500], velocidad 1/125,
lente [35mm o 50mm].
```

El bloque "La escena transmite…" es el más importante: tiene que nombrar explícitamente el concepto central del artículo (ej. "hacer con, no hacer por: la mujer mayor está compartiendo su historia… mientras la acompañante sostiene el espacio con su presencia"), no solo describir la acción física.

## Plantilla — portada de categoría

Una escena **representativa del eje temático completo** de la categoría (no de un artículo puntual) — sigue siendo específica en la acción, pero más genérica en el "quién": cualquier lector de esa categoría tiene que reconocer el tema en 2 segundos.

**Restricción de encuadre — leer antes de escribir cualquier prompt de categoría:** la imagen se genera en 16:9, pero se usa recortada en dos lugares distintos, ambos muy agresivos:

- El encabezado de `CategoryView.vue` recorta a **~1380×280px** (≈4,9:1) — de la altura completa de un 16:9 al mismo ancho, sobrevive solo ~⅓ de la banda vertical central; todo lo que esté en el tercio superior o inferior de la imagen generada **se pierde**.
- La tarjeta de categoría (home/grilla) usa un recorte central más cuadrado — también descarta los bordes izquierdo y derecho.

En la práctica, **solo el centro geométrico de la imagen sobrevive a ambos recortes**. Por eso, además de la fórmula común, todo prompt de categoría debe cerrar con esta instrucción de composición explícita:

```
Composición: dejar mucho aire y espacio negativo alrededor del motivo principal — el sujeto y la acción
central deben estar encuadrados y centrados tanto horizontal como verticalmente, ocupando
aproximadamente el tercio central del cuadro, sin detalles importantes (rostros, manos, objetos clave)
cerca de ningún borde. La imagen se recorta después a una franja horizontal muy angosta desde el centro
y también a un recorte central más cuadrado, así que cualquier elemento relevante fuera del tercio
central de la imagen se pierde por completo.
```

Plantilla completa:

```
Fotografía ultrarealista, estilo documental narrativo, 35mm, grano sutil, [iluminación de la escena].
[Escenario cotidiano concreto, específico de la categoría]. [Sujeto(s): edad aproximada, rol, acción
concreta con las manos/cuerpo que representa el eje de la categoría]. [1-2 objetos de entorno fuera de
foco que anclan la escena]. La escena transmite [el concepto central de la categoría, en 1 frase]. Tonos
[2-3 colores], texturas visibles ([1-2 texturas]). Composición: dejar mucho aire y espacio negativo
alrededor del motivo principal — el sujeto y la acción central deben estar encuadrados y centrados
tanto horizontal como verticalmente, ocupando aproximadamente el tercio central del cuadro, sin
detalles importantes cerca de ningún borde. Apertura f/[3.2-4], ISO [320-500], velocidad 1/125-1/200,
lente 35mm.
```

## Ejemplos ya aprobados (referencia de tono y nivel de detalle)

**Categoría** (Guía del Cuidador — nota: este ejemplo es anterior a la regla de "aire alrededor del motivo", agregala si lo regenerás):

> Fotografía ultrarealista, estilo documental narrativo, 35mm, grano sutil, luz de mañana entrando por una ventana de cocina/baño doméstico. Una cuidadora de unos 45 años ayuda a una persona mayor a trasladarse desde una silla de ruedas hacia un sillón, con una técnica de movilización correcta: rodillas flexionadas, apoyo firme, comunicación visual entre ambas. Se ven a un costado, fuera de foco, elementos cotidianos de cuidado (un vaso con agua, una caja de medicación organizada por días, una toalla doblada). La escena transmite competencia técnica serena, no esfuerzo ni tensión. Tonos cálidos suaves, textura de tela y madera visible. Apertura f/3.5, ISO 400, velocidad 1/160, lente 35mm.

**Artículo** (sobre reminiscencia/"hacer con" en AT con personas mayores):

> Fotografía ultrarealista, estilo documental cálido, 35mm, grano sutil, profundidad de campo selectiva, iluminación natural que entra por una ventana amplia con cortinas ligeras, atmósfera de calma y trabajo terapéutico cotidiano, ambiente doméstico ordenado y acogedor: una sala de estar con una mesa baja, una taza de té, una libreta abierta con anotaciones, un calendario visible en la pared, y una planta en maceta que aporta vida al espacio. En el centro de la escena, una mujer mayor de aproximadamente 78 años está sentada en un sillón cómodo, con una expresión de atención y participación activa. Sostiene en sus manos una fotografía antigua o un objeto personal, y está hablando con una acompañante terapéutica mujer de unos 35 años, que está sentada frente a ella a su misma altura, en una silla baja, con el cuerpo orientado hacia la mujer mayor, escuchando con atención plena y respetuosa. La acompañante no tiene una libreta en la mano ni está tomando notas en ese momento; su postura es de escucha activa, con las manos relajadas sobre sus rodillas, la mirada cálida y presente. La escena transmite el concepto de "hacer con", no "hacer por": la mujer mayor está compartiendo su historia, recordando, ejercitando su memoria y su identidad a través del relato, mientras la acompañante sostiene el espacio con su presencia. No hay elementos médicos visibles (sin batas, sin guantes, sin equipos clínicos). La relación que se ve es horizontal, respetuosa, de pares en el diálogo. La luz cálida ilumina sus rostros y los objetos cotidianos que las rodean. Al fondo, ligeramente desenfocado, se ve el resto del hogar, sugiriendo que el trabajo ocurre en el entorno natural de la persona, no en un consultorio. La imagen subraya que el acompañamiento terapéutico no es asistencia física ni reemplazo de funciones, sino presencia profesional que habilita a la persona mayor a mantenerse activa y vinculada con su propia vida. Estilo fotografía documental de alta calidad, tonos cálidos (ámbar, beige, maderas claras), texturas visibles (arrugas de la ropa, líneas de expresión, textura de la madera), sensación de intimidad, respeto y realismo cotidiano. Apertura f/2.8, ISO 400, velocidad 1/125, lente 50mm.

## Al terminar

Si generás prompts nuevos de categoría, considerá actualizar `docs/features/category-image-prompts.md` (o crear un doc nuevo si son categorías agregadas después del original) para que quede como referencia, igual que con el set original — ver convención de `docs/features/` en `CLAUDE.md`.
