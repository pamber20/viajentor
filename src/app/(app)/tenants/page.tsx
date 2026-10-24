"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_PLAN_SEATS,
  PLAN_LABELS,
  type TenantPlan,
  type TenantStatus,
} from "@/lib/tenants";
import type { TenantSummary } from "@/server/tenants";
import { cn } from "@/lib/utils";

type TenantsResponse = {
  activeOrganizationId: string;
  isSuperAdmin: boolean;
  impersonating: boolean;
  tenants: TenantSummary[];
};

export default function TenantsPage() {
  const router = useRouter();
  const [data, setData] = useState<TenantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");
  const [planFilter, setPlanFilter] = useState<"all" | TenantPlan>("all");

  // Modal de creación de nueva agencia
  const [createOpen, setCreateOpen] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [plan, setPlan] = useState<TenantPlan>("pro");
  const [maxSeats, setMaxSeats] = useState<number>(DEFAULT_PLAN_SEATS.pro);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [accentColor, setAccentColor] = useState("#0d5bff");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Modal de edición de agencia
  const [editingTenant, setEditingTenant] = useState<TenantSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState<TenantPlan>("pro");
  const [editSeats, setEditSeats] = useState<number>(10);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      if (res.ok) {
        const json = (await res.json()) as TenantsResponse;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const tenants = useMemo(() => data?.tenants ?? [], [data]);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "all" && t.tenant.status !== statusFilter) {
        return false;
      }
      if (planFilter !== "all" && t.tenant.plan !== planFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.slug ?? "").toLowerCase().includes(q) ||
        (t.owner?.name ?? "").toLowerCase().includes(q) ||
        (t.owner?.email ?? "").toLowerCase().includes(q) ||
        (t.tenant.contactEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [tenants, search, statusFilter, planFilter]);

  const globalTotals = useMemo(() => {
    return tenants.reduce(
      (acc, t) => {
        acc.total += 1;
        if (t.tenant.status === "active") acc.active += 1;
        else acc.suspended += 1;
        acc.members += t.metrics.members;
        acc.contacts += t.metrics.contacts;
        acc.conversations += t.metrics.conversations;
        acc.quotes += t.metrics.quotes;
        acc.bookings += t.metrics.bookings;
        if (t.metrics.whatsappConnected) acc.waConnected += 1;
        return acc;
      },
      {
        total: 0,
        active: 0,
        suspended: 0,
        members: 0,
        contacts: 0,
        conversations: 0,
        quotes: 0,
        bookings: 0,
        waConnected: 0,
      }
    );
  }, [tenants]);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName,
          plan,
          maxSeats,
          ownerName,
          ownerEmail,
          ownerPassword,
          contactPhone: contactPhone || undefined,
          notes: notes || undefined,
          accentColor,
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setCreateError(json.error?.message ?? "No se pudo crear la agencia");
        return;
      }
      setCreateOpen(false);
      setAgencyName("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setContactPhone("");
      setNotes("");
      await loadTenants();
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(t: TenantSummary) {
    setEditingTenant(t);
    setEditName(t.name);
    setEditPlan(t.tenant.plan);
    setEditSeats(t.tenant.maxSeats);
    setEditPhone(t.tenant.contactPhone ?? "");
    setEditEmail(t.tenant.contactEmail ?? t.owner?.email ?? "");
    setEditNotes(t.tenant.notes ?? "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTenant) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          plan: editPlan,
          maxSeats: editSeats,
          contactPhone: editPhone || null,
          contactEmail: editEmail || "",
          notes: editNotes || null,
        }),
      });
      if (res.ok) {
        setEditingTenant(null);
        await loadTenants();
        router.refresh();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleStatus(t: TenantSummary) {
    if (t.isPrimary) return;
    const nextStatus: TenantStatus =
      t.tenant.status === "active" ? "suspended" : "active";
    const res = await fetch(`/api/tenants/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadTenants();
      router.refresh();
    }
  }

  async function handleEnterAgency(organizationId: string) {
    const res = await fetch("/api/tenants/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (res.ok) {
      router.push("/quotes");
      router.refresh();
    }
  }

  if (!loading && data && !data.isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-md border bg-card p-6 text-center">
          <h2 className="text-base font-bold">Acceso restringido</h2>
          <p className="mt-1 text-sm text-text-2">
            Solo el SuperAdmin de la plataforma puede administrar las agencias
            clientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-bold tracking-tight">
              Viajentor 2.0 · Consola Multi-Cliente (SaaS)
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-text-2">
            Administra todas tus agencias de viajes en una sola instancia (aislamiento
            por <code className="font-mono">organization_id</code>, planes, cupos de
            usuarios y soporte en 1 clic).
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva agencia cliente
        </Button>
      </header>

      <div className="space-y-6 p-6">
        {/* KPIs Globales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-3">
              <span>Agencias clientes</span>
              <Building2 className="h-4 w-4 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold">{globalTotals.total}</p>
            <p className="mt-1 text-xs text-text-2">
              <span className="font-semibold text-success-text">
                {globalTotals.active} activas
              </span>{" "}
              · {globalTotals.suspended} suspendidas
            </p>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-3">
              <span>Asesores y usuarios</span>
              <Users className="h-4 w-4 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold">{globalTotals.members}</p>
            <p className="mt-1 text-xs text-text-2">
              {globalTotals.waConnected} agencias con WhatsApp activo
            </p>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-3">
              <span>Contactos y chats</span>
              <CheckCircle2 className="h-4 w-4 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold">{globalTotals.contacts}</p>
            <p className="mt-1 text-xs text-text-2">
              {globalTotals.conversations} conversaciones en curso
            </p>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-3">
              <span>Cotizaciones y viajes</span>
              <FileText className="h-4 w-4 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold">{globalTotals.quotes}</p>
            <p className="mt-1 text-xs text-text-2">
              {globalTotals.bookings} reservas confirmadas
            </p>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <Input
              placeholder="Buscar por agencia, propietario, correo o slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | TenantStatus)
              }
              className="rounded-sm border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activas</option>
              <option value="suspended">Solo suspendidas</option>
            </select>

            <select
              aria-label="Filtrar por plan"
              value={planFilter}
              onChange={(e) =>
                setPlanFilter(e.target.value as "all" | TenantPlan)
              }
              className="rounded-sm border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              <option value="all">Todos los planes</option>
              <option value="starter">Plan Starter</option>
              <option value="pro">Plan Pro</option>
              <option value="enterprise">Plan Enterprise</option>
            </select>
          </div>
        </div>

        {/* Tabla responsiva de Agencias (modern-web-guidance: responsive-table) */}
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="tenants-table-caption"
          className="max-h-[min(640px,75vh)] max-w-full overflow-auto rounded-md border bg-card [container-type:inline-size]"
        >
          <table className="w-full border-separate border-spacing-0 text-left text-sm">
            <caption id="tenants-table-caption" className="sr-only">
              Directorio de agencias clientes en Viajentor 2.0
            </caption>
            <thead className="sticky inset-block-start-0 z-10 bg-subtle text-xs font-semibold uppercase tracking-wider text-text-3">
              <tr>
                <th scope="col" className="border-b px-4 py-3">
                  Agencia
                </th>
                <th scope="col" className="border-b px-4 py-3">
                  Propietario / Contacto
                </th>
                <th scope="col" className="border-b px-4 py-3">
                  Plan y cupo
                </th>
                <th scope="col" className="border-b px-4 py-3">
                  WhatsApp
                </th>
                <th scope="col" className="border-b px-4 py-3">
                  Uso (CRM + Viajes)
                </th>
                <th scope="col" className="border-b px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="border-b px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-2">
                    Cargando agencias clientes…
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-2">
                    No se encontraron agencias con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const isCurrent = t.id === data?.activeOrganizationId;
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "transition-colors hover:bg-subtle/60",
                        isCurrent && "bg-brand-tint/20"
                      )}
                    >
                      <th
                        scope="row"
                        className="sticky inset-inline-start-0 border-b bg-card px-4 py-3 font-semibold text-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <span>{t.name}</span>
                          {t.isPrimary && (
                            <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-text">
                              Matriz
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-success-text">
                              Activa en sesión
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] font-normal text-text-3">
                          {t.slug ?? t.id}
                        </div>
                      </th>

                      <td className="border-b px-4 py-3">
                        {t.owner ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {t.owner.name}
                            </div>
                            <div className="text-xs text-text-2">
                              {t.owner.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-text-3">Sin propietario</span>
                        )}
                        {t.tenant.contactPhone && (
                          <div className="mt-0.5 text-xs text-text-3">
                            Tel: {t.tenant.contactPhone}
                          </div>
                        )}
                      </td>

                      <td className="border-b px-4 py-3">
                        <span className="inline-flex items-center rounded-sm bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-text">
                          {PLAN_LABELS[t.tenant.plan]}
                        </span>
                        <div className="mt-1 text-xs text-text-2">
                          {t.metrics.members} / {t.tenant.maxSeats} usuarios
                        </div>
                      </td>

                      <td className="border-b px-4 py-3 text-xs">
                        {t.metrics.whatsappConnected ? (
                          <span className="inline-flex items-center gap-1 font-medium text-success-text">
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {t.metrics.whatsappPhone ?? "Conectado"}
                          </span>
                        ) : (
                          <span className="text-text-3">Sin conectar</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3 text-xs text-text-2">
                        <div>
                          <strong>{t.metrics.contacts}</strong> contactos ·{" "}
                          <strong>{t.metrics.conversations}</strong> chats
                        </div>
                        <div className="mt-0.5">
                          <strong>{t.metrics.quotes}</strong> cotizaciones ·{" "}
                          <strong>{t.metrics.bookings}</strong> viajes
                        </div>
                      </td>

                      <td className="border-b px-4 py-3">
                        {t.tenant.status === "active" ? (
                          <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-text">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger-text">
                            Suspendida
                          </span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={isCurrent ? "secondary" : "outline"}
                            onClick={() => void handleEnterAgency(t.id)}
                            title="Entrar al CRM de esta agencia"
                            className="h-8 gap-1 px-2.5 text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {isCurrent ? "Abrir" : "Entrar"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(t)}
                            title="Configurar plan y cupo"
                            className="h-8 px-2 text-xs"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>

                          {!t.isPrimary && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleToggleStatus(t)}
                              title={
                                t.tenant.status === "active"
                                  ? "Suspender agencia"
                                  : "Reactivar agencia"
                              }
                              className="h-8 px-2 text-xs"
                            >
                              {t.tenant.status === "active" ? (
                                <PauseCircle className="h-3.5 w-3.5 text-warning-text" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5 text-success-text" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Alta de Nueva Agencia Cliente */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-lg rounded-md border bg-card p-6 shadow-pop">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold">
                Dar de alta nueva agencia cliente
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded p-1 text-text-3 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="agencyName">Nombre comercial de la agencia</Label>
                  <Input
                    id="agencyName"
                    placeholder="Ej. Viajes El Dorado"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan">Plan contratado</Label>
                  <select
                    id="plan"
                    value={plan}
                    onChange={(e) => {
                      const nextPlan = e.target.value as TenantPlan;
                      setPlan(nextPlan);
                      setMaxSeats(DEFAULT_PLAN_SEATS[nextPlan]);
                    }}
                    className="w-full rounded-sm border bg-background px-3 py-2 text-sm"
                  >
                    <option value="starter">Starter (3 usuarios)</option>
                    <option value="pro">Pro (10 usuarios)</option>
                    <option value="enterprise">Enterprise (50 usuarios)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maxSeats">Cupo máximo de usuarios</Label>
                  <Input
                    id="maxSeats"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxSeats}
                    onChange={(e) => setMaxSeats(Number(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerName">Nombre del propietario</Label>
                  <Input
                    id="ownerName"
                    placeholder="Ej. Laura Gómez"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Teléfono / WhatsApp (opcional)</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+57 300 000 0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerEmail">Correo de acceso del propietario</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="directora@agencia.com"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ownerPassword">Contraseña inicial</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accentColor">Color de marca</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notas internas</Label>
                  <Input
                    id="notes"
                    placeholder="Ej. Renovación anual en diciembre"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {createError && (
                <p className="text-xs font-medium text-danger-text">{createError}</p>
              )}

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creando agencia…" : "Crear agencia"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Plan y Cupo de Agencia */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-md rounded-md border bg-card p-6 shadow-pop">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold">
                Configurar agencia: {editingTenant.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="rounded p-1 text-text-3 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editName">Nombre de la agencia</Label>
                <Input
                  id="editName"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editPlan">Plan</Label>
                  <select
                    id="editPlan"
                    value={editPlan}
                    onChange={(e) => {
                      const nextPlan = e.target.value as TenantPlan;
                      setEditPlan(nextPlan);
                      setEditSeats(DEFAULT_PLAN_SEATS[nextPlan]);
                    }}
                    className="w-full rounded-sm border bg-background px-3 py-2 text-sm"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editSeats">Máx. usuarios</Label>
                  <Input
                    id="editSeats"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={editSeats}
                    onChange={(e) => setEditSeats(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editEmail">Correo de contacto</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPhone">Teléfono de contacto</Label>
                <Input
                  id="editPhone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editNotes">Notas internas de facturación</Label>
                <Input
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTenant(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
