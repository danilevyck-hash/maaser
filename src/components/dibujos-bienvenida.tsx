"use client";

/**
 * Los dibujos de la bienvenida: la pantalla de la que se está hablando,
 * dibujada con cuatro rayas.
 *
 * Son de LÍNEA, sin emojis y sin capturas: un marco de teléfono, renglones
 * grises, y en tinta negra lo único que importa en esa página. El verde y el
 * rojo aparecen solo cuando significan algo (pagó · debe), igual que en la app.
 */

const RAYA = "#E5E5EA";
const GRIS = "#AEAEB2";
const TINTA = "#1C1C1E";
const VERDE = "#34C759";
const ROJO = "#FF3B30";

function Lienzo({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 200" width="160" height="200" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="148" height="188" rx="20" stroke={RAYA} strokeWidth="1.5" />
      {children}
    </svg>
  );
}

/** Una raya de texto. */
function T({ x, y, w, h = 5, c = RAYA }: { x: number; y: number; w: number; h?: number; c?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} />;
}

/** El dedo: un anillo punteado donde se toca. */
function Toque({ cx, cy, r = 13 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} stroke={TINTA} strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r={r - 7} fill={TINTA} opacity="0.12" />
    </>
  );
}

function Circulo({ cx, cy, estado = "vacio", r = 9 }: { cx: number; cy: number; estado?: "vacio" | "pagado" | "adelanto" | "debe"; r?: number }) {
  const color = estado === "pagado" || estado === "adelanto" ? VERDE : estado === "debe" ? ROJO : GRIS;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1.5" fill={estado === "pagado" || estado === "debe" ? color : "none"} />
      {estado === "pagado" && <path d={`M${cx - 4} ${cy} l3 3 5 -5.5`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      {estado === "adelanto" && <path d={`M${cx - 4} ${cy} l3 3 5 -5.5`} stroke={VERDE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      {estado === "debe" && <path d={`M${cx - 3.5} ${cy - 3.5} l7 7 M${cx + 3.5} ${cy - 3.5} l-7 7`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />}
    </>
  );
}

/** El título de la pantalla, arriba. */
function Encabezado({ conMas = false, conFlecha = false }: { conMas?: boolean; conFlecha?: boolean }) {
  return (
    <>
      {conFlecha && <path d="M28 24l-5 4 5 4" stroke={TINTA} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      {conFlecha && <T x={33} y={26} w={22} c={GRIS} />}
      {conMas && <path d="M130 24v9M125.5 28.5h9" stroke={TINTA} strokeWidth="1.5" strokeLinecap="round" />}
      <T x={22} y={44} w={62} h={11} c={TINTA} />
      <T x={22} y={62} w={78} c={GRIS} />
    </>
  );
}

/** Un renglón de la lista: nombre, inquilino y su círculo. */
function Fila({ y, estado = "vacio", destacada = false }: { y: number; estado?: "vacio" | "pagado" | "adelanto" | "debe"; destacada?: boolean }) {
  return (
    <>
      <line x1="16" y1={y - 8} x2="144" y2={y - 8} stroke={RAYA} strokeWidth="1" />
      <T x={22} y={y - 4} w={destacada ? 54 : 44} h={6} c={destacada ? TINTA : GRIS} />
      <T x={22} y={y + 6} w={34} h={4} c={RAYA} />
      <Circulo cx={130} cy={y + 2} estado={estado} />
    </>
  );
}

/** La hoja que sube de abajo. */
function Hoja({ lineas = 3 }: { lineas?: number }) {
  return (
    <>
      <rect x="16" y={188 - lineas * 20} width="128" height={lineas * 20 + 2} rx="12" stroke={TINTA} strokeWidth="1.5" fill="#fff" />
      {Array.from({ length: lineas }).map((_, i) => (
        <T key={i} x={40} y={188 - lineas * 20 + 13 + i * 20} w={80} h={5} c={i === lineas - 1 ? TINTA : GRIS} />
      ))}
    </>
  );
}

function Formulario({ desde = 70, cuantos = 4, conRojo = false }: { desde?: number; cuantos?: number; conRojo?: boolean }) {
  return (
    <>
      {Array.from({ length: cuantos }).map((_, i) => (
        <g key={i}>
          <T x={22} y={desde + i * 24} w={26} h={4} c={GRIS} />
          <rect x="22" y={desde + i * 24 + 8} width="116" height="12" rx="6" stroke={RAYA} strokeWidth="1.2" />
        </g>
      ))}
      {conRojo && <T x={50} y={desde + cuantos * 24 + 8} w={60} h={6} c={ROJO} />}
    </>
  );
}

const DIBUJOS = {
  /* ── Propiedades ── */
  "p-circulo": (
    <Lienzo>
      <Encabezado />
      <Fila y={92} />
      <Fila y={126} destacada />
      <Fila y={160} />
      <Toque cx={130} cy={128} />
    </Lienzo>
  ),
  "p-check": (
    <Lienzo>
      <Encabezado />
      <Fila y={92} estado="pagado" />
      <Fila y={126} estado="adelanto" />
      <Hoja lineas={3} />
      <Toque cx={130} cy={94} />
    </Lienzo>
  ),
  "p-rojo": (
    <Lienzo>
      <Encabezado />
      <Fila y={92} destacada />
      <T x={22} y={100} w={48} h={5} c={ROJO} />
      <Toque cx={46} cy={102} r={11} />
      <Hoja lineas={3} />
    </Lienzo>
  ),
  "p-mes": (
    <Lienzo>
      <Encabezado conFlecha />
      <Fila y={100} />
      <Fila y={134} estado="pagado" />
      <Fila y={168} />
      <Toque cx={26} cy={28} r={11} />
    </Lienzo>
  ),
  "p-nombre": (
    <Lienzo>
      <Encabezado />
      <Fila y={92} destacada />
      <Toque cx={44} cy={90} r={12} />
      <T x={22} y={124} w={70} h={9} c={TINTA} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Circulo
          key={i}
          cx={26 + (i % 6) * 21}
          cy={150 + Math.floor(i / 6) * 24}
          r={7}
          estado={i < 4 ? "pagado" : i === 7 ? "debe" : "vacio"}
        />
      ))}
    </Lienzo>
  ),
  "p-editar": (
    <Lienzo>
      <T x={104} y={24} w={34} h={6} c={TINTA} />
      <T x={22} y={44} w={62} h={11} c={TINTA} />
      <Formulario desde={72} cuantos={4} conRojo />
    </Lienzo>
  ),
  "p-mas": (
    <Lienzo>
      <Encabezado conMas />
      <Fila y={100} />
      <Fila y={134} />
      <Toque cx={130} cy={28} r={12} />
    </Lienzo>
  ),
  "p-recargo": (
    <Lienzo>
      <T x={22} y={30} w={62} h={9} c={TINTA} />
      <T x={22} y={60} w={80} h={4} c={GRIS} />
      <rect x="22" y="72" width="34" height="16" rx="8" stroke={TINTA} strokeWidth="1.2" />
      <rect x="64" y="72" width="34" height="16" rx="8" stroke={TINTA} strokeWidth="1.2" />
      <path d="M108 76.5l6 7M108.5 77a1.5 1.5 0 100-.1M113.5 83a1.5 1.5 0 100-.1" stroke={TINTA} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="16" y1="110" x2="144" y2="110" stroke={RAYA} />
      <T x={22} y={124} w={44} h={6} c={TINTA} />
      <T x={22} y={138} w={64} h={5} c={ROJO} />
      <Circulo cx={130} cy={132} estado="debe" />
    </Lienzo>
  ),
  "p-aviso": (
    <Lienzo>
      <Encabezado />
      <rect x="18" y="80" width="124" height="26" rx="10" stroke={GRIS} strokeWidth="1.2" />
      <T x={26} y={88} w={90} h={5} c={TINTA} />
      <T x={26} y={97} w={60} h={4} c={GRIS} />
      <Fila y={132} />
      <Fila y={166} />
    </Lienzo>
  ),

  /* ── Maaser ── */
  "m-anotar": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      <T x={40} y={54} w={80} h={18} c={TINTA} />
      <rect x="22" y="86" width="30" height="14" rx="7" stroke={GRIS} strokeWidth="1.2" />
      <rect x="58" y="86" width="30" height="14" rx="7" stroke={GRIS} strokeWidth="1.2" />
      <rect x="94" y="86" width="30" height="14" rx="7" stroke={TINTA} strokeWidth="1.4" />
      <Formulario desde={112} cuantos={2} />
      <rect x="22" y="166" width="116" height="18" rx="9" fill={TINTA} />
    </Lienzo>
  ),
  "m-repite": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      <Formulario desde={56} cuantos={2} />
      <line x1="16" y1="112" x2="144" y2="112" stroke={RAYA} />
      <T x={22} y={124} w={62} h={6} c={TINTA} />
      <rect x="106" y="120" width="32" height="18" rx="9" fill={VERDE} />
      <circle cx="130" cy="129" r="7" fill="#fff" />
      <T x={22} y={156} w={92} h={5} c={GRIS} />
      <T x={22} y={168} w={68} h={5} c={GRIS} />
    </Lienzo>
  ),
  "m-anio": (
    <Lienzo>
      <T x={30} y={24} w={20} h={5} c={GRIS} />
      <T x={110} y={24} w={20} h={5} c={GRIS} />
      <T x={54} y={40} w={52} h={11} c={TINTA} />
      {[26, 44, 18, 56, 34, 62, 28, 48].map((h, i) => (
        <rect key={i} x={22 + i * 15} y={140 - h} width="9" height={h} rx="2" fill={i === 5 ? TINTA : RAYA} />
      ))}
      <line x1="16" y1="146" x2="144" y2="146" stroke={RAYA} />
      <T x={22} y={158} w={60} h={5} c={GRIS} />
      <T x={22} y={172} w={44} h={5} c={GRIS} />
    </Lienzo>
  ),
  "m-editar": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      <Fila y={80} />
      <Fila y={114} destacada />
      <Fila y={148} />
      <Toque cx={60} cy={112} r={12} />
    </Lienzo>
  ),
  "m-buscar": (
    <Lienzo>
      <rect x="22" y="30" width="116" height="18" rx="9" stroke={TINTA} strokeWidth="1.4" />
      <path d="M32 39a4 4 0 108 0 4 4 0 00-8 0zM43 42l4 4" stroke={TINTA} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M80 62v26M74 82l6 6 6-6" stroke={TINTA} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Fila y={120} />
      <Fila y={154} />
    </Lienzo>
  ),

  /* ── Por Cobrar ── */
  "c-cliente": (
    <Lienzo>
      <Encabezado />
      <Fila y={100} />
      <Fila y={134} />
      <circle cx="126" cy="166" r="16" fill={TINTA} />
      <path d="M126 158v16M118 166h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <Toque cx={126} cy={166} r={22} />
    </Lienzo>
  ),
  "c-movimiento": (
    <Lienzo>
      <T x={22} y={30} w={56} h={9} c={TINTA} />
      <Fila y={80} />
      <Fila y={114} />
      <rect x="22" y="150" width="54" height="20" rx="10" stroke={TINTA} strokeWidth="1.4" />
      <rect x="84" y="150" width="54" height="20" rx="10" stroke={TINTA} strokeWidth="1.4" />
      <T x={34} y={158} w={30} h={5} c={TINTA} />
      <T x={96} y={158} w={30} h={5} c={TINTA} />
    </Lienzo>
  ),
  "c-whatsapp": (
    <Lienzo>
      <T x={22} y={30} w={56} h={9} c={TINTA} />
      <rect x="22" y="56" width="116" height="20" rx="10" stroke={VERDE} strokeWidth="1.5" />
      <T x={44} y={63} w={72} h={6} c={VERDE} />
      <Fila y={110} />
      <Fila y={144} />
      <Toque cx={80} cy={66} r={14} />
    </Lienzo>
  ),
  "c-saldo": (
    <Lienzo>
      <T x={22} y={30} w={60} h={6} c={GRIS} />
      <T x={22} y={46} w={86} h={18} c={ROJO} />
      <Fila y={110} />
      <Fila y={144} />
    </Lienzo>
  ),

  /* ── Finanzas ── */
  "f-gasto": (
    <Lienzo>
      <Encabezado />
      <Fila y={100} />
      <Fila y={134} />
      <circle cx="126" cy="166" r="16" fill={TINTA} />
      <path d="M126 158v16M118 166h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <Toque cx={126} cy={166} r={22} />
    </Lienzo>
  ),
  "f-presupuesto": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      <T x={22} y={58} w={40} h={6} c={TINTA} />
      <rect x="22" y="72" width="116" height="8" rx="4" fill={RAYA} />
      <rect x="22" y="72" width="76" height="8" rx="4" fill={TINTA} />
      <T x={22} y={90} w={64} h={4} c={GRIS} />
      <T x={22} y={118} w={40} h={6} c={TINTA} />
      <rect x="22" y="132" width="116" height="8" rx="4" fill={RAYA} />
      <rect x="22" y="132" width="110" height="8" rx="4" fill={ROJO} />
      <T x={22} y={150} w={54} h={4} c={GRIS} />
    </Lienzo>
  ),
  "f-resumen": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      {[30, 52, 24, 60, 40, 48].map((h, i) => (
        <rect key={i} x={22 + i * 20} y={140 - h} width="12" height={h} rx="3" fill={i === 3 ? TINTA : RAYA} />
      ))}
      <line x1="16" y1="146" x2="144" y2="146" stroke={RAYA} />
      <T x={22} y={158} w={70} h={5} c={GRIS} />
      <T x={22} y={172} w={50} h={5} c={GRIS} />
    </Lienzo>
  ),
  "f-config": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      <Formulario desde={58} cuantos={2} />
      <line x1="16" y1="116" x2="144" y2="116" stroke={RAYA} />
      <T x={22} y={128} w={62} h={6} c={TINTA} />
      <rect x="106" y="124" width="32" height="18" rx="9" fill={VERDE} />
      <circle cx="130" cy="133" r="7" fill="#fff" />
      <T x={22} y={162} w={50} h={5} c={GRIS} />
    </Lienzo>
  ),

  /* ── InDriver ── */
  "i-gasto": (
    <Lienzo>
      <T x={22} y={30} w={56} h={6} c={GRIS} />
      <T x={22} y={44} w={72} h={16} c={TINTA} />
      <rect x="82" y="74" width="56" height="20" rx="10" fill={TINTA} />
      <path d="M96 84h12M102 78v12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <Fila y={124} />
      <Fila y={158} />
      <Toque cx={110} cy={84} r={16} />
    </Lienzo>
  ),
  "i-mes": (
    <Lienzo>
      <T x={22} y={30} w={56} h={6} c={GRIS} />
      <T x={22} y={44} w={72} h={16} c={TINTA} />
      <rect x="22" y="74" width="64" height="18" rx="9" stroke={TINTA} strokeWidth="1.4" />
      <path d="M74 81l4 4 4-4" stroke={TINTA} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <Toque cx={54} cy={83} r={14} />
      <Fila y={126} />
      <Fila y={160} />
    </Lienzo>
  ),
  "i-resumen": (
    <Lienzo>
      <T x={22} y={30} w={50} h={9} c={TINTA} />
      {[40, 28, 54, 36, 60, 30].map((h, i) => (
        <rect key={i} x={22 + i * 20} y={120 - h} width="12" height={h} rx="3" fill={i === 4 ? TINTA : RAYA} />
      ))}
      <line x1="16" y1="130" x2="144" y2="130" stroke={RAYA} />
      <rect x="22" y="146" width="116" height="20" rx="10" stroke={TINTA} strokeWidth="1.4" />
      <path d="M74 152v9M70 157l4 4 4-4" stroke={TINTA} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <T x={84} y={154} w={40} h={5} c={TINTA} />
    </Lienzo>
  ),
} as const;

export type NombreDeDibujo = keyof typeof DIBUJOS;

export function Dibujo({ nombre }: { nombre: NombreDeDibujo }) {
  return DIBUJOS[nombre];
}
