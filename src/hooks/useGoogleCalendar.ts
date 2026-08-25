import { useState, useCallback } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string }[];
}

export function useGoogleCalendar() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      // Forzamos a que pida el consentimiento para asegurar que obtengamos los scopes
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      const auth = getAuth();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential && credential.accessToken) {
        setAccessToken(credential.accessToken);
        return credential.accessToken;
      } else {
        throw new Error('La autenticación fue exitosa pero Google no devolvió permisos de calendario. Verifica la configuración de Firebase.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con Google.');
      throw err; // Lanzar para que el componente lo maneje y muestre un Toast
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const checkAvailability = useCallback(async (startISO: string, endISO: string, token: string = accessToken as string) => {
    if (!token) throw new Error('No hay token de Google Calendar conectado.');

    try {
      // Usamos events.list en lugar de freeBusy para obtener el título del evento
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startISO)}&timeMax=${encodeURIComponent(endISO)}&singleEvents=true&orderBy=startTime`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Falló la consulta de disponibilidad en Google Calendar.');
      }

      const data = await response.json();
      const events = data.items || [];
      
      if (events.length === 0) {
        return { isFree: true };
      } else {
        // Encontramos el primer evento que no esté cancelado ni marcado como libre (transparent)
        const busyEvent = events.find((e: any) => e.status !== 'cancelled' && e.transparency !== 'transparent');
        if (busyEvent) {
          return { isFree: false, title: busyEvent.summary || 'Evento sin título' };
        }
        return { isFree: true };
      }
    } catch (err: any) {
      throw err;
    }
  }, [accessToken]);

  const createEvent = useCallback(async (eventDetails: CalendarEvent, token: string = accessToken as string) => {
    if (!token) throw new Error('No hay token de Google Calendar conectado.');

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventDetails)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Falló la creación del evento en Google Calendar.');
      }

      const data = await response.json();
      return data; // Devuelve el evento creado, incluyendo su ID y link (htmlLink)
    } catch (err: any) {
      throw err;
    }
  }, [accessToken]);

  const fetchEvents = useCallback(async (token: string = accessToken as string) => {
    if (!token) throw new Error('No hay token de Google Calendar conectado.');

    try {
      const timeMin = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=15&singleEvents=true&orderBy=startTime`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Falló la consulta de eventos en Google Calendar.');
      }

      const data = await response.json();
      return data.items || [];
    } catch (err: any) {
      throw err;
    }
  }, [accessToken]);

  return {
    connect,
    checkAvailability,
    createEvent,
    fetchEvents,
    isConnecting,
    isConnected: !!accessToken,
    accessToken,
    error
  };
}
