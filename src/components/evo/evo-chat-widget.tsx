'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export function EvoChatWidget() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: '¡Hola! Soy Evo, tu agente personal. Conozco a todos tus alumnos y sus cursos. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/evo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'Lo siento, hubo un error de conexión.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', content: 'Lo siento, hubo un error procesando tu solicitud.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Ventana de Chat */}
      {isOpen && (
        <Card className="w-[380px] h-[550px] mb-4 flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5">
          <CardHeader className="bg-primary/10 border-b border-primary/10 py-3 px-4 flex flex-row justify-between items-center space-y-0 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold">Evo Assistant</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/10'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : msg.role === 'system'
                    ? 'bg-destructive/10 text-destructive text-xs'
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 border-t bg-muted/20">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex w-full items-center gap-2"
            >
              <input
                type="text"
                placeholder="Pregúntale a Evo..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {/* Botón Flotante */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105 ${isOpen ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground'}`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
