import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    
    toast.success('¡Suscripción exitosa!', {
      description: 'Recibirás nuestras novedades en tu correo',
    });
    setEmail('');
  };

  return (
    <section className="bg-white border-y border-gray-200 py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#1e5da8] rounded-full mb-4 font-semibold text-sm">
              <Mail className="w-4 h-4" />
              Newsletter ESAP
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-3">
              Mantente Informado
            </h3>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Recibe las últimas noticias, eventos y novedades de la ESAP directamente en tu correo electrónico.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-[#1e5da8] focus:ring-[#1e5da8] h-14 text-base rounded-xl"
                />
              </div>
              <Button 
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[#1e5da8] to-[#1557a0] text-white hover:from-[#1557a0] hover:to-[#1e5da8] h-14 px-8 font-bold text-base gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Send className="w-5 h-5" />
                    </motion.div>
                    Enviando...
                  </>
                ) : (
                  <>
                    Suscribirse
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Sin spam. Cancela cuando quieras.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
