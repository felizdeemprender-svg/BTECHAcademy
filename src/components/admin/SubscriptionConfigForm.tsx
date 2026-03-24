'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, DollarSign, GraduationCap, Mail, FileText } from 'lucide-react';

interface SubscriptionConfig {
  hasCustomPage: boolean;
  subscriptionType: 'fixed' | 'percentage' | 'free';
  fixedAmount?: number;
  percentageRate?: number;
  requiresFreeCourses: boolean;
  freeCoursesCount: number;
  invitationsPerCourse: number;
  observations: string;
  status: 'active' | 'inactive' | 'trial' | 'cancelled';
  isPublic: boolean;
  isEnterprise: boolean;
  limits?: {
    maxCourses: number;
    maxStudents: number;
    hasCustomBranding: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
}

interface SubscriptionConfigFormProps {
  tutorId: string;
  tutorName: string;
  initialData?: Partial<SubscriptionConfig>;
  onSave?: (data: SubscriptionConfig) => void;
  onCancel?: () => void;
}

export default function SubscriptionConfigForm({ 
  tutorId, 
  tutorName, 
  initialData,
  onSave,
  onCancel 
}: SubscriptionConfigFormProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<SubscriptionConfig>({
    hasCustomPage: false,
    subscriptionType: 'free',
    fixedAmount: 0,
    percentageRate: 0,
    requiresFreeCourses: false,
    freeCoursesCount: 0,
    invitationsPerCourse: 10,
    observations: '',
    status: 'inactive',
    isPublic: false,
    isEnterprise: false,
    limits: {
      maxCourses: 3,
      maxStudents: 50,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false
    },
    ...initialData
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validar tipo de abono
    if (config.subscriptionType === 'fixed' && (!config.fixedAmount || config.fixedAmount <= 0)) {
      newErrors.fixedAmount = 'El monto fijo debe ser mayor a 0';
    }
    
    if (config.subscriptionType === 'percentage' && (config.percentageRate === undefined || config.percentageRate < 0 || config.percentageRate > 100)) {
      newErrors.percentageRate = 'El porcentaje debe estar entre 0 y 100';
    }
    
    // Validar cursos gratuitos
    if (config.requiresFreeCourses && (!config.freeCoursesCount || config.freeCoursesCount < 1)) {
      newErrors.freeCoursesCount = 'Debe especificar al menos 1 curso gratuito';
    }
    
    // Validar invitaciones
    if (config.invitationsPerCourse < 0) {
      newErrors.invitationsPerCourse = 'Las invitaciones no pueden ser negativas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Error de validación',
        description: 'Por favor, corrige los errores en el formulario.',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/admin/tutors/${tutorId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Configuración guardada',
          description: `La suscripción de ${tutorName} ha sido actualizada exitosamente.`,
        });
        onSave?.(config);
      } else {
        throw new Error(data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del Tutor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>👤</span> Información del Tutor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <p className="font-medium">{tutorName}</p>
            </div>
            <div>
              <Label>Estado Actual</Label>
              <div className="mt-1">
                <Badge className={
                  config.status === 'active' ? 'bg-green-500' :
                  config.status === 'trial' ? 'bg-blue-500' :
                  config.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                }>
                  {config.status === 'active' ? 'Activo' :
                   config.status === 'trial' ? 'Prueba' :
                   config.status === 'inactive' ? 'Inactivo' : 'Cancelado'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Página Personalizada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuración de Página
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="hasCustomPage">Página Personalizada</Label>
              <p className="text-sm text-muted-foreground">
                Permite al tutor tener su propia página institucional
              </p>
            </div>
            <Switch
              id="hasCustomPage"
              checked={config.hasCustomPage}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, hasCustomPage: checked }))
              }
            />
          </div>
          {config.hasCustomPage && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                ✅ El tutor podrá acceder a su página personalizada en: <code>/tutor/[username]</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibilidad y Tipo de Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🛡️</span> Visibilidad y Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="isPublic">Visible en Home</Label>
              <p className="text-sm text-muted-foreground">
                Muestra este tutor/plan en la página principal
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={config.isPublic}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, isPublic: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="isEnterprise">Plan Empresa</Label>
              <p className="text-sm text-muted-foreground">
                Los cursos de este tutor NO aparecerán en el catálogo general
              </p>
            </div>
            <Switch
              id="isEnterprise"
              checked={config.isEnterprise}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, isEnterprise: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Tipo de Abono */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tipo de Abono
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subscriptionType">Tipo de Suscripción</Label>
            <Select 
              value={config.subscriptionType} 
              onValueChange={(value: 'fixed' | 'percentage' | 'free') => 
                setConfig(prev => ({ ...prev, subscriptionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">🆓 Gratis</SelectItem>
                <SelectItem value="fixed">💵 Monto Fijo Mensual</SelectItem>
                <SelectItem value="percentage">📊 Porcentaje de Ingresos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.subscriptionType === 'fixed' && (
            <div>
              <Label htmlFor="fixedAmount">Monto Fijo (USD)</Label>
              <Input
                id="fixedAmount"
                type="number"
                min="0"
                step="0.01"
                value={config.fixedAmount || ''}
                onChange={(e) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    fixedAmount: parseFloat(e.target.value) || 0 
                  }))
                }
                placeholder="29.99"
                className={errors.fixedAmount ? 'border-red-500' : ''}
              />
              {errors.fixedAmount && (
                <p className="text-sm text-red-500 mt-1">{errors.fixedAmount}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Ingrese el monto mensual que el tutor pagará (ej: 29.99)
              </p>
            </div>
          )}

          {config.subscriptionType === 'percentage' && (
            <div>
              <Label htmlFor="percentageRate">Porcentaje (%)</Label>
              <Input
                id="percentageRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={config.percentageRate || ''}
                onChange={(e) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    percentageRate: parseFloat(e.target.value) || 0 
                  }))
                }
                placeholder="15.5"
                className={errors.percentageRate ? 'border-red-500' : ''}
              />
              {errors.percentageRate && (
                <p className="text-sm text-red-500 mt-1">{errors.percentageRate}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Ingrese el porcentaje de ingresos que el tutor pagará (ej: 15.5)
              </p>
            </div>
          )}

          {config.subscriptionType !== 'free' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💰 {config.subscriptionType === 'fixed' 
                  ? `El tutor pagará $${config.fixedAmount || 0} USD mensuales`
                  : `El tutor pagará el ${config.percentageRate || 0}% de sus ingresos generados`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cursos Gratuitos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Cursos Gratuitos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="requiresFreeCourses">Exigir Cursos Gratuitos</Label>
              <p className="text-sm text-muted-foreground">
                El tutor debe mantener cursos gratuitos en su catálogo
              </p>
            </div>
            <Switch
              id="requiresFreeCourses"
              checked={config.requiresFreeCourses}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, requiresFreeCourses: checked }))
              }
            />
          </div>

          {config.requiresFreeCourses && (
            <div>
              <Label htmlFor="freeCoursesCount">Cantidad de Cursos Gratuitos</Label>
              <Input
                id="freeCoursesCount"
                type="number"
                min="1"
                max="10"
                value={config.freeCoursesCount || 1}
                onChange={(e) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    freeCoursesCount: parseInt(e.target.value) || 1 
                  }))
                }
                className={errors.freeCoursesCount ? 'border-red-500' : ''}
              />
              {errors.freeCoursesCount && (
                <p className="text-sm text-red-500 mt-1">{errors.freeCoursesCount}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                El tutor debe mantener al menos {config.freeCoursesCount || 1} curso(s) gratuito(s) activo(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitaciones por Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="invitationsPerCourse">Límite de Invitaciones</Label>
            <Input
              id="invitationsPerCourse"
              type="number"
              min="0"
              max="1000"
              value={config.invitationsPerCourse || 10}
              onChange={(e) => 
                setConfig(prev => ({ 
                  ...prev, 
                  invitationsPerCourse: parseInt(e.target.value) || 10 
                }))
              }
              className={errors.invitationsPerCourse ? 'border-red-500' : ''}
            />
            {errors.invitationsPerCourse && (
              <p className="text-sm text-red-500 mt-1">{errors.invitationsPerCourse}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Número máximo de estudiantes que pueden solicitar acceso a cada curso (ej: 50)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Observaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Observaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="observations">Observaciones y Términos</Label>
            <Textarea
              id="observations"
              value={config.observations}
              onChange={(e) => 
                setConfig(prev => ({ ...prev, observations: e.target.value }))
              }
              placeholder="Ingrese términos especiales, condiciones, o cualquier observación relevante para este tutor..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {config.observations.length}/2000 caracteres. Esta información será visible para el tutor.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Configuración'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
