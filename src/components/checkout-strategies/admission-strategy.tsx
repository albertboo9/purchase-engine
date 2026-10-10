"use client";

/**
 * Paiement lié à une candidature (place d'un admis, frais d'étude de dossier — ADR-0016, D6 bis).
 * Le bénéficiaire est fixé par le serveur et seulement affiché : un proche peut payer, mais la place (ou le dossier)
 * reste celle du candidat. Le payeur indique son nom et l'e-mail où recevoir le reçu.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, UserCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const schema = z.object({
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
});
type FormData = z.infer<typeof schema>;

interface Props {
  kind: "offer" | "fee";
  beneficiary?: { email: string | null; name: string | null } | null;
  onSuccess: (data: unknown) => void;
  playClick: () => void;
}

const mask = (email?: string | null) => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
};

export function AdmissionStrategy({ kind, beneficiary, onSuccess, playClick }: Props) {
  const [first = "", ...rest] = (beneficiary?.name ?? "").trim().split(/\s+/);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: first, lastName: rest.join(" "), email: beneficiary?.email ?? "" },
  });

  const onSubmit = (data: FormData) => {
    playClick();
    onSuccess({
      buyer: { firstName: data.firstName, lastName: data.lastName, email: data.email },
      // L'agrégateur impose le bénéficiaire (candidat) ; le payeur reçoit le reçu.
      customerEmail: data.email,
      customerName: `${data.firstName.trim()} ${data.lastName.trim()}`,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {kind === "offer" ? "Place réservée pour " : "Dossier de candidature de "}
          <strong>{beneficiary?.name ?? "le candidat"}</strong>{beneficiary?.email ? ` (${mask(beneficiary.email)})` : ""}.
          <span className="mt-1 flex items-center gap-1 text-indigo-700/80"><Lock className="h-3.5 w-3.5" />Le bénéficiaire ne peut pas être modifié : un proche peut payer à sa place.</span>
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Vos informations (payeur)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prénom" placeholder="Ex : Nadia" {...register("firstName")} error={errors.firstName?.message} />
          <Input label="Nom" placeholder="Ex : Rakoto" {...register("lastName")} error={errors.lastName?.message} />
        </div>
        <Input label="Votre email" type="email" placeholder="nom@email.com" helperText="Le reçu de paiement sera envoyé à cette adresse." {...register("email")} error={errors.email?.message} />
      </div>

      {kind === "fee" && <p className="text-xs text-gray-500">Frais d’étude de dossier non remboursables. Votre dossier part à l’établissement dès la confirmation du paiement.</p>}

      <Button type="submit" className="mt-4 w-full" size="lg">
        {kind === "offer" ? "Payer et confirmer ma place" : "Payer les frais et envoyer mon dossier"}
      </Button>
    </form>
  );
}
