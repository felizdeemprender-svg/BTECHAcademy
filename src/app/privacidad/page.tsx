import React from 'react';

export const metadata = {
  title: 'Política de Privacidad | Fastoria',
  description: 'Política de Privacidad y manejo de datos de la plataforma Fastoria.',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-20 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-10 sm:p-16 border border-gray-100 dark:border-zinc-800">
        <h1 className="text-4xl font-black mb-8 text-primary">Política de Privacidad</h1>
        
        <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Recopilación de Información</h2>
            <p>Recopilamos información cuando te registras en nuestro sitio, te conectas a tu cuenta, interactúas con nuestras integraciones o te desconectas. La información recopilada incluye tu nombre, dirección de correo electrónico, y los tokens de acceso temporales proporcionados por redes sociales.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Uso de la Información</h2>
            <p>Cualquier información que recopilemos de ti puede ser utilizada para:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Personalizar tu experiencia y satisfacer tus necesidades individuales.</li>
              <li>Mejorar nuestra plataforma y atención al cliente.</li>
              <li>Gestionar y ejecutar las publicaciones automáticas en tus redes conectadas.</li>
              <li>Contactarte por correo electrónico respecto a tu cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Integración con Redes Sociales (TikTok, Meta, etc.)</h2>
            <p>Nuestra aplicación utiliza las API oficiales de plataformas como TikTok y Meta. Cuando conectas tu cuenta, Fastoria solo solicita los permisos estrictamente necesarios (como `user.info.basic` y `video.publish`) para publicar el contenido que vos mismo programes. No vendemos, intercambiamos ni transferimos tus tokens de autenticación o información personal a terceros bajo ninguna circunstancia.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Privacidad en el Comercio Electrónico</h2>
            <p>Nosotros somos los únicos propietarios de la información recopilada en este sitio. Tu información de identificación personal no será vendida, intercambiada, transferida o dada a ninguna otra empresa por ningún motivo, sin tu consentimiento, más allá de lo necesario para cumplir con un servicio (ej. procesar un pago).</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Seguridad de la Información</h2>
            <p>Implementamos una variedad de medidas de seguridad para mantener la seguridad de tu información personal. Los tokens de autenticación de redes sociales se almacenan de forma segura y encriptada, y solo se utilizan de forma automatizada por nuestros servidores para cumplir con la programación de tus campañas.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Consentimiento</h2>
            <p>Al utilizar nuestro sitio y conectar tus aplicaciones, aceptas nuestra política de privacidad.</p>
          </section>

          <div className="pt-8 mt-8 border-t border-gray-200 dark:border-zinc-800 text-sm text-gray-500">
            Última actualización: {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>
    </div>
  );
}
