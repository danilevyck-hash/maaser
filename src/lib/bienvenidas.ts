/**
 * Qué dice la bienvenida de cada módulo.
 *
 * Una página por cada cosa que se puede hacer de verdad en esa pantalla: está
 * leído del código, no inventado. Si se agrega una función, se agrega su
 * página aquí y se sube la `version` para que vuelva a salir sola.
 */

import type { PaginaDeBienvenida } from "@/components/Bienvenida";

export type Bienvenida = {
  modulo: string;
  version: number;
  titulo: string;
  paginas: PaginaDeBienvenida[];
};

export const BIENVENIDA_PROPIEDADES: Bienvenida = {
  modulo: "propiedades",
  version: 1,
  titulo: "Propiedades",
  paginas: [
    {
      dibujo: "p-circulo",
      titulo: "Toca el círculo cuando te paguen",
      texto: "Queda marcado con la fecha de hoy. Un mes sin marcar no debe nada.",
    },
    {
      dibujo: "p-check",
      titulo: "Toca el ✓ si pagó por adelantado",
      texto: "Eliges hasta qué mes y quedan todos marcados. Ahí mismo está «No ha pagado» si te equivocaste.",
    },
    {
      dibujo: "p-rojo",
      titulo: "La palabra roja cobra",
      texto: "Abre WhatsApp con el mensaje ya escrito, o marca que ya te pagó.",
    },
    {
      dibujo: "p-mes",
      titulo: "Con ‹ ves un mes anterior",
      texto: "Y vuelves con ›. Nunca te lleva a un mes que todavía no llegó.",
    },
    {
      dibujo: "p-nombre",
      titulo: "Toca el nombre para ver la propiedad",
      texto: "El inquilino, su celular, el contrato y cada año en doce círculos.",
    },
    {
      dibujo: "p-editar",
      titulo: "Editar guarda lo que no cambia",
      texto: "Propiedad, inquilino, celular, alquiler y contrato. Abajo, «Se fue el inquilino» cierra el contrato sin borrar nada.",
    },
    {
      dibujo: "p-mas",
      titulo: "El + agrega una propiedad",
      texto: "Solo pide el nombre; lo demás lo pones en Editar.",
    },
    {
      dibujo: "p-recargo",
      titulo: "El recargo se pone en Editar",
      texto: "A partir de qué día y de cuánto por ciento. Si no lo llenas, no existe.",
    },
    {
      dibujo: "p-aviso",
      titulo: "Un contrato que vence te avisa",
      texto: "Una línea arriba, 60 días antes, y se va sola.",
    },
  ],
};

export const BIENVENIDA_MAASER: Bienvenida = {
  modulo: "maaser",
  version: 1,
  titulo: "Maaser",
  paginas: [
    {
      dibujo: "m-anotar",
      titulo: "Anotar es una sola pantalla",
      texto: "El monto, a quién, el cheque, cómo pagaste y una nota. Los montos de siempre están en botones y el cheque se propone solo.",
    },
    {
      dibujo: "m-repite",
      titulo: "Prende «Se repite cada mes»",
      texto: "Lo que das todos los meses te espera arriba, listo para anotarlo de un toque.",
    },
    {
      dibujo: "m-anio",
      titulo: "Toca el número para ver el año",
      texto: "Cada mes es una barra, con ‹ y › cambias de año, y en «···» están los beneficiarios y exportar.",
    },
    {
      dibujo: "m-editar",
      titulo: "Toca una donación para cambiarla",
      texto: "Se abre igual que al anotar, y desde ahí también se borra.",
    },
    {
      dibujo: "m-buscar",
      titulo: "Desliza hacia abajo para buscar",
      texto: "Escribes un nombre y la lista se queda con lo suyo.",
    },
  ],
};

export const BIENVENIDA_POR_COBRAR: Bienvenida = {
  modulo: "por-cobrar",
  version: 1,
  titulo: "Por Cobrar",
  paginas: [
    {
      dibujo: "c-cliente",
      titulo: "El + agrega un cliente",
      texto: "Su nombre y su celular.",
    },
    {
      dibujo: "c-movimiento",
      titulo: "Abre un cliente para anotar",
      texto: "Un cargo cuando le fías, un abono cuando te paga.",
    },
    {
      dibujo: "c-whatsapp",
      titulo: "Compártele el estado por WhatsApp",
      texto: "Le llega el detalle y lo que queda debiendo.",
    },
    {
      dibujo: "c-saldo",
      titulo: "Arriba está el total por cobrar",
      texto: "Y cada cliente dice su saldo, o «Al día».",
    },
  ],
};

export const BIENVENIDA_FINANZAS: Bienvenida = {
  modulo: "finanzas",
  version: 1,
  titulo: "Finanzas",
  paginas: [
    {
      dibujo: "f-gasto",
      titulo: "El + anota un gasto",
      texto: "El monto, la categoría, la fecha y cómo pagaste.",
    },
    {
      dibujo: "f-presupuesto",
      titulo: "Cada categoría dice cuánto queda",
      texto: "Del presupuesto que le pusiste a ese mes.",
    },
    {
      dibujo: "f-resumen",
      titulo: "Resumen es el año mes por mes",
      texto: "Con lo que pesa cada uno.",
    },
    {
      dibujo: "f-config",
      titulo: "En Config están los presupuestos",
      texto: "Las categorías, lo que se repite cada mes y los avisos.",
    },
  ],
};

export const BIENVENIDA_INDRIVER: Bienvenida = {
  modulo: "indriver",
  version: 1,
  titulo: "InDriver",
  paginas: [
    {
      dibujo: "i-gasto",
      titulo: "+ Nuevo Gasto al terminar el día",
      texto: "La fecha, el monto y una nota.",
    },
    {
      dibujo: "i-mes",
      titulo: "Arriba está el total del mes",
      texto: "Y puedes cambiar de mes y de año.",
    },
    {
      dibujo: "i-resumen",
      titulo: "Resumen suma todo el año",
      texto: "Mes por mes, y Exportar te lo baja en un archivo.",
    },
  ],
};
