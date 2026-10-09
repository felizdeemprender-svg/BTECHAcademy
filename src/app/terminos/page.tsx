import React from 'react';

export const metadata = {
  title: 'Términos de Servicio | Fastoria',
  description: 'Términos y condiciones de uso de la plataforma Fastoria.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-20 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-10 sm:p-16 border border-gray-100 dark:border-zinc-800">
        <h1 className="text-4xl font-black mb-8 text-primary">Términos de Servicio</h1>
        
        <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar la plataforma Fastoria, aceptas estar sujeto a estos Términos de Servicio, a todas las leyes y regulaciones aplicables, y aceptas que eres responsable del cumplimiento de las leyes locales aplicables.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Licencia de Uso</h2>
            <p>Se concede permiso para descargar temporalmente una copia de los materiales (información o software) en el sitio web de Fastoria únicamente para visualización transitoria personal y no comercial. Esta es la concesión de una licencia, no una transferencia de título.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Integraciones con Redes Sociales (TikTok, Meta, etc.)</h2>
            <p>Fastoria ofrece integraciones mediante API oficiales con plataformas de terceros como TikTok y Meta (Instagram/Facebook) para facilitar la publicación de contenido. Al conectar tus cuentas de redes sociales, autorizas a Fastoria a publicar contenido en tu nombre según tu programación y configuración. No almacenamos tus contraseñas, utilizamos tokens de acceso seguros proporcionados por dichas plataformas.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Contenido del Usuario</h2>
            <p>Eres el único responsable de cualquier contenido que subas, programes o publiques a través de nuestra plataforma. Te comprometes a no publicar material que sea ilegal, ofensivo, difamatorio o que infrinja los derechos de propiedad intelectual de terceros.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Limitaciones</h2>
            <p>En ningún caso Fastoria o sus proveedores serán responsables de ningún daño (incluyendo, sin limitación, daños por pérdida de datos o beneficios, o debido a la interrupción del negocio) que surja del uso o la incapacidad de usar los materiales en el sitio web de Fastoria.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Modificaciones</h2>
            <p>Fastoria puede revisar estos términos de servicio para su sitio web en cualquier momento sin previo aviso. Al utilizar este sitio web, aceptas estar sujeto a la versión actual de estos Términos de Servicio.</p>
          </section>

          <div className="pt-8 mt-8 border-t border-gray-200 dark:border-zinc-800 text-sm text-gray-500">
            Última actualización: {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>
    </div>
  );
}
