import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { 
  Home, Library, BarChart2, Zap, ClipboardList, 
  GraduationCap, Target, Users, Megaphone, FileText, Settings 
} from 'lucide-react';

// --- Colors perfectly matched from screenshots ---
const colors = {
  sidebarBg: '#12121a',
  sidebarText: '#6b7280',
  sidebarActiveBg: '#351f39', // Dark pinkish/purple
  primaryPink: '#f72585',
  primaryPurple: '#3b2c68', // Deep purple for buttons
  bg: '#f8f9fa',
  textMain: '#111827',
  textMuted: '#6b7280',
  tableHeader: '#a78bfa',
};

const Sidebar: React.FC<{ activeItem: string }> = ({ activeItem }) => {
  const sections = [
    {
      title: 'CURSOS',
      items: [
        { label: 'Inicio', icon: Home },
        { label: 'Catálogo', icon: Library },
        { label: 'Mis Cursos', icon: BarChart2 },
        { label: 'Mis Desafíos', icon: Zap },
        { label: 'Seguimientos', icon: ClipboardList },
      ]
    },
    {
      title: 'ADMIN DE CURSOS',
      items: [
        { label: 'Gestión Académica', icon: GraduationCap },
        { label: 'Desafíos (Mentor)', icon: Target },
        { label: 'Alumnos', icon: Users },
      ]
    },
    {
      title: 'COMERCIALIZACIÓN',
      items: [
        { label: 'Mis Campañas', icon: Megaphone },
        { label: 'Landings de Venta', icon: FileText },
        { label: 'Centro de Mando', icon: Settings },
      ]
    }
  ];

  return (
    <div style={{
      width: 250, backgroundColor: colors.sidebarBg, height: '100%',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.05)'
    }}>
      {/* Brand Logo */}
      <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ color: colors.primaryPink, fontSize: 24 }}>✧</div>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>
          FASTORIA<span style={{ fontWeight: 400 }}>academy</span>
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'hidden', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {sections.map(section => (
          <div key={section.title}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#4b5563', padding: '0 12px 8px', letterSpacing: '0.05em' }}>
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map(item => {
                const isActive = activeItem === item.label;
                const IconComponent = item.icon;
                return (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 8, backgroundColor: isActive ? colors.sidebarActiveBg : 'transparent',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
                      <IconComponent 
                        size={16} 
                        strokeWidth={isActive ? 2.5 : 2} 
                        color={isActive ? '#fff' : colors.sidebarText} 
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : colors.sidebarText }}>
                      {item.label}
                    </span>
                    {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.primaryPink }} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Footer */}
      <div style={{ padding: 16 }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#374151', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>j</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>juan pablo pagotto</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em' }}>ALUMNO</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 11, fontWeight: 600 }}>
            <span>[→</span> Cerrar sesión
          </div>
        </div>
      </div>
    </div>
  );
};

const Topbar: React.FC = () => (
  <div style={{
    height: 60, backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16
  }}>
    <div style={{ width: 16, height: 16, border: '1.5px solid #cbd5e1', borderRadius: 4 }} />
    <div style={{ width: 1, height: 20, backgroundColor: '#e5e7eb' }} />
    <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em' }}>
      PANEL INSTITUCIONAL • FASTORIACADEMY
    </span>
  </div>
);

const DashboardContent: React.FC = () => (
  <div style={{ padding: '40px 48px', flex: 1, backgroundColor: colors.bg }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.primaryPink, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', marginBottom: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      GESTIÓN DOCENTE
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
      <div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-1px' }}>Mi Panel de Mentor</h1>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '8px 0 0 0' }}>Bienvenido de nuevo, juan pablo pagotto. <span style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, marginLeft: 8 }}>v1.0.1-prod</span></p>
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 24, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: colors.primaryPurple, backgroundColor: '#fff' }}>
        <span style={{ color: colors.primaryPink }}>🎓</span> MENTOR AUTORIZADO
      </div>
    </div>

    <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: 16 }}>MÉTRICAS DE ENSEÑANZA Y ALCANCE</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 48 }}>
      {[
        { title: 'MIS PROGRAMAS', val: '1', bg: '#f8fafc', icon: '📖' },
        { title: 'ESTUDIANTES', val: '0', bg: '#eff6ff', icon: '👥' },
        { title: 'CLICKS TOTALES', val: '0', bg: '#f5f3ff', icon: '▶️' },
        { title: 'CONVERSIONES', val: '0', bg: '#ecfdf5', icon: '🎯' },
      ].map(m => (
        <div key={m.title} style={{ backgroundColor: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#111827' }}>{m.val}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>{m.title}</div>
        </div>
      ))}
      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24 }}>✨</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#111827' }}>199.99890</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>CRÉDITOS IA</div>
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>Programas Recientes</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0 0' }}>Estado de matrícula y publicación.</p>
      </div>
      <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Ver todo &gt;</div>
    </div>
    
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: 16, gap: 20 }}>
      <div style={{ width: 140, height: 80, backgroundColor: '#a7f3d0', borderRadius: 8, overflow: 'hidden' }}>
        {/* Placeholder for course image */}
        <div style={{ width: '100%', height: '100%', backgroundColor: '#10b981', opacity: 0.2 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Despliega Inteligencia Artificial en Microcontroladores</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>BORRADOR</span>
          <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>GENERAL</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32, paddingRight: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>0</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>ALUMNOS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>0</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>ACTIVOS</div>
        </div>
      </div>
    </div>
  </div>
);

const GestionContent: React.FC = () => (
  <div style={{ padding: '40px 48px', flex: 1, backgroundColor: colors.bg }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: 0 }}>Gestión Académica</h1>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '8px 0 0 0' }}>Administración central de programas.</p>
      </div>
      <div style={{ backgroundColor: colors.primaryPurple, color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 800 }}>
        + Nuevo Curso
      </div>
    </div>
    
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
      <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 24, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, color: '#9ca3af' }}>
        <span>🔍</span><span style={{ fontSize: 15 }}>Buscar programas o alumnos...</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 8 }}>
        📊 FILTROS INTELIGENTES ACTIVOS
      </div>
    </div>

    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ backgroundColor: colors.tableHeader, padding: '16px 24px', display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr', fontSize: 11, fontWeight: 800, color: '#fff' }}>
        <div>PROGRAMA</div><div style={{ textAlign: 'center' }}>CLASES</div><div style={{ textAlign: 'center' }}>ALUMNOS</div>
        <div style={{ textAlign: 'center' }}>CUMPLIMIENTO</div><div style={{ textAlign: 'center' }}>CATÁLOGO</div><div style={{ textAlign: 'center' }}>ACCIONES</div>
      </div>
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, backgroundColor: '#cbd5e1', borderRadius: 8 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Despliega Inteligencia Artificial en Microcontroladores</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {['Microcontroladores IoT', 'Programación ESP32', 'Sensores IoT'].map(t => (
                <span key={t} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '2px 8px', fontSize: 9, color: '#6b7280', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#111827' }}>9</div>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#111827' }}>0</div>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#10b981' }}>0%</div>
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />PUBLICADO
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Privado <span style={{ marginLeft: 8 }}>...</span></div>
      </div>
    </div>
  </div>
);

const AsistenteContent: React.FC<{ frame: number }> = ({ frame }) => {
  const isDropdownOpen = frame >= 175 && frame < 210;
  const isCategorySelected = frame >= 210;

  return (
    <div style={{ padding: '40px', flex: 1, backgroundColor: colors.bg, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 56, height: 56, backgroundColor: colors.primaryPurple, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>⚙️</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: colors.primaryPurple, margin: 0 }}>Asistente de Creación</h1>
              <p style={{ color: '#6b7280', fontSize: 15, margin: '4px 0 0 0' }}>Configura tu programa institucional paso a paso.</p>
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fff', borderRadius: 24, padding: '10px 20px', fontSize: 11, fontWeight: 800, color: colors.primaryPurple }}>
            ETAPA 1 DE 6
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 40, position: 'relative' }}>
          <div style={{ backgroundColor: '#e0d4fc', color: colors.primaryPurple, display: 'inline-block', padding: '6px 16px', borderRadius: 12, fontSize: 10, fontWeight: 800, marginBottom: 20 }}>PASO 01</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: colors.primaryPurple, margin: 0 }}>Información Institucional</h2>
          <p style={{ color: '#6b7280', fontSize: 15, margin: '8px 0 40px 0' }}>Define las bases y el alcance de tu nuevo programa educativo.</p>

          <div style={{ display: 'flex', gap: 40 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Título del Programa</label>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 15, color: '#6b7280' }}>
                  {frame > 150 ? 'Master en Diseño UI/UX' : 'Ej: Master en ADN Modeling'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Descripción Breve</label>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 15, color: '#9ca3af', height: 120 }}>
                  Explica de qué trata este programa...
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32, position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12 }}>
                  <span style={{ fontSize: 15, color: isCategorySelected ? '#111827' : '#9ca3af', fontWeight: isCategorySelected ? 600 : 400 }}>
                    {isCategorySelected ? 'Diseño y Creatividad' : 'Selecciona una categoría'}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>▼</span>
                </div>
                
                {isDropdownOpen && (
                  <div style={{ position: 'absolute', top: 64, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 10, padding: 8, border: '1px solid #e5e7eb' }}>
                    {['Desarrollo Personal', 'Diseño y Creatividad', 'Educación', 'Finanzas e Inversión', 'Habilidades Profesionales', 'Idiomas', 'Marketing y Ventas'].map((cat, i) => (
                      <div key={cat} style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: i === 0 ? '#fff' : '#111827', backgroundColor: i === 0 ? colors.primaryPink : 'transparent', borderRadius: 8 }}>
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: isDropdownOpen ? 300 : 0, transition: 'margin-top 0.2s' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Nivel del Programa</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12 }}>
                  <span style={{ fontSize: 15, color: '#9ca3af' }}>Selecciona el nivel</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>▼</span>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', alignSelf: 'flex-start', backgroundColor: '#a78bfa', color: '#fff', padding: '16px 32px', borderRadius: 12, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                → INICIAR CREACIÓN
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetalleContent: React.FC = () => (
  <div style={{ padding: '40px', flex: 1, backgroundColor: colors.bg, display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: '100%', maxWidth: 900 }}>
      <div style={{ padding: 20, backgroundColor: '#f8fafc', borderRadius: 12, fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 32 }}>
        Clase 1
      </div>
      
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, padding: 16, backgroundColor: '#e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#64748b' }}>
          📖 Bibliografía
        </div>
        <div style={{ flex: 1, padding: 16, backgroundColor: '#fff', border: `2px solid ${colors.primaryPink}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: colors.primaryPink }}>
          📹 Video
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', marginBottom: 12, letterSpacing: '0.05em' }}>URL DE VIDEO (YOUTUBE O VIMEO)</label>
        <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, fontSize: 15, color: '#9ca3af' }}>
          https://...
        </div>
      </div>

      <div style={{ backgroundColor: '#f0f9ff', borderLeft: '4px solid #3b82f6', padding: 24, borderRadius: '0 12px 12px 0', marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#0369a1', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          SEGURIDAD ACADÉMICA DE VIDEO:
        </div>
        <ul style={{ color: '#0284c7', fontSize: 13, margin: 0, paddingLeft: 24, lineHeight: 1.6 }}>
          <li style={{ marginBottom: 8 }}><b>YouTube:</b> Configura como "Oculto" (Unlisted) y desactiva incorporación externa para proteger tu marca. YouTube siempre mantendrá ciertos logos visibles al pausar.</li>
          <li><b>Vimeo (Recomendado):</b> Permite ocultar totalmente el logo y restringir la reproducción a este dominio mediante su panel de privacidad avanzado.</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, border: '1px solid #fce7f3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.primaryPink, fontSize: 18, fontWeight: 800, marginBottom: 32 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          Reglas de Aprobación
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', marginBottom: 12, letterSpacing: '0.05em' }}>EXIGENCIA (%)</label>
            <div style={{ padding: '16px 20px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 16, fontWeight: 800, width: 100, color: '#111827' }}>
              70
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16 }}>
            <div style={{ width: 48, height: 28, backgroundColor: colors.primaryPurple, borderRadius: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', right: 3, top: 3, width: 22, height: 22, backgroundColor: '#fff', borderRadius: '50%' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Permitir Reintentos</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Cursor: React.FC<{ x: number, y: number, clicking: boolean }> = ({ x, y, clicking }) => (
  <div style={{
    position: 'absolute', left: x, top: y, zIndex: 9999,
    transform: `scale(${clicking ? 0.8 : 1})`,
    transition: 'transform 0.1s',
    pointerEvents: 'none'
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="white" stroke="black" strokeWidth="1.5"/>
    </svg>
    {clicking && (
      <div style={{
        position: 'absolute', left: -10, top: -10, width: 48, height: 48,
        borderRadius: '50%', backgroundColor: 'rgba(247, 37, 133, 0.4)',
        animation: 'ping 0.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      }} />
    )}
    <style>{`
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
    `}</style>
  </div>
);

export const DemoComposition: React.FC = () => {
  const rawFrame = useCurrentFrame();
  const frame = rawFrame < 360 ? rawFrame : 719 - rawFrame;

  const screen = frame < 70 ? 1 : frame < 150 ? 2 : frame < 250 ? 3 : 4;

  let cursorX = 800;
  let cursorY = 400;
  let clicking = false;

  if (frame < 20) {
    // Idle
  } else if (frame < 70) {
    cursorX = interpolate(frame, [20, 50], [800, 120], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    cursorY = interpolate(frame, [20, 50], [400, 360], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    clicking = frame >= 50 && frame < 58;
  } else if (frame < 150) {
    cursorX = interpolate(frame, [80, 110], [120, 1150], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    cursorY = interpolate(frame, [80, 110], [360, 110], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    clicking = frame >= 120 && frame < 128;
  } else if (frame < 250) {
    cursorX = interpolate(frame, [155, 175], [1150, 800], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    cursorY = interpolate(frame, [155, 175], [110, 410], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    
    // First click on category dropdown
    if (frame >= 175 && frame < 183) clicking = true;
    
    // Move to item
    if (frame >= 185) {
      cursorY = interpolate(frame, [185, 200], [410, 480], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    }
    // Click item
    if (frame >= 210 && frame < 218) clicking = true;

    // Move to INICIAR CREACION
    if (frame >= 220) {
      cursorX = interpolate(frame, [220, 240], [800, 850], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
      cursorY = interpolate(frame, [220, 240], [480, 680], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
    }
    if (frame >= 240 && frame < 248) clicking = true;
  } else if (frame < 360) {
    cursorX = 850;
    cursorY = 680;
  }

  const activeItem = screen === 1 ? 'Inicio' : 'Gestión Académica';

  return (
    <AbsoluteFill style={{
      backgroundColor: colors.bg,
      display: 'flex', flexDirection: 'row', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <Sidebar activeItem={activeItem} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {screen === 1 && <DashboardContent />}
          {screen === 2 && <GestionContent />}
          {screen === 3 && <AsistenteContent frame={frame} />}
          {screen === 4 && <DetalleContent />}
        </div>
      </div>
      <Cursor x={cursorX} y={cursorY} clicking={clicking} />
    </AbsoluteFill>
  );
};
