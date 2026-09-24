'use client';

import { useAuth } from '@/components/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  Search, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function AltaInfluencerPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setIsSearching(true);
    setFoundUser(null);
    setSearchError(null);

    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', searchEmail.toLowerCase().trim())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setSearchError('No se encontró ningún usuario con ese email en la plataforma.');
      } else {
        const docSnap = snap.docs[0];
        setFoundUser({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (err) {
      console.error("Error buscando usuario:", err);
      setSearchError('Ocurrió un error al buscar el usuario.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromote = async () => {
    if (!foundUser || !profile?.uid) return;
    
    setIsPromoting(true);
    try {
      const userRef = doc(db, 'users', foundUser.id);
      
      // Add 'referido' to their roles AND register this mentor as their associated mentor
      // Both fields are allowed by Firestore rules for mentors
      await updateDoc(userRef, {
        roles: arrayUnion('referido'),
        associatedMentors: arrayUnion(profile.uid)
      });
      
      // Update local state to reflect change immediately
      setFoundUser({
        ...foundUser,
        roles: [...(foundUser.roles || []), 'referido'],
        associatedMentors: [...(foundUser.associatedMentors || []), profile.uid]
      });
      
      toast({
        title: "¡Embajador Dado de Alta!",
        description: `${foundUser.displayName || foundUser.email} ahora es tu embajador y aparece en tu panel de Control de Embajadores.`,
        className: "bg-success text-white border-none"
      });

    } catch (err) {
      console.error("Error promoviendo usuario:", err);
      toast({
        title: "Error al dar de alta",
        description: "No se pudo registrar el embajador. Asegúrate de tener permisos de tutor activos.",
        variant: "destructive"
      });
    } finally {
      setIsPromoting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Alta de Embajador
            <Badge className="bg-primary/15 text-primary border-none rounded-full px-3 py-1">Gestión de Red</Badge>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium max-w-2xl">
            Convierte a cualquier usuario o alumno existente en la plataforma en un embajador (referido) para que pueda promocionar tus cursos.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8 items-start">
          
          {/* Columna de Búsqueda */}
          <div className="md:col-span-3 space-y-6">
            <Card className="border-none rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-muted/80 border-b border-muted pb-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent" />
                  Buscar Usuario
                </CardTitle>
                <CardDescription>
                  Ingresa el correo electrónico exacto con el que el usuario se registró en la plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input 
                      type="email" 
                      placeholder="ejemplo@email.com" 
                      required
                      value={searchEmail}
                      onChange={e => setSearchEmail(e.target.value)}
                      className="pl-12 bg-muted border-border"
                     size="lg" />
                    <Search className="h-5 w-5 text-muted-foreground absolute left-4 top-3.5" />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="h-12 px-6 rounded-xl bg-foreground hover:bg-foreground text-white font-bold"
                  >
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar'}
                  </Button>
                </form>

                {searchError && (
                  <div className="mt-6 flex items-start gap-3 bg-danger/10 text-danger p-4 rounded-xl">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm font-medium">{searchError}</div>
                  </div>
                )}

                {foundUser && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Resultado</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border-2 border-muted bg-white shadow-sm">
                      <Avatar className="h-16 w-16 shadow-lg">
                        <AvatarImage src={foundUser.photoURL} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xl font-black">
                          {(foundUser.displayName || foundUser.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-lg font-bold text-foreground">{foundUser.displayName || 'Usuario sin nombre'}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{foundUser.email}</p>
                        
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                            Usuario Registrado
                          </Badge>
                        </div>
                      </div>

                      <div className="shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
                        {(foundUser.roles || []).includes('referido') ? (
                          <div className="flex items-center justify-center gap-2 bg-success/10 text-success px-4 py-3 rounded-xl text-sm font-bold w-full">
                            <CheckCircle2 className="h-5 w-5" /> Ya es Embajador
                          </div>
                        ) : (
                          <Button 
                            onClick={handlePromote}
                            disabled={isPromoting}
                            className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-lg gap-2"
                          >
                            {isPromoting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                            Convertir en Embajador
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna de Ayuda */}
          <div className="md:col-span-2 space-y-6">
            <Card className="rounded-lg bg-primary/10/50">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">¿Cómo funciona?</h3>
                <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">1</div>
                    Pídele al embajador que se registre gratuitamente en la plataforma.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">2</div>
                    Busca aquí su correo electrónico de registro.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">3</div>
                    Haz clic en "Convertir en Embajador" para habilitarle su panel.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">4</div>
                    Ya podrás asignarle Landings desde el Creador de Campañas.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
