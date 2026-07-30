'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import SubscriptionConfigForm from '@/components/admin/SubscriptionConfigForm';
import { 
  Search, 
  Filter, 
  Globe, 
  DollarSign, 
  GraduationCap, 
  Mail, 
  Settings,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface Tutor {
  id: string;
  displayName: string;
  email: string;
  username: string;
  photoURL: string;
  subscription: {
    hasCustomPage: boolean;
    type: 'fixed' | 'percentage' | 'free';
    fixedAmount?: number;
    percentageRate?: number;
    requiresFreeCourses: boolean;
    freeCoursesCount: number;
    invitationsPerCourse: number;
    status: 'active' | 'inactive' | 'trial' | 'cancelled';
    limits?: {
      maxCourses: number;
      maxStudents: number;
      hasCustomBranding: boolean;
      hasAnalytics: boolean;
      hasPrioritySupport: boolean;
    };
  };
  createdAt: Date;
  lastLogin?: Date;
}

interface TutorsResponse {
  tutors: Tutor[];
  total: number;
  active: number;
  withCustomPage: number;
}

export default function AdminTutorsPage() {
  const { toast } = useToast();
  const [tutorsData, setTutorsData] = useState<TutorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tutors/subscriptions');
      const data = await response.json();
      setTutorsData(data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los datos de los tutores.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (subscription: any) => {
    switch (subscription.type) {
      case 'free':
        return <Badge variant="secondary">🆓 Gratis</Badge>;
      case 'fixed':
        return <Badge variant="default">💵 ${subscription.fixedAmount}/mes</Badge>;
      case 'percentage':
        return <Badge variant="outline">📊 {subscription.percentageRate}%</Badge>;
      default:
        return <Badge variant="secondary">Sin configurar</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Activo
        </Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Inactivo
        </Badge>;
      case 'trial':
        return <Badge className="bg-blue-500 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Prueba
        </Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Cancelado
        </Badge>;
      default:
        return <Badge variant="destructive">Desconocido</Badge>;
    }
  };

  const filteredTutors = tutorsData?.tutors.filter(tutor => {
    const matchesSearch = tutor.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tutor.subscription.status === statusFilter;
    const matchesSubscription = subscriptionFilter === 'all' || tutor.subscription.type === subscriptionFilter;
    
    return matchesSearch && matchesStatus && matchesSubscription;
  }) || [];

  const handleConfigSuccess = () => {
    setIsConfigOpen(false);
    setSelectedTutor(null);
    fetchTutors(); // Recargar datos
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando tutores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Tutores</h1>
          <p className="text-muted-foreground">Gestiona las suscripciones y configuraciones de los tutores</p>
        </div>
      </div>

      {/* Stats Cards */}
      {tutorsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tutores</p>
                  <p className="text-2xl font-bold">{tutorsData.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{tutorsData.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Con Página</p>
                  <p className="text-2xl font-bold text-blue-600">{tutorsData.withCustomPage}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasa Activación</p>
                  <p className="text-2xl font-bold">
                    {tutorsData.total > 0 ? Math.round((tutorsData.active / tutorsData.total) * 100) : 0}%
                  </p>
                </div>
                <Settings className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="trial">Prueba</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Tipo de Suscripción</label>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="fixed">Monto Fijo</SelectItem>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tutors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tutores y Suscripciones ({filteredTutors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Página</TableHead>
                  <TableHead>Tipo de Abono</TableHead>
                  <TableHead>Cursos Gratuitos</TableHead>
                  <TableHead>Invitaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTutors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron tutores con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTutors.map((tutor) => (
                    <TableRow key={tutor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                            {tutor.photoURL ? (
                              <img 
                                src={tutor.photoURL} 
                                alt={tutor.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                                {tutor.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{tutor.displayName}</div>
                            <div className="text-sm text-muted-foreground">{tutor.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tutor.subscription.hasCustomPage ? (
                          <Badge className="bg-green-500 flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Sí
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(tutor.subscription)}
                      </TableCell>
                      <TableCell>
                        {tutor.subscription.requiresFreeCourses ? (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4 text-blue-500" />
                            <span>{tutor.subscription.freeCoursesCount}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No requerido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-purple-500" />
                          <span>{tutor.subscription.invitationsPerCourse}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tutor.subscription.status)}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedTutor(tutor)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Configurar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="mw-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Configurar Suscripción - {selectedTutor?.displayName}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedTutor && (
                              <SubscriptionConfigForm 
                                tutorId={selectedTutor.id}
                                tutorName={selectedTutor.displayName}
                                initialData={selectedTutor.subscription}
                                onSave={handleConfigSuccess}
                                onCancel={() => {
                                  setIsConfigOpen(false);
                                  setSelectedTutor(null);
                                }}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
