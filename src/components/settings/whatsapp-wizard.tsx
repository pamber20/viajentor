"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
  };
  status?: string;
};

type FacebookSdk = {
  init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    opts?: {
      config_id?: string;
      response_type?: string;
      override_default_response_type?: boolean;
      extras?: Record<string, unknown>;
    }
  ) => void;
  _initialized?: boolean;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

type EmbeddedConfig = {
  enabled: boolean;
  appId: string | null;
  configId: string | null;
};

type Connection = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: "connected" | "reconnect_required";
  tokenLast4: string;
};

type WebhookInfo = {
  url: string;
  verifyToken: string;
  isHttps: boolean;
  signatureLayer: boolean;
};

/** Lo que devuelve el registro del webhook en Meta (al guardar o a demanda). */
type WebhookRegistration =
  | { ok: true; appWithoutWebhook: boolean }
  | { ok: true; skipped: "waba_override"; host: string }
  | { ok: false; message: string };

/**
 * El último registro, y desde dónde se pidió. Uno solo para las dos tarjetas:
 * con uno por tarjeta, guardar con un token sin permiso dejaba el «registrado»
 * de un clic anterior al lado del aviso nuevo.
 */
type LastRegistration = { result: WebhookRegistration; from: "save" | "button" };

export function WhatsappWizard() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [embeddedConfig, setEmbeddedConfig] = useState<EmbeddedConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [registration, setRegistration] = useState<LastRegistration | null>(
    null
  );

  const refetch = useCallback(async () => {
    const [c, w, emb] = await Promise.all([
      fetch("/api/settings/whatsapp").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings/webhook").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings/whatsapp/embedded-signup").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null, null]);
    if (c) setConnection(c.connection);
    if (w) setWebhook(w);
    if (emb) setEmbeddedConfig(emb);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {connection?.status === "reconnect_required" && (
        <div className="flex flex-wrap items-start gap-2 rounded-lg border border-danger-soft bg-danger-tint p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-[12rem] flex-1">
            <p className="font-medium text-danger-text">
              El token de WhatsApp expiró o fue revocado.
            </p>
            <p className="text-danger-text opacity-80">
              Los envíos están pausados. Pega un token nuevo abajo y prueba la
              conexión para reconectar.
            </p>
          </div>
          <Desconectar
            onHecho={() => {
              setRegistration(null);
              void refetch();
            }}
          />
        </div>
      )}

      {connection && connection.status === "connected" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success-soft bg-success-tint p-4">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div className="min-w-[12rem] flex-1 text-sm">
            <p className="font-medium text-success-text">
              Número conectado: {connection.displayPhoneNumber ?? connection.phoneNumberId}
            </p>
            <p className="text-success-text opacity-80">
              {connection.verifiedName ? `${connection.verifiedName} · ` : ""}
              token …{connection.tokenLast4}
            </p>
          </div>
          <Badge variant="success">Conectado</Badge>
          <Desconectar
            onHecho={() => {
              setRegistration(null);
              void refetch();
            }}
          />
        </div>
      )}

      <ConnectForm
        existing={connection}
        embeddedConfig={embeddedConfig}
        registration={registration?.from === "save" ? registration.result : null}
        onRegistration={(result) =>
          setRegistration(result ? { result, from: "save" } : null)
        }
        onSaved={() => void refetch()}
      />

      {webhook && (
        <WebhookCard
          webhook={webhook}
          connection={connection}
          registration={registration?.from === "button" ? registration.result : null}
          onRegistration={(result) =>
            setRegistration(result ? { result, from: "button" } : null)
          }
        />
      )}
    </div>
  );
}

/**
 * Soltar el número.
 *
 * Pide confirmación porque corta la entrada y la salida de mensajes al
 * instante — no es un ajuste, es apagar el canal. Lo que NO hace es borrar la
 * bandeja, y el aviso lo dice: sin eso, nadie se atreve a tocarlo.
 */
function Desconectar({ onHecho }: { onHecho: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desconectar() {
    setYendo(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/whatsapp", { method: "DELETE" });
      if (res.ok) {
        setConfirmando(false);
        onHecho();
      } else {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(data?.error?.message ?? "No se pudo desconectar el número.");
      }
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setYendo(false);
    }
  }

  if (!confirmando) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
        Desconectar
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">
        Dejarás de recibir y enviar. Tus conversaciones se quedan.
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={yendo}
        onClick={() => setConfirmando(false)}
      >
        Cancelar
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={yendo}
        onClick={() => void desconectar()}
      >
        {yendo ? "Desconectando…" : "Sí, desconectar"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      resolve();
    };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("No se pudo cargar el SDK de Facebook"));
    document.body.appendChild(script);
  });
}

function ConnectForm({
  existing,
  embeddedConfig,
  registration,
  onRegistration,
  onSaved,
}: {
  existing: Connection | null;
  embeddedConfig?: EmbeddedConfig | null;
  registration: WebhookRegistration | null;
  onRegistration: (result: WebhookRegistration | null) => void;
  onSaved: () => void;
}) {
  const [wabaId, setWabaId] = useState(existing?.wabaId ?? "");
  const [phoneNumberId, setPhoneNumberId] = useState(
    existing?.phoneNumberId ?? ""
  );
  const [token, setToken] = useState("");
  const [testResult, setTestResult] = useState<
    | { ok: true; display: string }
    | { ok: false; message: string }
    | null
  >(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [connectingEmbedded, setConnectingEmbedded] = useState(false);
  const [embeddedError, setEmbeddedError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(!embeddedConfig?.enabled);

  async function startEmbeddedSignup() {
    if (!embeddedConfig?.appId) return;
    setConnectingEmbedded(true);
    setEmbeddedError(null);
    try {
      await loadFacebookSdk(embeddedConfig.appId);

      let sessionData: { waba_id?: string; phone_number_id?: string } = {};

      const messageHandler = (event: MessageEvent) => {
        if (
          event.origin !== "https://www.facebook.com" &&
          event.origin !== "https://web.facebook.com"
        ) {
          return;
        }
        try {
          const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (raw.type === "WA_EMBEDDED_SIGNUP") {
            if (raw.event === "FINISH" || raw.event === "CANCEL") {
              sessionData = {
                waba_id: raw.data?.waba_id,
                phone_number_id: raw.data?.phone_number_id,
              };
            }
          }
        } catch {}
      };

      window.addEventListener("message", messageHandler);

      window.FB?.login(
        async (response: FacebookLoginResponse) => {
          window.removeEventListener("message", messageHandler);
          const code = response?.authResponse?.code;
          if (!code) {
            setConnectingEmbedded(false);
            if (response?.status !== "connected") {
              setEmbeddedError("El flujo de conexión con Meta fue cancelado o no completado.");
            }
            return;
          }

          try {
            const res = await fetch("/api/settings/whatsapp/embedded-signup", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                code,
                wabaId: sessionData.waba_id,
                phoneNumberId: sessionData.phone_number_id,
              }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              setEmbeddedError(
                data?.error?.message ?? "Error al intercambiar credenciales con Meta"
              );
            } else {
              onRegistration(data.webhook ?? null);
              onSaved();
            }
          } catch {
            setEmbeddedError("Error al contactar con el servidor.");
          } finally {
            setConnectingEmbedded(false);
          }
        },
        {
          config_id: embeddedConfig.configId || undefined,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: "",
            sessionInfoVersion: "2",
          },
        }
      );
    } catch (err: unknown) {
      setConnectingEmbedded(false);
      const msg = err instanceof Error ? err.message : "Error inicializando el SDK de Meta";
      setEmbeddedError(msg);
    }
  }

  const canTest = wabaId.trim() && phoneNumberId.trim() && token.trim();

  async function test() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/settings/whatsapp/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phoneNumberId, token }),
    }).catch(() => null);
    setTesting(false);
    if (!res) {
      setTestResult({ ok: false, message: "Sin conexión con el servidor" });
      return;
    }
    const data = (await res.json().catch(() => null)) as {
      displayPhoneNumber?: string;
      error?: { message?: string };
    } | null;
    if (res.ok && data?.displayPhoneNumber) {
      setTestResult({ ok: true, display: data.displayPhoneNumber });
    } else {
      setTestResult({
        ok: false,
        message: data?.error?.message ?? "La validación falló",
      });
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    onRegistration(null);
    const res = await fetch("/api/settings/whatsapp", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wabaId, phoneNumberId, token }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setSaveError(data?.error?.message ?? "No se pudo guardar la conexión");
      return;
    }
    const saved = (await res.json().catch(() => null)) as {
      webhook?: WebhookRegistration;
    } | null;
    onRegistration(saved?.webhook ?? null);
    setToken("");
    setTestResult(null);
    onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existing ? "Reconectar / actualizar el número" : "Conectar tu número de WhatsApp"}
        </CardTitle>
        <CardDescription>
          Pega las credenciales de WhatsApp Cloud API. El token se valida
          contra Meta ANTES de guardarse y se almacena cifrado. Al guardar, el
          webhook se registra en Meta por ti.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {embeddedConfig?.enabled ? (
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-foreground">
                  Conexión oficial con 1 clic (Meta Tech Provider)
                </p>
                <p className="text-sm text-muted-foreground">
                  Conecta tu WhatsApp Business con Meta Embedded Signup. Sin copiar tokens,
                  sin WABA ID manual y con registro automático de Webhooks para tu número.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium shadow"
                disabled={connectingEmbedded}
                onClick={() => void startEmbeddedSignup()}
              >
                {connectingEmbedded ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando con Meta…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Iniciar con Facebook (WhatsApp)
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowManual((prev) => !prev)}
              >
                {showManual ? (
                  <>
                    <ChevronUp className="mr-1 h-3.5 w-3.5" />
                    Ocultar configuración manual
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3.5 w-3.5" />
                    O ingresar credenciales manualmente
                  </>
                )}
              </Button>
            </div>
            {embeddedError && (
              <p role="alert" className="text-sm text-destructive font-medium">
                {embeddedError}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            💡 <strong>Meta Tech Provider:</strong> Configura <code>META_APP_ID</code> y <code>META_APP_SECRET</code> en el servidor para habilitar el botón oficial de conexión en 1 clic (Embedded Signup).
          </div>
        )}

        {(showManual || !embeddedConfig?.enabled) && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid gap-3 rounded-md border bg-background p-4 text-sm">
              <p className="font-medium">¿De dónde sale el token manual?</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="mb-1 font-medium text-primary">Modo directo</p>
                  <p className="text-muted-foreground">
                    El negocio tiene su propia app en{" "}
                    <span className="text-foreground">developers.facebook.com</span>:
                    usa un token de <span className="text-foreground">usuario del sistema</span>{" "}
                    (no expira) con permisos de WhatsApp. En este modo conviene
                    configurar también el App Secret para la firma del webhook.
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="mb-1 font-medium text-primary">Modo agencia (Tech Provider)</p>
                  <p className="text-muted-foreground">
                    Tu agencia hace el Embedded Signup en SU plataforma y su
                    backend obtiene el token del cliente; te lo entrega para
                    pegarlo aquí. Al guardar, el webhook se registra en el número
                    (<span className="text-foreground">override del número</span>),
                    igual que en modo directo; si tu agencia ya enruta la cuenta a
                    su propio backend, se respeta.
                  </p>
                </div>
              </div>
            </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="waba-id">WABA ID</Label>
            <Input
              id="waba-id"
              placeholder="ID de la cuenta de WhatsApp Business"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone-number-id">Phone Number ID</Label>
            <Input
              id="phone-number-id"
              placeholder="ID del número de teléfono"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="token">Token de acceso</Label>
          <Input
            id="token"
            type="password"
            placeholder={existing ? `Guardado (…${existing.tokenLast4}) — pega uno nuevo para cambiarlo` : "EAAG…"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setTestResult(null);
            }}
          />
        </div>

        {testResult && (
          <p
            className={`text-sm ${testResult.ok ? "text-success" : "text-destructive"}`}
          >
            {testResult.ok
              ? `✓ Token válido para ${testResult.display}. Ya puedes guardar.`
              : testResult.message}
          </p>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {registration && (
          <RegistrationNotice registration={registration} afterSave />
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!canTest || testing}
            onClick={() => void test()}
          >
            {testing ? "Probando…" : "Probar conexión"}
          </Button>
          <Button
            disabled={!testResult?.ok || saving}
            onClick={() => void save()}
          >
            {saving ? "Guardando…" : "Guardar conexión"}
          </Button>
        </div>
      </div>
    )}
  </CardContent>
</Card>
);
}

/**
 * El resultado de registrar el webhook en Meta, en palabras de quien lo lee.
 *
 * Un fallo aquí NO deshace el guardado: el token es válido y la conexión
 * envía. Por eso el aviso es de advertencia, no de error, y dice qué hacer.
 */
function RegistrationNotice({
  registration,
  afterSave = false,
}: {
  registration: WebhookRegistration;
  afterSave?: boolean;
}) {
  if (registration.ok && "skipped" in registration) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Tu cuenta de WhatsApp ya enruta sus webhooks a{" "}
          <span className="text-foreground">{registration.host}</span> (un
          cerebro externo o el backend de tu agencia). Se respeta: el número
          queda sin webhook propio y los mensajes siguen llegando ahí.
        </span>
      </p>
    );
  }
  if (registration.ok && !registration.appWithoutWebhook) {
    return (
      <p className="flex items-start gap-2 text-sm text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Webhook registrado en Meta: los mensajes de este número llegan aquí.
        No hace falta pegar nada en el panel de tu app.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-md border border-warning-soft bg-warning-tint p-3 text-xs text-warning-text">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {registration.ok ? (
          <>
            Webhook registrado en el número, pero Meta no reporta ningún
            webhook en tu app. Si no llegan mensajes: en developers.facebook.com
            → tu app → WhatsApp → Configuración, verifica una callback URL
            (sirve la de abajo) y suscribe el campo{" "}
            <code>messages</code>. Es una sola vez por app.
          </>
        ) : (
          <>
            {afterSave ? "La conexión se guardó, pero no" : "No"} pudimos
            registrar el webhook en Meta. {registration.message} Reintenta con
            «Registrar en Meta» o pega la URL y el verify token a mano.
          </>
        )}
      </span>
    </p>
  );
}

function WebhookCard({
  webhook,
  connection,
  registration,
  onRegistration,
}: {
  webhook: WebhookInfo;
  connection: Connection | null;
  registration: WebhookRegistration | null;
  onRegistration: (result: WebhookRegistration | null) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const canRegister = connection?.status === "connected";

  async function register() {
    setRegistering(true);
    onRegistration(null);
    const res = await fetch("/api/settings/webhook", { method: "POST" }).catch(
      () => null
    );
    const data = (await res?.json().catch(() => null)) as
      | (WebhookRegistration & { error?: { message?: string } })
      | null;
    setRegistering(false);
    if (res?.ok && data?.ok) {
      onRegistration(data);
    } else {
      onRegistration({
        ok: false,
        message: data?.error?.message ?? "Sin conexión con el servidor.",
      });
    }
  }

  function copy(text: string, which: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook de WhatsApp</CardTitle>
        <CardDescription>
          Al guardar la conexión, esta dirección se registra en Meta por ti, en
          el número (override). Estos valores son para el backend de tu agencia
          o para pegarlos a mano en el panel de Meta solo si el registro
          automático falla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canRegister && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              disabled={registering}
              onClick={() => void register()}
            >
              {registering ? "Registrando…" : "Registrar en Meta"}
            </Button>
            {registration && <RegistrationNotice registration={registration} />}
          </div>
        )}
        {!webhook.isHttps && (
          <p className="flex items-start gap-2 rounded-md border border-warning-soft bg-warning-tint p-3 text-xs text-warning-text">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            La URL configurada no es https: Meta exige https para los webhooks.
            Ajusta APP_BASE_URL con tu dominio público.
          </p>
        )}
        <div className="space-y-1.5">
          <Label>URL del webhook (callback URL)</Label>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-3 py-2 text-xs">
              {webhook.url}
            </code>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copiar URL"
              onClick={() => copy(webhook.url, "url")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {copied === "url" && (
              <span className="text-xs text-primary">Copiada ✓</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            La URL contiene el token secreto en la ruta: trátala como una
            contraseña.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Verify token</Label>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-3 py-2 text-xs">
              {webhook.verifyToken}
            </code>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copiar verify token"
              onClick={() => copy(webhook.verifyToken, "vt")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {copied === "vt" && (
              <span className="text-xs text-primary">Copiado ✓</span>
            )}
          </div>
        </div>
        {webhook.signatureLayer ? (
          <p className="flex items-center gap-2 text-xs text-success">
            <ShieldCheck className="h-4 w-4" /> Verificación de firma activa
            (META_APP_SECRET configurado): cada evento se valida con
            x-hub-signature-256.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Sin App Secret
            configurado: el webhook queda protegido por la URL secreta (normal
            en modo agencia). Para la capa extra de firma, agrega
            META_APP_SECRET a la instancia.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
