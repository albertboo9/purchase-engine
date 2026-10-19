"use client";

/**
 * Récapitulatif de l'achat (ADR-0020, D1) : visuel, nature, ce que l'on obtient, lignes de prix (prix catalogue,
 * promotion, code, licences, palier), total animé, code promo. Tous les montants viennent du serveur.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BadgeCheck, ChevronDown, Gavel, GraduationCap, Loader2, Sparkles, Ticket, Users, X, FileCheck2, Building2 } from "lucide-react";
import { money } from "@/lib/checkout/money";
import type { AppliedCoupon, CheckoutContext, Quote } from "@/lib/checkout/types";
import type { CheckoutCopy } from "@/lib/checkout/copy";
import { AnimatedAmount, DrawnCheck, Pill } from "./primitives";
import { Blason } from "../brand/Brand";

const TYPE_ICON = {
  B2C_COURSE: GraduationCap, B2B_PACKAGE: Building2, B2B_THEMATIQUE: Users,
  ADMISSION_OFFER: BadgeCheck, ADMISSION_FEE: FileCheck2, AUCTION_PAYMENT: Gavel,
} as const;

function Cover({ ctx }: { ctx: CheckoutContext }) {
  const src = ctx.thumbnailUrl || ctx.imageUrl;
  const Icon = TYPE_ICON[ctx.type];
  return (
    <div className="relative h-28 overflow-hidden rounded-[22px] [@media(min-height:860px)]:h-36">
      {src ? (
        <motion.img src={src} alt="" className="h-full w-full object-cover" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
      ) : (
        <div className="relative h-full w-full bg-gradient-to-br from-indigo-600 via-violet-700 to-[var(--color-blason)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(134,227,184,0.18),transparent_40%)]" />
          <motion.div className="absolute -right-6 -bottom-8 opacity-20" animate={{ rotate: [0, 4, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
            <span className="block brightness-0 invert"><Blason size={170} /></span>
          </motion.div>
          <div className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur"><Icon size={20} /></div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "discount" | "muted" }) {
  return (
    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="text-soft">{label}</span>
      <span className={`tabular-nums font-semibold ${tone === "discount" ? "text-mint-600 dark:text-mint-400" : tone === "muted" ? "text-muted line-through" : ""}`}>{value}</span>
    </motion.div>
  );
}

export function CouponField({ onApply, applied, onRemove, busy, error }: { onApply: (code: string) => void; applied: AppliedCoupon | null; onRemove: () => void; busy: boolean; error: string | null }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  if (applied) {
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-between rounded-2xl border border-mint-500/30 bg-mint-50 px-4 py-3 dark:bg-mint-500/10">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-mint-700 dark:text-mint-400">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-mint-500 text-white"><DrawnCheck size={13} /></span>
          {applied.code}{applied.label ? ` · ${applied.label}` : ""}
        </span>
        <button type="button" onClick={onRemove} className="rounded-full p-1 text-mint-700 hover:bg-mint-100 dark:text-mint-400 dark:hover:bg-mint-500/20" aria-label="Retirer le code"><X size={15} /></button>
      </motion.div>
    );
  }
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-2 text-[13.5px] font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-300">
        <Ticket size={15} /> J’ai un code promo
        <ChevronDown size={15} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden" onSubmit={(e) => { e.preventDefault(); if (code.trim()) onApply(code.trim().toUpperCase()); }}
          >
            <div className="flex gap-2 pt-3">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RENTREE-2026" aria-label="Code promo" autoComplete="off" spellCheck={false} className="field font-mono tracking-wider uppercase" aria-invalid={error ? true : undefined} />
              <button type="submit" disabled={busy || !code.trim()} className="shrink-0 rounded-2xl bg-[var(--ink)] px-4 text-[13.5px] font-semibold text-[var(--surface)] transition disabled:opacity-40">
                {busy ? <Loader2 size={16} className="animate-spin" /> : "Appliquer"}
              </button>
            </div>
            <AnimatePresence>{error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-2 text-[12.5px] font-medium text-rose-600 dark:text-rose-400">{error}</motion.p>}</AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Réassurance en bandeau : une promesse à la fois, qui défile doucement (immobile si l'utilisateur réduit les animations). */
function Reassurance({ items }: { items: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 3800);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="flex h-11 items-center gap-2.5 overflow-hidden rounded-2xl bg-[var(--field)] px-3.5" aria-label={items.join(". ")}>
      <BadgeCheck size={16} className="shrink-0 text-mint-600 dark:text-mint-400" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={i % items.length} aria-hidden initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="line-clamp-1 text-[12.5px] text-soft">{items[i % items.length]}</motion.span>
      </AnimatePresence>
    </div>
  );
}

export function Summary({ ctx, copy, quote, coupon, total, couponSlot }: {
  ctx: CheckoutContext; copy: CheckoutCopy; quote: Quote | null; coupon: AppliedCoupon | null; total: number; couponSlot?: React.ReactNode;
}) {
  const licence = ctx.pricing?.unit === "licence";
  const list = Number(ctx.listPrice ?? ctx.price);
  const promoSaving = ctx.promotion && list > ctx.price ? list - ctx.price : 0;
  return (
    <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="card overflow-hidden p-3">
      <Cover ctx={ctx} />
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill>{copy.eyebrow}</Pill>
            <AnimatePresence>{copy.badge && <motion.span key={copy.badge} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><Pill tone={/^À (régler|finaliser)/.test(copy.badge) ? "coral" : "mint"}><Sparkles size={12} />{copy.badge}</Pill></motion.span>}</AnimatePresence>
          </div>
          <h3 className="line-clamp-2 font-display text-[19px] font-semibold leading-snug">{ctx.title}</h3>
          {ctx.subtitle && <p className="mt-1 text-[13.5px] text-muted">{ctx.subtitle}</p>}
        </div>

        {!!ctx.features?.length && (
          <ul className="space-y-2">
            {ctx.features.slice(0, 3).map((f, i) => (
              <motion.li key={f} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><DrawnCheck size={11} /></span>{f}
              </motion.li>
            ))}
          </ul>
        )}

        {couponSlot}

        <div className="space-y-2 border-t hairline pt-3.5">
          <AnimatePresence initial={false}>
            {licence && quote && <Line key="unit" label={`${quote.seats} licence${quote.seats > 1 ? "s" : ""} × ${money(quote.basePrice, ctx.currency)}`} value={money(Number(quote.basePrice) * quote.seats, ctx.currency)} />}
            {licence && quote && Number(quote.discountRate) > 0 && <Line key="tier" label={`Tarif dégressif${quote.discountLabel ? ` (${quote.discountLabel})` : ""}`} value={`−${money(Number(quote.basePrice) * quote.seats - Number(quote.total), ctx.currency)}`} tone="discount" />}
            {!licence && promoSaving > 0 && <Line key="list" label="Prix catalogue" value={money(list, ctx.currency)} tone="muted" />}
            {!licence && promoSaving > 0 && <Line key="promo" label={`Promotion −${ctx.promotion!.percent} %`} value={`−${money(promoSaving, ctx.currency)}`} tone="discount" />}
            {coupon && Number(coupon.discountAmount) > 0 && <Line key="coupon" label={`Code ${coupon.code}`} value={`−${money(coupon.discountAmount, ctx.currency)}`} tone="discount" />}
          </AnimatePresence>
          <div className="flex items-end justify-between gap-3 pt-1">
            <span className="whitespace-nowrap text-[14px] font-semibold">Total à payer</span>
            <AnimatedAmount value={total} currency={ctx.currency} className="font-display text-[28px] font-semibold leading-none" />
          </div>
          <p className="text-right text-[11.5px] text-muted">Taxes incluses le cas échéant · montant débité tel qu’affiché</p>
        </div>

        <Reassurance items={copy.reassurance} />
      </div>
    </motion.aside>
  );
}
