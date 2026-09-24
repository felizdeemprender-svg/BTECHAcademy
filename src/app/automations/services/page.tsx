'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Smartphone, MessageSquare, Server, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function ServicesPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Al cargar, verificar estado actual
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/automations/whatsapp');
        const json = await res.json();
        if (json.success && json.data?.status === 'open') {
          setIsConnected(true);
          setPhone(json.data.phone || null);
          setProfilePic(json.data.profilePicUrl || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkStatus();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/automations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' })
      });
      const json = await res.json();
      
      if (json.success && json.data?.qrcode) {
        setQrCode(json.data.qrcode); // base64 string
      } else {
        setError('No se pudo generar el QR. ' + (json.error || ''));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/automations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      setIsConnected(false);
      setQrCode(null);
      setPhone(null);
      setProfilePic(null);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyConnection = async () => {
    try {
      const res = await fetch('/api/automations/whatsapp');
      const json = await res.json();
      if (json.success && json.data?.status === 'open') {
        setIsConnected(true);
        setQrCode(null);
        setPhone(json.data.phone || null);
        setProfilePic(json.data.profilePicUrl || null);
      } else {
        setError('Aún no estás conectado. Intenta escanear de nuevo.');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTestMessage = async () => {
    if (!phone) {
      setError("No se detectó un número de teléfono válido para enviar la prueba.");
      return;
    }
    
    setIsTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/automations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message', phone: phone })
      });
      const json = await res.json();
      if (!json.success) {
        setError("Error al enviar prueba: " + (json.error || 'Desconocido'));
      } else {
        alert("¡Mensaje de prueba enviado exitosamente a tu número!");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios de Automatización</h1>
          <p className="text-muted-foreground mt-2">
            Conecta tus canales de comunicación para que Evo pueda despachar mensajes proactivos en tu nombre.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/20 bg-background/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>WhatsApp Web</CardTitle>
                  <CardDescription>Vincula tu número personal (Evolution API)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Al conectar tu WhatsApp, Evo podrá enviar mensajes proactivos a tus alumnos directamente desde tu número.
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              {isConnected ? (
                <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex flex-col items-center text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-success/20 overflow-hidden flex items-center justify-center text-success border-2 border-success/30">
                    {profilePic ? (
                      <img src={profilePic} alt="WhatsApp Profile" className="h-full w-full object-cover" />
                    ) : (
                      <Smartphone className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-success">Conectado exitosamente</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {phone ? `+${phone}` : 'Sesión activa'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Evo usará este número para interactuar con tus alumnos.
                    </p>
                  </div>
                  <div className="flex w-full gap-2 mt-4">
                    <Button 
                      variant="default" 
                      className="flex-1" 
                      onClick={handleTestMessage}
                      disabled={isTesting}
                    >
                      {isTesting ? 'Enviando...' : 'Probar conexión'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleDisconnect}>
                      Desconectar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center text-center space-y-4">
                  
                  {qrCode ? (
                    <>
                      <div className="p-2 bg-white rounded-lg">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                      </div>
                      <p className="text-sm font-medium">Escanea este código con tu WhatsApp</p>
                      <Button onClick={verifyConnection} className="w-full" variant="secondary">
                        Ya lo escaneé (Verificar)
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <QrCode className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Escanea para conectar</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                          Usa WhatsApp en tu teléfono para escanear el código QR que se generará.
                        </p>
                      </div>
                      <Button 
                        onClick={handleConnect} 
                        disabled={isConnecting}
                        className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                      >
                        {isConnecting ? 'Generando QR con Backend...' : 'Generar Código QR'}
                      </Button>
                    </>
                  )}
                </div>
              )}
              
              <div className="flex items-start gap-2 rounded-lg bg-warn/10 p-3 text-xs text-warn">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Mantén tu teléfono conectado a internet. El microservicio gestionará la sesión en segundo plano (sin guardar historial para ahorrar memoria).</p>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for future services like Email */}
          <Card className="opacity-50 grayscale pointer-events-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Email Remitente</CardTitle>
                  <CardDescription>Próximamente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conecta tu cuenta de SendGrid o Resend para despachar correos personalizados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
