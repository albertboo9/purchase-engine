"use client";

/**
 * Checkout Studies Learning (ADR-0020)
 * ====================================
 * Un seul tunnel pour toutes les natures d'achat : inscription à une formation, achat de licences (package ou
 * thématique d'entreprise), offre d'admission, frais de dossier, enchère remportée. Un tunnel en étapes qui tient
 * dans l'écran, sans défilement : (licences) → identité → paiement. Le serveur calcule tout montant ; le navigateur
 * n'envoie que des choix. Une session de checkout = une clé d'idempotence = un seul paiement.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Gavel, Gift, User } from "lucide-react";
import { toast } from "sonner";
import { Aurora, CheckoutHeader } from "@/components/brand/Brand";
import { Field, PayButton, Segmented, Pill } from "@/components/checkout/primitives";
import { BackButton, NextButton, Recap, StepHeading, StepPanel, Stepper, SummaryBar, SummarySheet, type StepDef } from "@/components/checkout/Steps";
import { CouponField, Summary } from "@/components/checkout/Summary";
import { PaymentMethods } from "@/components/checkout/PaymentMethods";
import { Licences } from "@/components/checkout/Licences";
import { CheckoutSkeleton, RedirectVeil, Unavailable } from "@/components/checkout/States";
import { WaitingRoom } from "@/components/checkout/WaitingRoom";
import { useQueue } from "@/hooks/use-queue";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { useLicenceQuote } from "@/hooks/use-licence-quote";
import { checkoutApi, CheckoutError, sessionKey } from "@/lib/checkout/api";
import { checkoutCopy } from "@/lib/checkout/copy";
import { countryInfo, guessCountry } from "@/lib/checkout/countries";
import { money } from "@/lib/checkout/money";
import { isPurchaseType, type AppliedCoupon, type CheckoutContext, type MethodAvailability, type PaymentMethod, type PurchaseType } from "@/lib/checkout/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Errors = Partial<Record<string, string>>;
const safeReturn = (raw: string | null) => {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.hostname === "localhost" ? u.toString() : null;
  } catch { return null; }
};

function Checkout({ sound }: { sound: ReturnType<typeof useAudioFeedback> }) {
  const params = useSearchParams();
  const rawType = params.get("type");
  const id = params.get("id") ?? "";
  const returnUrl = safeReturn(params.get("return"));
  const rawRef = params.get("ref");
  const authorRef = rawRef && /^[A-Za-z0-9]{6,16}$/.test(rawRef) ? rawRef : null;
  // Enchère remportée : jeton de l'invitation reçu par e-mail (ADR-0021, D4).
  const rawClaim = params.get("claim");
  const claim = rawClaim && /^[A-Za-z0-9_-]{32,64}$/.test(rawClaim) ? rawClaim : null;
  const type: PurchaseType | null = isPurchaseType(rawType) ? rawType : null;

  const [reload, setReload] = useState(0);
  const linkError = !type || !id ? "Le lien de paiement est incomplet. Revenez à la page de l’offre et relancez le paiement." : null;
  const offerKey = `${type}|${id}|${reload}`;
  // Résultat étiqueté par la requête qui l'a produit : le chargement se déduit, sans état intermédiaire.
  const [loaded, setLoaded] = useState<{ key: string; ctx?: CheckoutContext; error?: string } | null>(null);
  const current = loaded?.key === offerKey ? loaded : null;
  const ctx = current?.ctx ?? null;
  const loadError = linkError ?? current?.error ?? null;

  // Identité
  const [forSelf, setForSelf] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  // Les erreurs apparaissent au premier envoi, puis suivent la saisie en direct (corriger un champ efface son message).
  const [tried, setTried] = useState(false);

  // Licences, code, moyen de paiement
  const [seats, setSeats] = useState(5);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [country, setCountry] = useState("CM");
  const [methodsResult, setMethodsResult] = useState<{ key: string; methods: MethodAvailability[] | null } | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [nav, setNav] = useState({ index: 0, dir: 1 });
  const formRef = useRef<HTMLFormElement>(null);

  const isLicence = type === "B2B_PACKAGE" || type === "B2B_THEMATIQUE";
  // Enchère : la personne est connue par l'invitation, il ne reste qu'à payer (une seule étape).
  const isAuction = type === "AUCTION_PAYMENT";
  const licenceQuote = useLicenceQuote(type ?? "", id, isLicence ? seats : 1);
  const quote = isLicence ? licenceQuote.quote : null;

  // 1. Offre
  useEffect(() => {
    if (!type || !id) return;
    let alive = true;
    checkoutApi.context(type, id, claim)
      .then((c) => { if (!alive) return; setLoaded({ key: offerKey, ctx: { ...c, type } }); setCountry(guessCountry(c.currency)); if (c.beneficiary?.email) setEmail(c.beneficiary.email);
        // Place nominative : l'identité est déjà connue, on la reprend (modifiable) au lieu de la redemander.
        const [first, ...rest] = (c.beneficiary?.name ?? "").trim().split(/\s+/);
        if (first && rest.length) { setFirstName(first); setLastName(rest.join(" ")); } })
      .catch((e: CheckoutError) => alive && setLoaded({ key: offerKey, error: e.message }));
    return () => { alive = false; };
  }, [type, id, offerKey, claim]);

  // Total : devis (licences), code (aperçu serveur), sinon prix de l'offre
  const total = useMemo(() => {
    if (!ctx) return 0;
    if (isLicence) return quote ? Number(quote.total) : 0;
    if (coupon) return Number(coupon.finalAmount);
    return Number(ctx.price);
  }, [ctx, isLicence, quote, coupon]);

  // 2. Moyens disponibles pour la devise et le pays
  const methodsKey = ctx ? `${ctx.currency}|${country}` : "";
  const methods = methodsResult?.key === methodsKey ? methodsResult.methods : null;
  const methodsLoading = !!ctx && methodsResult?.key !== methodsKey;
  useEffect(() => {
    if (!ctx) return;
    let alive = true;
    checkoutApi.methods(ctx.currency, country, total || Number(ctx.price))
      .then((r) => {
        if (!alive) return;
        setMethodsResult({ key: methodsKey, methods: r.methods });
        const info = countryInfo(country);
        const prefer: PaymentMethod = info && info.operators.length ? "mobile_money" : "card";
        const ok = (m: PaymentMethod) => r.methods.some((x) => x.method === m && x.available);
        setMethod((current) => (current && ok(current) ? current : ok(prefer) ? prefer : ok(prefer === "card" ? "mobile_money" : "card") ? (prefer === "card" ? "mobile_money" : "card") : null));
      })
      .catch(() => alive && setMethodsResult({ key: methodsKey, methods: null }));
    return () => { alive = false; };
    // Le montant n'influe que sur les tranches : recalcul quand il change d'ordre de grandeur suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, country, methodsKey]);

  const copy = useMemo(() => ctx ? checkoutCopy({ ctx, total, quote, coupon, method, forSelf, operators: countryInfo(country)?.operators ?? [] }) : null, [ctx, total, quote, coupon, method, forSelf, country]);

  const applyCoupon = useCallback(async (code: string) => {
    if (!type || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const q = await checkoutApi.coupon(type, id, code);
      if (!q?.valid) throw new CheckoutError(q?.message || "Ce code ne s’applique pas à cette formation.");
      setCoupon(q);
      sound.success();
      toast.success(`Code ${q.code} appliqué : −${money(q.discountAmount, q.currency)}`);
    } catch (e) {
      setCouponError((e as Error).message);
      sound.error();
    } finally {
      setCouponBusy(false);
    }
  }, [type, id, couponBusy, sound]);

  const steps: StepDef[] = useMemo(() => isAuction ? [{ id: "payment", label: "Paiement" }] : [
    ...(isLicence ? [{ id: "licences", label: "Licences" }] : []),
    { id: "identity", label: isLicence ? "Entreprise" : type === "B2C_COURSE" && !forSelf ? "Destinataire" : "Vous" },
    { id: "payment", label: "Paiement" },
  ], [isAuction, isLicence, type, forSelf]);
  const stepIndex = Math.min(nav.index, steps.length - 1);
  const stepId = steps[stepIndex].id;
  const isLast = stepIndex === steps.length - 1;

  const validateStep = (sid: string): Errors => {
    const e: Errors = {};
    if (sid === "licences" && !quote) e.seats = "Le tarif n’est pas encore calculé.";
    if (sid === "identity") {
      if (isLicence && companyName.trim().length < 2) e.companyName = "Indiquez le nom de l’entreprise.";
      if (firstName.trim().length < 2) e.firstName = "Indiquez votre prénom.";
      if (lastName.trim().length < 2) e.lastName = "Indiquez votre nom.";
      if (!EMAIL.test(email.trim())) e.email = "Cette adresse e-mail semble incomplète.";
      if (type === "B2C_COURSE" && !forSelf && !EMAIL.test(beneficiaryEmail.trim())) e.beneficiaryEmail = "Indiquez l’e-mail de la personne à qui vous offrez la formation.";
    }
    if (sid === "payment" && !method) e.method = "Choisissez un moyen de paiement.";
    return e;
  };
  const errors: Errors = tried ? validateStep(stepId) : {};

  const goTo = (i: number) => {
    setTried(false);
    setNav((n) => ({ index: i, dir: i >= n.index ? 1 : -1 }));
  };

  /** Amène l'œil et le clavier sur le premier champ à corriger, ou sur le premier champ d'une étape qui s'ouvre. */
  const focusFirst = (selector: string) => {
    setTimeout(() => {
      const el = formRef.current?.querySelector<HTMLElement>(selector);
      if (el && window.matchMedia("(pointer: fine)").matches) el.focus({ preventScroll: true });
    }, 320);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!type || !ctx || submitting) return;
    const e = validateStep(stepId);
    if (Object.keys(e).length) {
      setTried(true);
      sound.error();
      if (e.method) toast.error(e.method);
      if (e.seats) toast.error(e.seats);
      focusFirst("[aria-invalid='true']");
      return;
    }
    if (!isLast) {
      sound.tap();
      goTo(stepIndex + 1);
      focusFirst("[data-step] input:not([type=hidden])");
      return;
    }
    // Garde-fou : toutes les étapes doivent rester valides (une modification a pu en invalider une).
    const broken = steps.findIndex((st) => Object.keys(validateStep(st.id)).length > 0);
    if (broken !== -1 && broken !== stepIndex) { goTo(broken); setTried(true); sound.error(); return; }
    sound.tap();
    setSubmitting(true);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    const base = { itemId: id, paymentMethod: method, countryCode: country };
    const data: Record<string, unknown> = isLicence
      ? { ...base, companyName: companyName.trim(), vatNumber: vatNumber.trim() || undefined, adminFirstName: firstName.trim(), adminLastName: lastName.trim(), adminEmail: email.trim(), totalLicenses: quote?.seats ?? seats }
      : type === "B2C_COURSE"
        ? { ...base, customerEmail: email.trim(), customerName: name, beneficiaryEmail: forSelf ? email.trim() : beneficiaryEmail.trim(), ...(authorRef ? { ref: authorRef } : {}), ...(coupon ? { couponCode: coupon.code } : {}) }
        : isAuction
          ? { ...base, claim }
          : { ...base, customerEmail: email.trim(), customerName: name };
    // Une clé par session ET par choix (moyen, pays, licences, code) : changer d'avis crée un nouveau paiement.
    data.idempotencyKey = sessionKey([type, id, method, country, isLicence ? quote?.seats : "", coupon?.code ?? ""].join(":"));
    try {
      const result = await checkoutApi.process(type, data);
      if (result?.redirectUrl) {
        sound.celebrate();
        setRedirecting(true);
        window.location.assign(result.redirectUrl);
        return;
      }
      throw new CheckoutError("Le prestataire n’a pas renvoyé de page de paiement. Réessayez ou choisissez un autre moyen.");
    } catch (err) {
      sound.error();
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  };

  if (loadError) return <Unavailable message={loadError} returnUrl={returnUrl} onRetry={() => setReload((n) => n + 1)} />;
  if (!ctx || !copy || !type) return <CheckoutSkeleton />;

  const couponSlot = type === "B2C_COURSE" ? <CouponField onApply={applyCoupon} applied={coupon} onRemove={() => { setCoupon(null); setCouponError(null); }} busy={couponBusy} error={couponError} /> : null;
  const summary = <Summary ctx={ctx} copy={copy} quote={quote} coupon={coupon} total={total} couponSlot={couponSlot} />;
  const identityIndex = steps.findIndex((st) => st.id === "identity");
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase() || "SL";

  const body = (() => {
    switch (stepId) {
      case "licences":
        return (
          <>
            <StepHeading title="Combien de collaborateurs ?" hint="Une licence = un collaborateur. Le tarif baisse avec le volume." />
            <Licences seats={seats} onSeats={setSeats} quote={quote} loading={licenceQuote.loading} error={licenceQuote.error ?? errors.seats ?? null} currency={ctx.currency} />
          </>
        );
      case "identity":
        return (
          <>
            <StepHeading title={copy.identityTitle} hint={copy.identityHint} />
            <div className="space-y-3.5">
              {type === "B2C_COURSE" && (
                <Segmented name="beneficiaire" value={forSelf ? "self" : "gift"} onChange={(v) => { sound.tap(); setForSelf(v === "self"); }}
                  options={[{ value: "self", label: "Pour moi", sub: "Je suis l’apprenant", icon: <User size={17} /> }, { value: "gift", label: "Je l’offre", sub: "À un proche", icon: <Gift size={17} /> }]} />
              )}
              {isLicence && (
                <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                  <Field label="Entreprise" placeholder="Nom de l’entreprise" value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={errors.companyName} autoComplete="organization" />
                  <Field label="N° de TVA" placeholder="Facultatif" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} autoComplete="off" />
                </div>
              )}
              {ctx.beneficiary && (
                <p className="rounded-2xl bg-[var(--field)] px-4 py-2.5 text-[13px] text-soft">Place réservée à <strong className="text-[var(--ink)]">{ctx.beneficiary.name || ctx.beneficiary.email}</strong>{ctx.beneficiary.name ? ` (${ctx.beneficiary.email})` : ""}.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label={isLicence ? "Prénom (admin)" : "Prénom"} placeholder="Awa" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} autoComplete="given-name" />
                <Field label={isLicence ? "Nom (admin)" : "Nom"} placeholder="Diallo" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} autoComplete="family-name" />
              </div>
              <Field label={isLicence ? "E-mail professionnel" : "E-mail"} type="email" inputMode="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email"
                hint={isLicence ? "Facture et accès à l’espace entreprise." : !forSelf && type === "B2C_COURSE" ? "Vous recevez le reçu à cette adresse." : "Reçu et accès envoyés à cette adresse."} />
              <AnimatePresence initial={false}>
                {type === "B2C_COURSE" && !forSelf && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <Field label="E-mail de la personne à qui vous l’offrez" type="email" placeholder="ami@exemple.com" value={beneficiaryEmail} onChange={(e) => setBeneficiaryEmail(e.target.value)} error={errors.beneficiaryEmail} hint="Elle reçoit ses accès au campus." />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        );
      default:
        return (
          <>
            <StepHeading title="Comment souhaitez-vous payer ?" hint="Le moyen le plus simple dans votre pays est présélectionné." />
            {isAuction ? (
              <Recap icon={<Gavel size={16} />} title={ctx.beneficiary?.name || "Inscription"} detail={ctx.beneficiary?.email} />
            ) : (
            <Recap
              icon={isLicence ? <Building2 size={16} /> : type === "B2C_COURSE" && !forSelf ? <Gift size={16} /> : initials}
              title={isLicence ? `${companyName.trim()} · ${quote?.seats ?? seats} licence${(quote?.seats ?? seats) > 1 ? "s" : ""}` : type === "B2C_COURSE" && !forSelf ? `Offert à ${beneficiaryEmail.trim()}` : fullName}
              detail={isLicence ? `${fullName} · ${email.trim()}` : type === "B2C_COURSE" && !forSelf ? `De ${fullName} · ${email.trim()}` : email.trim()}
              onEdit={() => goTo(identityIndex)}
            />
            )}
            <PaymentMethods country={country} onCountry={(c) => { sound.tap(); setCountry(c); }} methods={methods} loading={methodsLoading} value={method} onChange={(m) => { sound.tap(); setMethod(m); }} hints={copy.methodHint} />
          </>
        );
    }
  })();

  return (
    <>
      <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-5 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-6">
        <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-col gap-3 lg:card lg:p-7">
          {/* Récapitulatif compact (mobile) */}
          <div className="lg:hidden">
            <SummaryBar eyebrow={copy.eyebrow} title={ctx.title} total={isLicence && !quote ? null : total} currency={ctx.currency} onOpen={() => setSummaryOpen(true)} />
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
            <div className="hidden lg:block">
              <Pill>{copy.eyebrow}</Pill>
              <h1 className="mt-2.5 line-clamp-2 font-display text-[26px] font-semibold leading-[1.15] tracking-tight [@media(min-height:860px)]:text-[30px]">{copy.title}</h1>
              <p className="mt-2 line-clamp-2 hidden max-w-xl text-[14.5px] leading-relaxed text-soft [@media(min-height:820px)]:block">{copy.lead}</p>
            </div>
            {steps.length > 1 && <Stepper steps={steps} current={stepIndex} onJump={goTo} />}
          </motion.div>

          {/* Étape courante : conçue pour tenir dans l'écran ; défilement interne seulement sur très petit écran. */}
          <div data-step className="-mx-1 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pt-2 [scrollbar-width:none]">
            <StepPanel stepKey={stepId} dir={nav.dir}>{body}</StepPanel>
          </div>

          <div className="space-y-2 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3">
              <AnimatePresence initial={false}>{stepIndex > 0 && <BackButton key="back" onClick={() => { sound.tap(); goTo(stepIndex - 1); }} />}</AnimatePresence>
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={isLast ? "pay" : "next"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {isLast ? <PayButton label={copy.cta} busy={submitting} disabled={methodsLoading} /> : <NextButton disabled={stepId === "licences" && !quote} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <p className="line-clamp-2 text-center text-[11.5px] leading-snug text-muted">{isLast ? copy.legal : "Aucun paiement à cette étape."}</p>
          </div>
        </form>

        <div className="hidden min-h-0 lg:block">
          <div className="h-full overflow-y-auto [scrollbar-width:none]">
            {summary}
            {isLicence && <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-muted"><Building2 size={13} />Facture au nom de votre entreprise</p>}
          </div>
        </div>
      </div>
      <SummarySheet open={summaryOpen} onClose={() => setSummaryOpen(false)}>{summary}</SummarySheet>
      <AnimatePresence>{redirecting && <RedirectVeil method={method} />}</AnimatePresence>
    </>
  );
}

function Page() {
  const sound = useAudioFeedback();
  const params = useSearchParams();
  // Salle d'attente (ADR-0021, C5) : invisible sous le seuil ; une fois admis, le checkout reste monté et la salle
  // repasse par-dessus si une nouvelle place est demandée (rien de ce qui est saisi n'est perdu).
  const queue = useQueue();
  const [everAdmitted, setEverAdmitted] = useState(false);
  if (queue.state === "admitted" && !everAdmitted) setEverAdmitted(true);
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <Aurora />
      <CheckoutHeader soundOn={sound.enabled} onToggleSound={sound.toggle} returnUrl={safeReturn(params.get("return"))} />
      {everAdmitted ? <Checkout sound={sound} /> : queue.state === "waiting" ? <WaitingRoom position={queue.position} etaSec={queue.etaSec} firstPosition={queue.firstPosition} /> : <CheckoutSkeleton />}
      {everAdmitted && queue.state === "waiting" && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--surface)]/90 pt-20 backdrop-blur-xl"><WaitingRoom position={queue.position} etaSec={queue.etaSec} firstPosition={queue.firstPosition} /></div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <Page />
    </Suspense>
  );
}
