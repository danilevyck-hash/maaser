import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { getPreviousHebrewMonth, getCurrentHebrewYear, getHebrewYearData } from "@/lib/hebrew-year";
import { formatCurrency } from "@/lib/format";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const TZEDAKA_QUOTES = [
  "\"Más que Israel ha guardado el Shabat, el Shabat ha guardado a Israel.\" La tzedaká sostiene al mundo.",
  "\"El que da tzedaká con alegría, su recompensa es multiplicada.\" — Talmud",
  "\"No es obligación terminar la tarea, pero tampoco eres libre de abandonarla.\" — Pirkei Avot 2:16",
  "\"Quien salva una vida, es como si salvara al mundo entero.\" — Talmud, Sanhedrín 37a",
  "\"La tzedaká es igual en importancia a todos los demás mandamientos juntos.\" — Talmud, Baba Batra 9a",
  "\"El mundo se sostiene sobre tres cosas: la Torá, el servicio a Dios y los actos de bondad.\" — Pirkei Avot 1:2",
];

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.SUMMARY_EMAIL;
  if (!email) {
    return NextResponse.json({ error: "SUMMARY_EMAIL not configured" }, { status: 500 });
  }

  try {
    // Get previous Hebrew month range
    const prevMonth = getPreviousHebrewMonth();
    const hebrewYear = getCurrentHebrewYear();
    const yearData = getHebrewYearData(hebrewYear);

    // Query donations for previous month
    const { data: donations, error: donError } = await supabase
      .from("donations")
      .select("*")
      .gte("date", prevMonth.from)
      .lte("date", prevMonth.to)
      .eq("status", "valido")
      .order("amount", { ascending: false });

    if (donError) {
      return NextResponse.json({ error: donError.message }, { status: 500 });
    }

    const monthDonations = donations || [];
    const totalMonth = monthDonations.reduce((sum, d) => sum + d.amount, 0);
    const donationCount = monthDonations.length;

    // Top 3 beneficiaries
    const beneficiaryTotals = new Map<string, number>();
    for (const d of monthDonations) {
      beneficiaryTotals.set(d.beneficiary, (beneficiaryTotals.get(d.beneficiary) || 0) + d.amount);
    }
    const topBeneficiaries = Array.from(beneficiaryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Annual goal progress
    const { data: goalData } = await supabase
      .from("annual_goals")
      .select("goal_amount")
      .eq("year", hebrewYear)
      .single();

    const goalAmount = goalData?.goal_amount || 0;

    // Total donated this Hebrew year so far
    const { data: yearDonations } = await supabase
      .from("donations")
      .select("amount")
      .gte("date", yearData.startDate)
      .lte("date", yearData.endDate)
      .eq("status", "valido");

    const totalYear = (yearDonations || []).reduce((sum, d) => sum + d.amount, 0);
    const goalProgress = goalAmount > 0 ? Math.min((totalYear / goalAmount) * 100, 100) : 0;

    // Pick random quote
    const quote = TZEDAKA_QUOTES[Math.floor(Math.random() * TZEDAKA_QUOTES.length)];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maaser.vercel.app";

    // Build email HTML
    const html = buildEmailHtml({
      monthName: prevMonth.name,
      hebrewYear,
      totalMonth,
      donationCount,
      topBeneficiaries,
      goalAmount,
      totalYear,
      goalProgress,
      quote,
      appUrl,
    });

    // Send via Resend
    const { error: sendError } = await getResend().emails.send({
      from: "Maaser <noreply@resend.dev>",
      to: email,
      subject: `Resumen de Maaser — ${prevMonth.name} ${hebrewYear}`,
      html,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      month: prevMonth.name,
      totalMonth,
      donationCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---- Email Template ----

function buildEmailHtml(data: {
  monthName: string;
  hebrewYear: number;
  totalMonth: number;
  donationCount: number;
  topBeneficiaries: [string, number][];
  goalAmount: number;
  totalYear: number;
  goalProgress: number;
  quote: string;
  appUrl: string;
}): string {
  const beneficiaryRows = data.topBeneficiaries.length > 0
    ? data.topBeneficiaries
        .map(
          ([name, amount], i) =>
            `<tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 16px; color: #374151;">${i + 1}. ${name}</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 16px; color: #1A3A5C; font-weight: bold; text-align: right;">${formatCurrency(amount)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding: 16px; text-align: center; color: #9ca3af; font-size: 16px;">No hubo donaciones este mes</td></tr>`;

  const progressBarWidth = Math.round(data.goalProgress);
  const goalSection = data.goalAmount > 0
    ? `
      <div style="margin-top: 32px;">
        <h2 style="font-size: 18px; color: #1A3A5C; margin: 0 0 12px 0;">Meta Anual ${data.hebrewYear}</h2>
        <div style="background: #e5e7eb; border-radius: 12px; height: 24px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #C9A84C, #eab308); height: 24px; border-radius: 12px; width: ${progressBarWidth}%; min-width: ${progressBarWidth > 0 ? '24px' : '0'};"></div>
        </div>
        <p style="font-size: 16px; color: #374151; margin: 8px 0 0 0;">
          Has cumplido <strong style="color: #1A3A5C;">${data.goalProgress.toFixed(1)}%</strong> de tu meta
          (${formatCurrency(data.totalYear)} de ${formatCurrency(data.goalAmount)})
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F0E8; font-family: system-ui, -apple-system, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background-color: #1A3A5C; border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px;">&#x2721;</div>
      <h1 style="color: #C9A84C; font-size: 24px; margin: 0;">Resumen de Maaser</h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 8px 0 0 0;">${data.monthName} ${data.hebrewYear}</p>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 32px 24px; border-radius: 0 0 16px 16px;">

      <!-- KPIs -->
      <div style="display: flex; gap: 16px; margin-bottom: 32px;">
        <div style="flex: 1; background: #f9fafb; border-left: 4px solid #C9A84C; border-radius: 8px; padding: 16px;">
          <p style="font-size: 14px; color: #6b7280; margin: 0; text-transform: uppercase;">Total Donado</p>
          <p style="font-size: 28px; font-weight: bold; color: #1A3A5C; margin: 4px 0 0 0;">${formatCurrency(data.totalMonth)}</p>
        </div>
        <div style="flex: 1; background: #f9fafb; border-left: 4px solid #1A3A5C; border-radius: 8px; padding: 16px;">
          <p style="font-size: 14px; color: #6b7280; margin: 0; text-transform: uppercase;">Donaciones</p>
          <p style="font-size: 28px; font-weight: bold; color: #1A3A5C; margin: 4px 0 0 0;">${data.donationCount}</p>
        </div>
      </div>

      <!-- Top Beneficiaries -->
      <h2 style="font-size: 18px; color: #1A3A5C; margin: 0 0 12px 0;">Principales Beneficiarios</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        ${beneficiaryRows}
      </table>

      <!-- Goal Progress -->
      ${goalSection}

      <!-- Quote -->
      <div style="margin-top: 32px; background: #F5F0E8; border-radius: 12px; padding: 20px; text-align: center;">
        <p style="font-size: 15px; color: #4b5563; margin: 0; line-height: 1.6; font-style: italic;">${data.quote}</p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${data.appUrl}/maaser" style="display: inline-block; background-color: #C9A84C; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">Ver mi registro completo</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 16px;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0;">
        Registro de Maaser &mdash; Seguimiento de donaciones
      </p>
      <p style="font-size: 13px; color: #9ca3af; margin: 4px 0 0 0;">
        <a href="${data.appUrl}" style="color: #C9A84C; text-decoration: none;">${data.appUrl.replace(/^https?:\/\//, "")}</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}
